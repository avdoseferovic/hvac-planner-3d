import { useCallback, useEffect, useRef, useState } from "react";
import { dist, formatLength, wallPolygonExtended } from "../geometry";
import { useStore } from "../store";
import { useRooms } from "../useRooms";
import type { Point } from "../types";
import { DimensionsLayer } from "./editor2d/DimensionsLayer";
import { GridLayer, type Camera } from "./editor2d/GridLayer";
import { OpeningsLayer } from "./editor2d/OpeningsLayer";
import { RoomsLayer } from "./editor2d/RoomsLayer";
import { WallsLayer } from "./editor2d/WallsLayer";
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
  });

  const model = useStore((s) => s.model);
  const tool = useStore((s) => s.tool);
  const selection = useStore((s) => s.selection);
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
      return {
        x: cam.cx + (clientX - rect.left - rect.width / 2) / cam.scale,
        y: cam.cy + (clientY - rect.top - rect.height / 2) / cam.scale,
      };
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
        const ox = e.clientX - rect.left - rect.width / 2;
        const oy = e.clientY - rect.top - rect.height / 2;
        return { scale: s2, cx: w.x - ox / s2, cy: w.y - oy / s2 };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clientToWorld]);

  const tools = useEditorTools(camera, setCamera, clientToWorld, svgRef, rooms);

  const viewBox = `${camera.cx - size.w / 2 / camera.scale} ${camera.cy - size.h / 2 / camera.scale} ${size.w / camera.scale} ${size.h / camera.scale}`;
  const selectedWall =
    selection?.type === "wall"
      ? model.walls.find((w) => w.id === selection.id)
      : undefined;
  const px = (n: number) => n / camera.scale;

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
        style={{
          display: "block",
          cursor: tool === "select" ? "default" : "crosshair",
        }}
      >
        <GridLayer
          camera={camera}
          width={size.w}
          height={size.h}
          gridSize={model.settings.gridSize}
        />
        <RoomsLayer
          rooms={rooms}
          selectedId={selection?.type === "room" ? selection.id : null}
          scale={camera.scale}
        />
        <WallsLayer
          walls={model.walls}
          selectedId={selection?.type === "wall" ? selection.id : null}
        />
        <OpeningsLayer
          walls={model.walls}
          openings={model.openings}
          selectedId={selection?.type === "opening" ? selection.id : null}
          preview={tools.openingPreview}
        />
        <DimensionsLayer
          walls={model.walls}
          rooms={rooms}
          scale={camera.scale}
        />

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
      </svg>
    </div>
  );
}
