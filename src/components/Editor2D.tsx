import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { screenOffsetToWorld } from "../camera";
import { dist, formatLength, wallPolygonExtended } from "../geometry";
import { penetrationSchedule, proximityWarnings } from "../schedule";
import { useStore } from "../store";
import { useRooms } from "../useRooms";
import type { Point } from "../types";
import { DimensionsLayer } from "./editor2d/DimensionsLayer";
import { HvacLayer } from "./editor2d/HvacLayer";
import { KeepOutLayer } from "./editor2d/KeepOutLayer";
import { GridLayer, type Camera } from "./editor2d/GridLayer";
import { OpeningsLayer } from "./editor2d/OpeningsLayer";
import { RoomsLayer } from "./editor2d/RoomsLayer";
import { WallsLayer } from "./editor2d/WallsLayer";
import { EmptyState } from "./editor2d/EmptyState";
import { ZoomControls } from "./editor2d/ZoomControls";
import { useEditorTools } from "./editor2d/useEditorTools";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function Editor2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [size, setSize] = useState({ w: 800, h: 600 });
  const [camera, setCamera] = useState<Camera>({
    cx: 500,
    cy: 400,
    scale: 0.7,
    rotation: 0,
  });

  const model = useStore((s) => s.model);
  const tool = useStore((s) => s.tool);
  const selection = useStore((s) => s.selection);
  const showHvac = useStore((s) => s.showHvac);
  const showKeepOut = useStore((s) => s.showKeepOut);
  const rooms = useRooms();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight }),
    );
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const clientToWorld = useCallback(
    (clientX: number, clientY: number, cam: Camera = camera): Point => {
      const rect = containerRef.current!.getBoundingClientRect();
      const v = screenOffsetToWorld(cam, {
        x: clientX - rect.left - rect.width / 2,
        y: clientY - rect.top - rect.height / 2,
      });
      return { x: cam.cx + v.x, y: cam.cy + v.y };
    },
    [camera],
  );

  // native wheel listener so preventDefault works
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCamera((c) => {
        const s2 = clamp(c.scale * Math.exp(-e.deltaY * 0.0015), 0.02, 40);
        const w = clientToWorld(e.clientX, e.clientY, c);
        const rect = el.getBoundingClientRect();
        const v = screenOffsetToWorld(
          { ...c, scale: s2 },
          {
            x: e.clientX - rect.left - rect.width / 2,
            y: e.clientY - rect.top - rect.height / 2,
          },
        );
        return { ...c, scale: s2, cx: w.x - v.x, cy: w.y - v.y };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clientToWorld]);

  const tools = useEditorTools(camera, setCamera, clientToWorld, svgRef, rooms);

  const warnings = useMemo(() => {
    if (!showHvac) return [];
    return proximityWarnings(penetrationSchedule(model, rooms));
  }, [model, rooms, showHvac]);

  const viewBox = `${camera.cx - size.w / 2 / camera.scale} ${camera.cy - size.h / 2 / camera.scale} ${size.w / camera.scale} ${size.h / camera.scale}`;
  const selectedIds = useMemo(() => {
    const byType = (t: string) =>
      new Set(selection.filter((s) => s.type === t).map((s) => s.id));
    return {
      wall: byType("wall"),
      hvac: byType("hvac"),
      opening: byType("opening"),
      room: byType("room"),
    };
  }, [selection]);
  // endpoint handles only for a single selected wall
  const selectedWall =
    selection.length === 1 && selection[0].type === "wall"
      ? model.walls.find((w) => w.id === selection[0].id)
      : undefined;
  const px = (n: number) => n / camera.scale;
  const cursor = tools.panning
    ? "grabbing"
    : tools.spacePan
      ? "grab"
      : tool === "select"
        ? "default"
        : "crosshair";
  const isEmpty = model.walls.length === 0 && model.hvac.length === 0;

  return (
    <div
      ref={containerRef}
      className="editor2d"
      data-testid="editor2d"
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        viewBox={viewBox}
        onPointerDown={tools.onPointerDown}
        onPointerMove={tools.onPointerMove}
        onPointerUp={tools.onPointerUp}
        onDoubleClick={tools.onDoubleClick}
        style={{ display: "block", cursor }}
      >
        <g
          transform={
            camera.rotation
              ? `rotate(${camera.rotation} ${camera.cx} ${camera.cy})`
              : undefined
          }
        >
          <GridLayer
            camera={camera}
            width={size.w}
            height={size.h}
            gridSize={model.settings.gridSize}
          />
          <RoomsLayer
            rooms={rooms}
            selectedId={[...selectedIds.room][0] ?? null}
            scale={camera.scale}
            rotation={camera.rotation}
          />
          <WallsLayer walls={model.walls} selectedIds={selectedIds.wall} />
          {tools.rectangleGuide && (
            <g pointerEvents="none" data-testid="rectangle-guide">
              <polygon
                points={[
                  tools.rectangleGuide.start,
                  tools.rectangleGuide.corner,
                  tools.rectangleGuide.end,
                  tools.rectangleGuide.suggestedCorner,
                ]
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                fill="#2563eb12"
              />
              <polyline
                points={[
                  tools.rectangleGuide.end,
                  tools.rectangleGuide.suggestedCorner,
                  tools.rectangleGuide.start,
                ]
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                fill="none"
                stroke="#2563eb"
                strokeWidth={px(2)}
                strokeOpacity={0.75}
                strokeDasharray={`${px(8)} ${px(5)}`}
              />
              <circle
                cx={tools.rectangleGuide.suggestedCorner.x}
                cy={tools.rectangleGuide.suggestedCorner.y}
                r={px(5)}
                fill="#fff"
                stroke="#2563eb"
                strokeWidth={px(2)}
              />
            </g>
          )}
          <OpeningsLayer
            walls={model.walls}
            openings={model.openings}
            selectedId={[...selectedIds.opening][0] ?? null}
            preview={tools.openingPreview}
          />
          <DimensionsLayer
            walls={model.walls}
            rooms={rooms}
            scale={camera.scale}
          />
          {showKeepOut && (
            <KeepOutLayer
              walls={model.walls}
              width={model.settings.keepOutWidth}
            />
          )}
          {showHvac && (
            <HvacLayer
              hvac={model.hvac}
              walls={model.walls}
              selectedIds={selectedIds.hvac}
            />
          )}

          {/* proximity warnings between penetrations */}
          {warnings.map((w, i) => (
            <g key={i} pointerEvents="none" data-testid="proximity-marker">
              <line
                x1={w.a.pos.x}
                y1={w.a.pos.y}
                x2={w.b.pos.x}
                y2={w.b.pos.y}
                stroke="#dc2626"
                strokeWidth={px(2)}
                strokeDasharray={`${px(5)} ${px(4)}`}
              />
              <text
                x={(w.a.pos.x + w.b.pos.x) / 2}
                y={(w.a.pos.y + w.b.pos.y) / 2 + px(16)}
                textAnchor="middle"
                fontSize={px(12)}
                fontWeight={700}
                fill="#dc2626"
                stroke="#fff"
                strokeWidth={px(3)}
                paintOrder="stroke"
              >
                ⚠ {Math.round(w.distance)} cm
              </text>
            </g>
          ))}

          {/* duct draft preview */}
          {tools.ductPreview && tools.ductPreview.length >= 1 && (
            <polyline
              points={tools.ductPreview.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#64748b"
              strokeWidth={px(2)}
              strokeDasharray={`${px(8)} ${px(5)}`}
              pointerEvents="none"
            />
          )}

          {/* cut-tool span preview */}
          {tools.cutPreview && (
            <g pointerEvents="none" data-testid="cut-preview">
              <line
                x1={tools.cutPreview.a.x}
                y1={tools.cutPreview.a.y}
                x2={tools.cutPreview.b.x}
                y2={tools.cutPreview.b.y}
                stroke="#dc2626"
                strokeWidth={px(6)}
                strokeOpacity={0.5}
              />
              {[tools.cutPreview.a, tools.cutPreview.b].map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={px(4)} fill="#dc2626" />
              ))}
            </g>
          )}

          {/* jumper first-point marker */}
          {tools.jumperFirst && (
            <circle
              cx={tools.jumperFirst.x}
              cy={tools.jumperFirst.y}
              r={px(6)}
              fill="none"
              stroke="#9333ea"
              strokeWidth={px(2)}
              pointerEvents="none"
            />
          )}

          {/* draft wall preview */}
          {tools.draftWall && (
            <g pointerEvents="none">
              <polygon
                points={wallPolygonExtended(tools.draftWall)
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                fill="#2563eb55"
                stroke="#2563eb"
                strokeWidth={px(1)}
                strokeDasharray={`${px(6)} ${px(4)}`}
              />
              <text
                x={(tools.draftWall.a.x + tools.draftWall.b.x) / 2}
                y={(tools.draftWall.a.y + tools.draftWall.b.y) / 2 - px(10)}
                fontSize={px(13)}
                textAnchor="middle"
                fill="#2563eb"
              >
                {formatLength(dist(tools.draftWall.a, tools.draftWall.b))}
              </text>
            </g>
          )}

          {/* measure overlay */}
          {tools.measure?.b && (
            <g pointerEvents="none">
              <line
                x1={tools.measure.a.x}
                y1={tools.measure.a.y}
                x2={tools.measure.b.x}
                y2={tools.measure.b.y}
                stroke="#d97706"
                strokeWidth={px(1.5)}
                strokeDasharray={`${px(8)} ${px(5)}`}
              />
              {[tools.measure.a, tools.measure.b].map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={px(3.5)} fill="#d97706" />
              ))}
              <text
                x={(tools.measure.a.x + tools.measure.b.x) / 2}
                y={(tools.measure.a.y + tools.measure.b.y) / 2 - px(10)}
                fontSize={px(13)}
                fontWeight={600}
                textAnchor="middle"
                fill="#d97706"
              >
                {formatLength(dist(tools.measure.a, tools.measure.b))}
              </text>
            </g>
          )}

          {/* snap cursor */}
          {tools.snappedCursor && (
            <circle
              cx={tools.snappedCursor.x}
              cy={tools.snappedCursor.y}
              r={px(4)}
              fill="none"
              stroke="#2563eb"
              strokeWidth={px(1.5)}
              pointerEvents="none"
            />
          )}

          {/* endpoint handles for the selected wall */}
          {selectedWall &&
            (["a", "b"] as const).map((end) => (
              <circle
                key={end}
                cx={selectedWall[end].x}
                cy={selectedWall[end].y}
                r={px(6)}
                fill="#fff"
                stroke="#2563eb"
                strokeWidth={px(2)}
                style={{ cursor: "move" }}
                onPointerDown={tools.startEndpointDrag(selectedWall.id, end)}
              />
            ))}
        </g>
      </svg>
      {isEmpty && <EmptyState />}
      <ZoomControls
        camera={camera}
        setCamera={setCamera}
        width={size.w}
        height={size.h}
      />
    </div>
  );
}
