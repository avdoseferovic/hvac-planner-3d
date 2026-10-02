import { useCallback, useEffect, useRef, useState } from "react";
import {
  add,
  closestT,
  dist,
  distToSegment,
  pointInPolygon,
  snapToAxis,
  snapToEndpoints,
  snapToGrid,
} from "../../geometry";
import {
  clampOpeningT,
  findWallNear,
  openingCenter,
  placeOpening,
} from "../../openings";
import { commitDuctDraft } from "../../actions";
import { nextId, useStore } from "../../store";
import type { Opening, Point, Room, Tool, Wall } from "../../types";
import type { Camera } from "./GridLayer";
import { useHvacTool, type HvacDrag } from "./useHvacTool";

type DragState =
  | { kind: "pan"; startClient: Point; startCamera: Camera }
  | {
      kind: "moveWall";
      wallId: string;
      startWorld: Point;
      orig: Wall;
      moved: boolean;
    }
  | { kind: "endpoint"; wallId: string; end: "a" | "b"; moved: boolean }
  | { kind: "moveOpening"; openingId: string; moved: boolean }
  | HvacDrag;

export interface MeasureState {
  a: Point;
  b: Point | null;
}

export interface EditorTools {
  mouse: Point | null;
  shift: boolean;
  snappedCursor: Point | null;
  draftWall: Wall | null;
  openingPreview: { wall: Wall; opening: Opening } | null;
  measure: MeasureState | null;
  ductPreview: Point[] | null;
  jumperFirst: Point | null;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  startEndpointDrag: (
    wallId: string,
    end: "a" | "b",
  ) => (e: React.PointerEvent) => void;
}

