import { useCallback } from "react";
import { add, dist, snapToGrid } from "../../geometry";
import {
  makeAcUnit,
  makeExtractValve,
  makeFacadePenetration,
  makeFreshAirValve,
  makeHrvUnit,
  makeJumperDuct,
  makeReturnGrille,
  makeSupplyDiffuser,
} from "../../hvac-factories";
import {
  ductSnapPoints,
  hitTestHvac,
  moveHvac,
  type HvacHitPart,
} from "../../hvac";
import { findWallNear } from "../../openings";
import { useStore } from "../../store";
import type { HvacElement, Point, Tool } from "../../types";

export interface HvacDrag {
  kind: "moveHvac";
  id: string;
  part: HvacHitPart;
  startWorld: Point;
  orig: HvacElement;
  moved: boolean;
}

export interface HvacToolApi {
  /** returns true when the event was consumed */
  placeAt: (tool: Tool, world: Point, shiftKey: boolean) => boolean;
  /** hvac hit under the cursor → selection + drag descriptor, or null */
  selectAt: (world: Point) => HvacDrag | null;
  applyDrag: (drag: HvacDrag, world: Point, shiftKey: boolean) => void;
  /** duct-endpoint aware snapping (units/penetrations first, then grid) */
  snapHvacPoint: (raw: Point, free: boolean) => Point;
}

export function useHvacTool(scale: number): HvacToolApi {
  const model = useStore((s) => s.model);
  const showHvac = useStore((s) => s.showHvac);
  const setSelection = useStore((s) => s.setSelection);
  const draftAnchor = useStore((s) => s.draftAnchor);
  const setDraftAnchor = useStore((s) => s.setDraftAnchor);
  const draftPath = useStore((s) => s.draftPath);
  const setDraftPath = useStore((s) => s.setDraftPath);
  const commit = useStore((s) => s.commit);
  const checkpoint = useStore((s) => s.checkpoint);
  const updateModel = useStore((s) => s.updateModel);

  const { gridSize } = model.settings;

  const snapHvacPoint = useCallback(
    (raw: Point, free: boolean): Point => {
      const targets = ductSnapPoints(model.hvac, model.walls);
      let best: Point | null = null;
      let bestD = 15 / scale;
      for (const t of targets) {
        const d = dist(raw, t);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      if (best) return { ...best };
      return free ? raw : snapToGrid(raw, gridSize);
    },
    [model.hvac, model.walls, scale, gridSize],
  );

  const pushElement = useCallback(
    (el: HvacElement) => {
      commit((m) => {
        m.hvac.push(el);
      });
      setSelection({ type: "hvac", id: el.id });
    },
    [commit, setSelection],
  );

  const placeAt = useCallback(
    (tool: Tool, world: Point, shiftKey: boolean): boolean => {
      const p = shiftKey ? world : snapToGrid(world, gridSize);
      switch (tool) {
        case "acUnit": {
          const n = model.hvac.filter((h) => h.kind === "acUnit").length + 1;
          pushElement(makeAcUnit(p, n));
          return true;
        }
        case "hrvUnit": {
          const n = model.hvac.filter((h) => h.kind === "hrvUnit").length + 1;
          pushElement(makeHrvUnit(p, n));
          return true;
        }
        case "supplyDiffuser":
          pushElement(makeSupplyDiffuser(p));
          return true;
        case "returnGrille":
          pushElement(makeReturnGrille(p));
          return true;
        case "extractValve":
          pushElement(makeExtractValve(p));
          return true;
        case "freshAirValve":
          pushElement(makeFreshAirValve(p));
          return true;
        case "jumperDuct": {
          if (!draftAnchor) {
            setDraftAnchor(p);
          } else {
            pushElement(makeJumperDuct(draftAnchor, p));
            setDraftAnchor(null);
          }
          return true;
        }
        case "duct": {
          const snapped = snapHvacPoint(world, shiftKey);
          setDraftPath([...draftPath, snapped]);
          return true;
        }
        case "facadePenetration": {
          const wall = findWallNear(model.walls, world, 25 / scale);
          if (wall) {
            const t = Math.max(
              0.02,
              Math.min(
                0.98,
                ((world.x - wall.a.x) * (wall.b.x - wall.a.x) +
                  (world.y - wall.a.y) * (wall.b.y - wall.a.y)) /
                  dist(wall.a, wall.b) ** 2,
              ),
            );
            pushElement(makeFacadePenetration(wall, t));
          }
          return true;
        }
        default:
          return false;
      }
    },
    [
      gridSize,
      model.hvac,
      model.walls,
      scale,
      draftAnchor,
      draftPath,
      pushElement,
      setDraftAnchor,
      setDraftPath,
      snapHvacPoint,
    ],
  );

  const selectAt = useCallback(
    (world: Point): HvacDrag | null => {
      if (!showHvac) return null;
      const hit = hitTestHvac(model.hvac, model.walls, world, 6 / scale);
      if (!hit) return null;
      setSelection({ type: "hvac", id: hit.el.id });
      return {
        kind: "moveHvac",
        id: hit.el.id,
        part: hit.part,
        startWorld: world,
        orig: structuredClone(hit.el),
        moved: false,
      };
    },
    [showHvac, model.hvac, model.walls, scale, setSelection],
  );

  const applyDrag = useCallback(
    (drag: HvacDrag, world: Point, shiftKey: boolean): void => {
      const rawDelta = {
        x: world.x - drag.startWorld.x,
        y: world.y - drag.startWorld.y,
      };
      const delta = shiftKey
        ? rawDelta
        : {
            x: Math.round(rawDelta.x / gridSize) * gridSize,
            y: Math.round(rawDelta.y / gridSize) * gridSize,
          };
      const isVertex =
        drag.part.startsWith("vertex:") ||
        drag.part === "posA" ||
        drag.part === "posB";
      const target = isVertex
        ? snapHvacPoint(world, shiftKey)
        : add(drag.startWorld, delta);
      if (!drag.moved) {
        if (!isVertex && delta.x === 0 && delta.y === 0) return;
        checkpoint();
        drag.moved = true;
      }
      updateModel((m) => {
        const idx = m.hvac.findIndex((h) => h.id === drag.id);
        if (idx < 0) return;
        const el = structuredClone(drag.orig);
        moveHvac(el, drag.part, delta, target, m.walls);
        m.hvac[idx] = el;
      });
    },
    [gridSize, checkpoint, updateModel, snapHvacPoint],
  );

  return { placeAt, selectAt, applyDrag, snapHvacPoint };
}
