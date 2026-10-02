import { useCallback, useEffect, useRef, useState } from "react";
import {
  add,
  dist,
  distToSegment,
  formatLength,
  snapToAxis,
  snapToEndpoints,
  snapToGrid,
  wallPolygonExtended,
} from "../geometry";
import { nextId, useStore } from "../store";
import type { Point, Wall } from "../types";
import { GridLayer, type Camera } from "./editor2d/GridLayer";
import { WallsLayer } from "./editor2d/WallsLayer";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

type DragState =
  | { kind: "pan"; startClient: Point; startCamera: Camera }
  | {
      kind: "moveWall";
      wallId: string;
      startWorld: Point;
      orig: Wall;
      moved: boolean;
    }
  | { kind: "endpoint"; wallId: string; end: "a" | "b"; moved: boolean };

export function Editor2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [size, setSize] = useState({ w: 800, h: 600 });
  const [camera, setCamera] = useState<Camera>({
    cx: 500,
    cy: 400,
    scale: 0.7,
  });
  const [mouse, setMouse] = useState<Point | null>(null);
  const [shift, setShift] = useState(false);

  const model = useStore((s) => s.model);
  const tool = useStore((s) => s.tool);
  const selection = useStore((s) => s.selection);
  const setSelection = useStore((s) => s.setSelection);
  const draftAnchor = useStore((s) => s.draftAnchor);
  const setDraftAnchor = useStore((s) => s.setDraftAnchor);
  const wallDraftKind = useStore((s) => s.wallDraftKind);
  const commit = useStore((s) => s.commit);
  const checkpoint = useStore((s) => s.checkpoint);
  const updateModel = useStore((s) => s.updateModel);

  const { gridSize } = model.settings;
  const draftThickness =
    wallDraftKind === "exterior"
      ? model.settings.exteriorWallThickness
      : model.settings.interiorWallThickness;

  // ---- container size ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // ---- coordinate transforms ----
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

  // ---- zoom (native listener so preventDefault works) ----
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

  // ---- shift tracking ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === "Shift" && setShift(true);
    const up = (e: KeyboardEvent) => e.key === "Shift" && setShift(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ---- snapping ----
  const snapPoint = useCallback(
    (raw: Point, from: Point | null, free: boolean): Point => {
      const ep = snapToEndpoints(raw, model.walls, 12 / camera.scale);
      if (ep) return ep;
      if (free) return raw;
      if (from) {
        const onAxis = snapToAxis(from, raw);
        if (onAxis.y === from.y) {
          return { x: Math.round(onAxis.x / gridSize) * gridSize, y: from.y };
        }
        return { x: from.x, y: Math.round(onAxis.y / gridSize) * gridSize };
      }
      return snapToGrid(raw, gridSize);
    },
    [model.walls, camera.scale, gridSize],
  );

  // ---- hit test ----
  const hitTestWall = useCallback(
    (p: Point): Wall | null => {
      let best: Wall | null = null;
      let bestD = Infinity;
      for (const w of model.walls) {
        const d = distToSegment(p, w.a, w.b);
        if (d <= w.thickness / 2 + 8 / camera.scale && d < bestD) {
          bestD = d;
          best = w;
        }
      }
      return best;
    },
    [model.walls, camera.scale],
  );

  // ---- pointer events ----
  const onPointerDown = (e: React.PointerEvent) => {
    const el = svgRef.current!;
    el.setPointerCapture(e.pointerId);
    const world = clientToWorld(e.clientX, e.clientY);

    if (e.button === 1 || e.button === 2) {
      dragRef.current = {
        kind: "pan",
        startClient: { x: e.clientX, y: e.clientY },
        startCamera: { ...camera },
      };
      return;
    }
    if (e.button !== 0) return;

    if (tool === "wall") {
      const p = snapPoint(world, draftAnchor, e.shiftKey);
      if (!draftAnchor) {
        setDraftAnchor(p);
      } else if (dist(draftAnchor, p) >= 1) {
        const anchor = draftAnchor;
        commit((m) => {
          m.walls.push({
            id: nextId("wall"),
            a: anchor,
            b: p,
            thickness: draftThickness,
            loadBearing: wallDraftKind === "exterior",
          });
        });
        setDraftAnchor(p);
      }
      return;
    }

    if (tool === "select") {
      const hit = hitTestWall(world);
      if (hit) {
        setSelection({ type: "wall", id: hit.id });
        dragRef.current = {
          kind: "moveWall",
          wallId: hit.id,
          startWorld: world,
          orig: structuredClone(hit),
          moved: false,
        };
      } else {
        setSelection(null);
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const world = clientToWorld(e.clientX, e.clientY);
    setMouse(world);
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.kind === "pan") {
      const dx = (e.clientX - drag.startClient.x) / drag.startCamera.scale;
      const dy = (e.clientY - drag.startClient.y) / drag.startCamera.scale;
      setCamera({
        ...drag.startCamera,
        cx: drag.startCamera.cx - dx,
        cy: drag.startCamera.cy - dy,
      });
      return;
    }

    if (drag.kind === "moveWall") {
      const rawDelta = {
        x: world.x - drag.startWorld.x,
        y: world.y - drag.startWorld.y,
      };
      const delta = e.shiftKey
        ? rawDelta
        : {
            x: Math.round(rawDelta.x / gridSize) * gridSize,
            y: Math.round(rawDelta.y / gridSize) * gridSize,
          };
      if (!drag.moved) {
        if (delta.x === 0 && delta.y === 0) return;
        checkpoint();
        drag.moved = true;
      }
      updateModel((m) => {
        const w = m.walls.find((x) => x.id === drag.wallId);
        if (!w) return;
        w.a = add(drag.orig.a, delta);
        w.b = add(drag.orig.b, delta);
      });
      return;
    }

    if (drag.kind === "endpoint") {
      const wall = model.walls.find((w) => w.id === drag.wallId);
      if (!wall) return;
      const other = drag.end === "a" ? wall.b : wall.a;
      const p = snapPoint(world, other, e.shiftKey);
      if (!drag.moved) {
        checkpoint();
        drag.moved = true;
      }
      updateModel((m) => {
        const w = m.walls.find((x) => x.id === drag.wallId);
        if (w) w[drag.end] = p;
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    svgRef.current?.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const onDoubleClick = () => {
    if (tool === "wall") setDraftAnchor(null);
  };

  const startEndpointDrag =
    (wallId: string, end: "a" | "b") => (e: React.PointerEvent) => {
      e.stopPropagation();
      svgRef.current!.setPointerCapture(e.pointerId);
      dragRef.current = { kind: "endpoint", wallId, end, moved: false };
    };

  // ---- render helpers ----
  const viewBox = `${camera.cx - size.w / 2 / camera.scale} ${camera.cy - size.h / 2 / camera.scale} ${size.w / camera.scale} ${size.h / camera.scale}`;
  const selectedWall =
    selection?.type === "wall"
      ? model.walls.find((w) => w.id === selection.id)
      : undefined;

  const snappedCursor =
    mouse && tool === "wall" ? snapPoint(mouse, draftAnchor, shift) : null;

  const draftWall: Wall | null =
    draftAnchor && snappedCursor && dist(draftAnchor, snappedCursor) >= 1
      ? {
          id: "__draft",
          a: draftAnchor,
          b: snappedCursor,
          thickness: draftThickness,
          loadBearing: false,
        }
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        style={{
          display: "block",
          cursor: tool === "wall" ? "crosshair" : "default",
        }}
      >
        <GridLayer
          camera={camera}
          width={size.w}
          height={size.h}
          gridSize={gridSize}
        />
        <WallsLayer
          walls={model.walls}
          selectedId={selection?.type === "wall" ? selection.id : null}
        />

        {/* draft wall preview */}
        {draftWall && (
          <g pointerEvents="none">
            <polygon
              points={wallPolygonExtended(draftWall)
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              fill="#2563eb55"
              stroke="#2563eb"
              strokeWidth={1 / camera.scale}
              strokeDasharray={`${6 / camera.scale} ${4 / camera.scale}`}
            />
            <text
              x={(draftWall.a.x + draftWall.b.x) / 2}
              y={(draftWall.a.y + draftWall.b.y) / 2 - 10 / camera.scale}
              fontSize={13 / camera.scale}
              textAnchor="middle"
              fill="#2563eb"
            >
              {formatLength(dist(draftWall.a, draftWall.b))}
            </text>
          </g>
        )}

        {/* snap cursor */}
        {snappedCursor && (
          <circle
            cx={snappedCursor.x}
            cy={snappedCursor.y}
            r={4 / camera.scale}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1.5 / camera.scale}
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
              r={6 / camera.scale}
              fill="#fff"
              stroke="#2563eb"
              strokeWidth={2 / camera.scale}
              style={{ cursor: "move" }}
              onPointerDown={startEndpointDrag(selectedWall.id, end)}
            />
          ))}
      </svg>
    </div>
  );
}
