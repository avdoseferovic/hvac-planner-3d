import { useCallback, useEffect, useRef, useState } from "react";
import {
  add,
  closestT,
  dist,
  pointInPolygon,
  snapToGrid,
} from "../../geometry";
import { snapToConstructionGuide } from "../../construction-guide";
import { restoreElements, translateSelection } from "../../grouping";
import { getRectangleGuide, type RectangleGuide } from "../../rectangle-guide";
import {
  snapDraftPoint,
  snapMeasurementPoint,
  type SnapMods,
} from "../../snapping";
import {
  hitTestOpening,
  hitTestWall,
  makeMultiDrag,
  pickSelection,
  type MoveMultiDrag,
} from "./selectTool";
import { clampOpeningT, findWallNear, placeOpening } from "../../openings";
import { cutWallSegment } from "../../wall-cut";
import { commitDuctDraft } from "../../actions";
import { nextId, useStore } from "../../store";
import type { Opening, Point, Room, Selection, Tool, Wall } from "../../types";
import type { Camera } from "./GridLayer";
import { screenOffsetToWorld } from "../../camera";
import { capturePointer, releasePointer } from "./pointer-capture";
import { useHvacTool, type HvacDrag } from "./useHvacTool";
import { useModifierKeys } from "./useModifierKeys";
import { useSpacePan } from "./useSpacePan";

