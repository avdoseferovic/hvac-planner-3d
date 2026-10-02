import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { screenOffsetToWorld } from "../camera";
import {
  dist,
  distToSegment,
  formatLength,
  wallPolygonExtended,
} from "../geometry";
import {
  findDuctConnectionTarget,
  resolveDuctConnection,
} from "../hvac";
import { penetrationSchedule, proximityWarnings } from "../schedule";
import { openingEdgePoints } from "../openings";
import { useStore, useT } from "../store";
import { modelForStory } from "../stories";
import { useRooms } from "../useRooms";
import type { Point } from "../types";
import { analyzeWallStructure } from "../wall-connections";
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
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [size, setSize] = useState({ w: 800, h: 600 });
  const [camera, setCamera] = useState<Camera>({
    cx: 500,
    cy: 400,
    scale: 0.7,
    rotation: 0,
  });

  const fullModel = useStore((s) => s.model);
  const activeStoryId = useStore((s) => s.activeStoryId);
  const model = useMemo(
    () => modelForStory(fullModel, activeStoryId),
    [fullModel, activeStoryId],
  );
  const tool = useStore((s) => s.tool);
  const selection = useStore((s) => s.selection);
  const showHvac = useStore((s) => s.showHvac);
  const showKeepOut = useStore((s) => s.showKeepOut);
  const ductRoutingMode = useStore((s) => s.ductRoutingMode);
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

  const tools = useEditorTools(
    camera,
    setCamera,
    clientToWorld,
    svgRef,
    rooms,
    model,
    activeStoryId,
  );

  const warnings = useMemo(() => {
    if (!showHvac) return [];
    return proximityWarnings(penetrationSchedule(model, rooms));
  }, [model, rooms, showHvac]);
  const structure = useMemo(
    () => analyzeWallStructure(model.walls),
    [model.walls],
  );
  const routeHealth = useMemo(() => {
    const routes = model.hvac.filter((element) => element.kind === "duct");
    let connectedEnds = 0;
    let completeRoutes = 0;
    for (const route of routes) {
      const start = Boolean(
        resolveDuctConnection(route.startConnection, model.hvac, model.walls),
      );
      const end = Boolean(
        resolveDuctConnection(route.endConnection, model.hvac, model.walls),
      );
      connectedEnds += Number(start) + Number(end);
      if (start && end) completeRoutes += 1;
    }
    return {
      routes: routes.length,
      completeRoutes,
      openEnds: routes.length * 2 - connectedEnds,
    };
  }, [model.hvac, model.walls]);

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
  const selectedWindow =
    selection.length === 1 && selection[0].type === "opening"
      ? model.openings.find(
          (opening) =>
            opening.id === selection[0].id && opening.type === "window",
        )
      : undefined;
  const selectedWindowWall = selectedWindow
    ? model.walls.find((wall) => wall.id === selectedWindow.wallId)
    : undefined;
  const selectedWindowEdges =
    selectedWindow && selectedWindowWall
      ? openingEdgePoints(selectedWindowWall, selectedWindow)
      : null;
  const px = (n: number) => n / camera.scale;
  const cursor = tools.panning
    ? "grabbing"
    : tools.spacePan
      ? "grab"
      : tool === "select"
        ? "default"
        : "crosshair";
  const isEmpty = model.walls.length === 0 && model.hvac.length === 0;
  const wallSnapConnected =
    tool === "wall" &&
    tools.snappedCursor &&
    model.walls.some(
      (wall) =>
        distToSegment(tools.snappedCursor!, wall.a, wall.b) < 0.01,
    );
  const ductSnapTarget =
    tool === "duct" && tools.snappedCursor
      ? findDuctConnectionTarget(
          tools.snappedCursor,
          model.hvac,
          model.walls,
          0.01,
        )
      : null;

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
        onPointerCancel={tools.onPointerUp}
        onPointerLeave={tools.onPointerLeave}
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
          {(tool === "wall" || tool === "select") && (
            <g pointerEvents="none" data-testid="wall-connection-health">
              {structure.joints.map((joint, index) => (
                <circle
                  key={`joint-${index}`}
                  cx={joint.point.x}
                  cy={joint.point.y}
                  r={px(3.5)}
                  fill="#0f766e"
                  stroke="#ffffff"
                  strokeWidth={px(1.5)}
                />
              ))}
              {structure.openEnds.map((point, index) => (
                <circle
                  key={`open-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={px(5)}
                  fill="#fff7ed"
                  stroke="#f97316"
                  strokeWidth={px(2)}
                  data-testid="wall-open-end"
                />
              ))}
            </g>
          )}
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
              scale={camera.scale}
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
            <g pointerEvents="none">
              <polyline
                points={tools.ductPreview
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={px(7)}
                strokeOpacity={0.22}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={tools.ductPreview
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                fill="none"
                stroke="#475569"
                strokeWidth={px(2)}
                strokeDasharray={`${px(8)} ${px(5)}`}
              />
            </g>
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
            <g pointerEvents="none" data-testid="draft-wall">
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

          {wallSnapConnected && tools.snappedCursor && (
            <g pointerEvents="none" data-testid="wall-connect-snap">
              <circle
                cx={tools.snappedCursor.x}
                cy={tools.snappedCursor.y}
                r={px(9)}
                fill="#ecfdf5"
                fillOpacity={0.9}
                stroke="#0f766e"
                strokeWidth={px(2.5)}
              />
              <text
                x={tools.snappedCursor.x}
                y={tools.snappedCursor.y - px(14)}
                textAnchor="middle"
                fontSize={px(11)}
                fontWeight={800}
                fill="#0f766e"
                stroke="#ffffff"
                strokeWidth={px(3)}
                paintOrder="stroke"
              >
                {t("status.join")}
              </text>
            </g>
          )}

          {ductSnapTarget && (
            <g pointerEvents="none" data-testid="duct-connect-snap">
              <circle
                cx={ductSnapTarget.point.x}
                cy={ductSnapTarget.point.y}
                r={px(10)}
                fill="#ccfbf1"
                fillOpacity={0.82}
                stroke="#0f766e"
                strokeWidth={px(2.5)}
              />
              <text
                x={ductSnapTarget.point.x}
                y={ductSnapTarget.point.y - px(15)}
                textAnchor="middle"
                fontSize={px(11)}
                fontWeight={800}
                fill="#0f766e"
                stroke="#ffffff"
                strokeWidth={px(3)}
                paintOrder="stroke"
              >
                {t("status.connectPort")}
              </text>
            </g>
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
          {selectedWindow &&
            selectedWindowEdges &&
            (["a", "b"] as const).map((edge) => (
              <circle
                key={`window-${edge}`}
                cx={selectedWindowEdges[edge].x}
                cy={selectedWindowEdges[edge].y}
                r={px(6)}
                fill="#fff"
                stroke="#2563eb"
                strokeWidth={px(2)}
                style={{ cursor: "move" }}
                data-testid={`window-resize-${edge}`}
                onPointerDown={tools.startWindowResize(
                  selectedWindow.id,
                  edge,
                )}
              />
            ))}
        </g>
      </svg>
      {tool === "duct" && (
        <div className="editor-mode-chip" data-testid="duct-routing-chip">
          <span className="mode-symbol" aria-hidden="true">
            ⌞
          </span>
          <span>
            <strong>
              {t(
                tools.shift
                  ? "hvac.routingDirect"
                  : ductRoutingMode === "orthogonal"
                    ? "hvac.routingOrthogonal"
                    : "hvac.routingDirect",
              )}
            </strong>
            <small>
              {t(
                tools.shift && ductRoutingMode === "orthogonal"
                  ? "hvac.routingTemporaryDirect"
                  : ductRoutingMode === "orthogonal"
                    ? "hvac.routingShiftDirect"
                    : "hvac.routingDirectActive",
              )}
            </small>
          </span>
        </div>
      )}
      {!isEmpty && (
        <div className="editor-health" data-testid="editor-health">
          {model.walls.length > 0 && (
            <div
              className={`health-card ${
                structure.openEnds.length === 0 ? "healthy" : "attention"
              }`}
            >
              <span className="health-icon" aria-hidden="true">
                {structure.openEnds.length === 0 ? "✓" : "!"}
              </span>
              <span>
                <strong>
                  {structure.openEnds.length === 0
                    ? t("status.structureReady")
                    : `${structure.openEnds.length} ${t("status.openEnds")}`}
                </strong>
                <small>{t("status.wallMovePrecision")}</small>
              </span>
            </div>
          )}
          {routeHealth.routes > 0 && (
            <div
              className={`health-card ${
                routeHealth.openEnds === 0 ? "healthy" : "attention"
              }`}
            >
              <span className="health-icon" aria-hidden="true">
                {routeHealth.openEnds === 0 ? "✓" : "!"}
              </span>
              <span>
                <strong>
                  {routeHealth.completeRoutes}/{routeHealth.routes}{" "}
                  {t("status.routesConnected")}
                </strong>
                <small>
                  {routeHealth.openEnds} {t("status.routeOpenEnds")}
                </small>
              </span>
            </div>
          )}
        </div>
      )}
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