export function useEditorTools(
  camera: Camera,
  setCamera: (c: Camera) => void,
  clientToWorld: (x: number, y: number) => Point,
  svgRef: React.RefObject<SVGSVGElement | null>,
  rooms: Room[],
): EditorTools {
  const dragRef = useRef<DragState | null>(null);
  const [mouse, setMouse] = useState<Point | null>(null);
  const [shift, setShift] = useState(false);
  const [measure, setMeasure] = useState<MeasureState | null>(null);

  const model = useStore((s) => s.model);
  const tool = useStore((s) => s.tool);
  const setSelection = useStore((s) => s.setSelection);
  const draftAnchor = useStore((s) => s.draftAnchor);
  const setDraftAnchor = useStore((s) => s.setDraftAnchor);
  const draftPath = useStore((s) => s.draftPath);
  const wallDraftKind = useStore((s) => s.wallDraftKind);
  const commit = useStore((s) => s.commit);
  const checkpoint = useStore((s) => s.checkpoint);
  const updateModel = useStore((s) => s.updateModel);

  const { gridSize } = model.settings;
  const hvacApi = useHvacTool(camera.scale);
  const draftThickness =
    wallDraftKind === "exterior"
      ? model.settings.exteriorWallThickness
      : model.settings.interiorWallThickness;

  // reset transient tool state when the tool changes
  useEffect(() => {
    setMeasure(null);
  }, [tool]);

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

  const hitTestOpening = useCallback(
    (p: Point): Opening | null => {
      for (const o of model.openings) {
        const wall = model.walls.find((w) => w.id === o.wallId);
        if (!wall) continue;
        if (dist(p, openingCenter(wall, o)) <= o.width / 2) return o;
      }
      return null;
    },
    [model.openings, model.walls],
  );

  const openingToolTarget = useCallback(
    (p: Point): { wall: Wall; opening: Opening } | null => {
      if (tool !== "door" && tool !== "window") return null;
      const wall = findWallNear(model.walls, p, 25 / camera.scale);
      if (!wall) return null;
      const placed = placeOpening(wall, p, tool);
      return {
        wall,
        opening: { id: "__preview", wallId: wall.id, ...placed },
      };
    },
    [tool, model.walls, camera.scale],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    svgRef.current!.setPointerCapture(e.pointerId);
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

    switch (tool) {
      case "wall": {
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
      case "door":
      case "window": {
        const target = openingToolTarget(world);
        if (target) {
          const id = nextId(tool);
          commit((m) => {
            m.openings.push({ ...target.opening, id });
          });
          setSelection({ type: "opening", id });
        }
        return;
      }
      case "measure": {
        const p = snapPoint(world, null, e.shiftKey);
        if (!measure || measure.b) setMeasure({ a: p, b: null });
        else setMeasure({ a: measure.a, b: p });
        return;
      }
      case "select": {
        const hvacDrag = hvacApi.selectAt(world);
        if (hvacDrag) {
          dragRef.current = hvacDrag;
          return;
        }
        const opening = hitTestOpening(world);
        if (opening) {
          setSelection({ type: "opening", id: opening.id });
          dragRef.current = {
            kind: "moveOpening",
            openingId: opening.id,
            moved: false,
          };
          return;
        }
        const wall = hitTestWall(world);
        if (wall) {
          setSelection({ type: "wall", id: wall.id });
          dragRef.current = {
            kind: "moveWall",
            wallId: wall.id,
            startWorld: world,
            orig: structuredClone(wall),
            moved: false,
          };
          return;
        }
        const room = rooms.find((r) => pointInPolygon(world, r.polygon));
        setSelection(room ? { type: "room", id: room.key } : null);
        return;
      }
      default:
        hvacApi.placeAt(tool, world, e.shiftKey);
        return;
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
      return;
    }

    if (drag.kind === "moveHvac") {
      hvacApi.applyDrag(drag, world, e.shiftKey);
      return;
    }

    if (drag.kind === "moveOpening") {
      const opening = model.openings.find((o) => o.id === drag.openingId);
      const wall = opening && model.walls.find((w) => w.id === opening.wallId);
      if (!opening || !wall) return;
      const wallLen = dist(wall.a, wall.b);
      let s = closestT(wall.a, wall.b, world) * wallLen;
      if (!e.shiftKey) s = Math.round(s / gridSize) * gridSize;
      const t = clampOpeningT(wall, opening.width, s / wallLen);
      if (!drag.moved) {
        checkpoint();
        drag.moved = true;
      }
      updateModel((m) => {
        const o = m.openings.find((x) => x.id === drag.openingId);
        if (o) o.t = t;
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    svgRef.current?.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const onDoubleClick = () => {
    if (tool === "wall") setDraftAnchor(null);
    if (tool === "duct") commitDuctDraft();
  };

  const startEndpointDrag =
    (wallId: string, end: "a" | "b") => (e: React.PointerEvent) => {
      e.stopPropagation();
      svgRef.current!.setPointerCapture(e.pointerId);
      dragRef.current = { kind: "endpoint", wallId, end, moved: false };
    };

  // ---- overlays ----
  const HVAC_POINT_TOOLS: Tool[] = [
    "acUnit",
    "hrvUnit",
    "supplyDiffuser",
    "returnGrille",
    "extractValve",
    "freshAirValve",
    "jumperDuct",
  ];
  const snappedCursor = mouse
    ? tool === "wall" || tool === "measure"
      ? snapPoint(mouse, tool === "wall" ? draftAnchor : null, shift)
      : tool === "duct"
        ? hvacApi.snapHvacPoint(mouse, shift)
        : HVAC_POINT_TOOLS.includes(tool)
          ? shift
            ? mouse
            : snapToGrid(mouse, gridSize)
          : null
    : null;

  const draftWall: Wall | null =
    tool === "wall" &&
    draftAnchor &&
    snappedCursor &&
    dist(draftAnchor, snappedCursor) >= 1
      ? {
          id: "__draft",
          a: draftAnchor,
          b: snappedCursor,
          thickness: draftThickness,
          loadBearing: false,
        }
      : null;

  const openingPreview = mouse ? openingToolTarget(mouse) : null;

  const measureLive: MeasureState | null =
    measure && !measure.b && snappedCursor
      ? { a: measure.a, b: snappedCursor }
      : measure;

  const ductPreview =
    tool === "duct" && draftPath.length > 0
      ? snappedCursor
        ? [...draftPath, snappedCursor]
        : draftPath
      : null;
  const jumperFirst = tool === "jumperDuct" ? draftAnchor : null;

  return {
    mouse,
    shift,
    snappedCursor,
    draftWall,
    openingPreview,
    measure: measureLive,
    ductPreview,
    jumperFirst,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDoubleClick,
    startEndpointDrag,
  };
}