type DragState =
  | { kind: "pan"; startClient: Point; startCamera: Camera }
  | {
      kind: "moveWall";
      wallId: string;
      startWorld: Point;
      orig: Wall;
      moved: boolean;
    }
  | MoveMultiDrag
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
  /** true while the spacebar is held (Figma-style pan mode) */
  spacePan: boolean;
  /** true while a pan drag is in progress */
  panning: boolean;
  snappedCursor: Point | null;
  draftWall: Wall | null;
  /** Two missing sides of the active right-angle wall chain. */
  rectangleGuide: RectangleGuide | null;
  openingPreview: { wall: Wall; opening: Opening } | null;
  measure: MeasureState | null;
  ductPreview: Point[] | null;
  jumperFirst: Point | null;
  /** span being removed by the cut tool (anchor → cursor) */
  cutPreview: { a: Point; b: Point } | null;
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
  /** wall + position of the first cut-tool click */
  const cutWallRef = useRef<{ wallId: string; t: number } | null>(null);
  const [mouse, setMouse] = useState<Point | null>(null);
  const [panning, setPanning] = useState(false);
  const [measure, setMeasure] = useState<MeasureState | null>(null);
  const { shift, alt } = useModifierKeys();
  const spacePan = useSpacePan();

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

  // Keep a completed measurement while switching directly to Wall: it is a
  // temporary construction guide for setting an exact wall-start offset.
  useEffect(() => {
    if (tool !== "measure" && tool !== "wall") setMeasure(null);
    cutWallRef.current = null;
  }, [tool]);

  const snapPoint = useCallback(
    (raw: Point, from: Point | null, mods: SnapMods): Point =>
      snapDraftPoint(raw, from, mods, model.walls, 12 / camera.scale, gridSize),
    [model.walls, camera.scale, gridSize],
  );

  const snapMeasurePoint = useCallback(
    (raw: Point, mods: SnapMods): Point =>
      snapMeasurementPoint(
        raw,
        mods,
        model.walls,
        12 / camera.scale,
        gridSize,
      ),
    [model.walls, camera.scale, gridSize],
  );

  const snapWallPoint = useCallback(
    (raw: Point, from: Point | null, mods: SnapMods): Point => {
      const snapped = snapPoint(raw, from, mods);
      if (mods.free) return snapped;

      const measuredPoint = snapToConstructionGuide(
        raw,
        measure?.b ? { a: measure.a, b: measure.b } : null,
        12 / camera.scale,
      );
      if (measuredPoint) return measuredPoint;

      const rectangleGuide = getRectangleGuide(model.walls, from);
      if (
        rectangleGuide &&
        dist(raw, rectangleGuide.suggestedCorner) <= 16 / camera.scale
      ) {
        return { ...rectangleGuide.suggestedCorner };
      }
      return snapped;
    },
    [camera.scale, measure, model.walls, snapPoint],
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
    capturePointer(svgRef.current, e.pointerId);
    const world = clientToWorld(e.clientX, e.clientY);

    if (e.button === 1 || e.button === 2 || (e.button === 0 && spacePan)) {
      dragRef.current = {
        kind: "pan",
        startClient: { x: e.clientX, y: e.clientY },
        startCamera: { ...camera },
      };
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;

    switch (tool) {
      case "wall": {
        const p = snapWallPoint(world, draftAnchor, {
          free: e.altKey,
          fine: e.shiftKey,
        });
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
          setSelection([{ type: "opening", id }]);
        }
        return;
      }
      case "measure": {
        const p = snapMeasurePoint(world, {
          free: e.altKey,
          fine: e.shiftKey,
        });
        if (!measure || measure.b) setMeasure({ a: p, b: null });
        else setMeasure({ a: measure.a, b: p });
        return;
      }
      case "cutWall": {
        const hitW = hitTestWall(model.walls, world, 8 / camera.scale);
        if (!hitW) return;
        const p = snapPoint(world, null, { free: e.altKey, fine: e.shiftKey });
        const t = closestT(hitW.a, hitW.b, p);
        const anchor = cutWallRef.current;
        if (!anchor || anchor.wallId !== hitW.id || !draftAnchor) {
          setDraftAnchor(p);
          cutWallRef.current = { wallId: hitW.id, t };
          return;
        }
        commit((m) =>
          cutWallSegment(
            m,
            hitW.id,
            anchor.t,
            t,
            nextId("wall"),
            nextId("wall"),
          ),
        );
        setDraftAnchor(null);
        cutWallRef.current = null;
        return;
      }
      case "select": {
        const additive = e.shiftKey;
        const st = useStore.getState();
        const choose = (item: Selection): Selection[] => {
          const sel = pickSelection(st.model, st.selection, item, additive);
          setSelection(sel);
          return sel;
        };
        const multiOrNull = (sel: Selection[]): boolean => {
          if (additive) return true; // shift-click only adjusts the selection
          if (sel.length > 1) {
            dragRef.current = makeMultiDrag(st.model, sel, world);
            return true;
          }
          return false;
        };

        const hvacDrag = hvacApi.selectAt(world);
        if (hvacDrag) {
          const sel = choose({ type: "hvac", id: hvacDrag.id });
          if (!multiOrNull(sel)) dragRef.current = hvacDrag;
          return;
        }
        const opening = hitTestOpening(model.walls, model.openings, world);
        if (opening) {
          setSelection([{ type: "opening", id: opening.id }]);
          if (!additive) {
            dragRef.current = {
              kind: "moveOpening",
              openingId: opening.id,
              moved: false,
            };
          }
          return;
        }
        const wall = hitTestWall(model.walls, world, 8 / camera.scale);
        if (wall) {
          const sel = choose({ type: "wall", id: wall.id });
          if (!multiOrNull(sel)) {
            dragRef.current = {
              kind: "moveWall",
              wallId: wall.id,
              startWorld: world,
              orig: structuredClone(wall),
              moved: false,
            };
          }
          return;
        }
        if (!additive) {
          const room = rooms.find((r) => pointInPolygon(world, r.polygon));
          setSelection(room ? [{ type: "room", id: room.key }] : []);
        }
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
      const dv = screenOffsetToWorld(drag.startCamera, {
        x: e.clientX - drag.startClient.x,
        y: e.clientY - drag.startClient.y,
      });
      setCamera({
        ...drag.startCamera,
        cx: drag.startCamera.cx - dv.x,
        cy: drag.startCamera.cy - dv.y,
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

    if (drag.kind === "moveMulti") {
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
        restoreElements(m, drag.origWalls, drag.origHvac);
        translateSelection(m, drag.sel, delta);
      });
      return;
    }

    if (drag.kind === "endpoint") {
      const wall = model.walls.find((w) => w.id === drag.wallId);
      if (!wall) return;
      const other = drag.end === "a" ? wall.b : wall.a;
      const p = snapPoint(world, other, {
        free: e.altKey,
        fine: e.shiftKey,
      });
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
    releasePointer(svgRef.current, e.pointerId);
    dragRef.current = null;
    setPanning(false);
  };

  const onDoubleClick = () => {
    if (tool === "wall") setDraftAnchor(null);
    if (tool === "duct") commitDuctDraft();
  };

  const startEndpointDrag =
    (wallId: string, end: "a" | "b") => (e: React.PointerEvent) => {
      e.stopPropagation();
      capturePointer(svgRef.current, e.pointerId);
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
    ? tool === "wall" || tool === "measure" || tool === "cutWall"
      ? tool === "wall"
        ? snapWallPoint(mouse, draftAnchor, { free: alt, fine: shift })
        : tool === "measure"
          ? snapMeasurePoint(mouse, { free: alt, fine: shift })
          : snapPoint(mouse, null, { free: alt, fine: shift })
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

  const rectangleGuide =
    tool === "wall" ? getRectangleGuide(model.walls, draftAnchor) : null;

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
  const cutPreview =
    tool === "cutWall" && draftAnchor && snappedCursor
      ? { a: draftAnchor, b: snappedCursor }
      : null;

  return {
    mouse,
    shift,
    spacePan,
    panning,
    snappedCursor,
    draftWall,
    rectangleGuide,
    openingPreview,
    measure: measureLive,
    ductPreview,
    jumperFirst,
    cutPreview,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDoubleClick,
    startEndpointDrag,
  };
}
