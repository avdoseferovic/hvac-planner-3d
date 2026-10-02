import { dist, distToSegment } from "../../geometry";
import { expandToGroup, isGroupable } from "../../grouping";
import { openingCenter } from "../../openings";
import type {
  HvacElement,
  Model,
  Opening,
  Point,
  Selection,
  Wall,
} from "../../types";

const key = (s: Selection): string => `${s.type}:${s.id}`;

/** Nearest wall whose band (+tolerance) contains `p`. */
export function hitTestWall(
  walls: Wall[],
  p: Point,
  tolerance: number,
): Wall | null {
  let best: Wall | null = null;
  let bestD = Infinity;
  for (const w of walls) {
    const d = distToSegment(p, w.a, w.b);
    if (d <= w.thickness / 2 + tolerance && d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}

/** First opening whose half-width circle contains `p`. */
export function hitTestOpening(
  walls: Wall[],
  openings: Opening[],
  p: Point,
): Opening | null {
  for (const o of openings) {
    const wall = walls.find((w) => w.id === o.wallId);
    if (!wall) continue;
    if (dist(p, openingCenter(wall, o)) <= o.width / 2) return o;
  }
  return null;
}

/**
 * Next selection after clicking `item`.
 * - plain click: the item (expanded to its whole group)
 * - plain click on a member of the current multi-selection: keep it (drag moves all)
 * - shift-click (groupable items): toggle the item/group in the selection
 */
export function pickSelection(
  model: Model,
  current: Selection[],
  item: Selection,
  additive: boolean,
): Selection[] {
  const expanded = expandToGroup(model, item);
  if (additive && isGroupable(item)) {
    const curKeys = new Set(current.map(key));
    const allIn = expanded.every((s) => curKeys.has(key(s)));
    if (allIn) {
      const drop = new Set(expanded.map(key));
      return current.filter((s) => !drop.has(key(s)));
    }
    return [
      ...current.filter(isGroupable),
      ...expanded.filter((s) => !curKeys.has(key(s))),
    ];
  }
  if (current.length > 1 && current.some((s) => key(s) === key(item))) {
    return current;
  }
  return expanded;
}

export interface MoveMultiDrag {
  kind: "moveMulti";
  startWorld: Point;
  sel: Selection[];
  origWalls: Wall[];
  origHvac: HvacElement[];
  moved: boolean;
}

/** Snapshot the selection for a live multi-move drag. */
export function makeMultiDrag(
  model: Model,
  sel: Selection[],
  startWorld: Point,
): MoveMultiDrag {
  const ids = (type: Selection["type"]) =>
    new Set(sel.filter((s) => s.type === type).map((s) => s.id));
  const wallIds = ids("wall");
  const hvacIds = ids("hvac");
  return {
    kind: "moveMulti",
    startWorld,
    sel,
    origWalls: model.walls
      .filter((w) => wallIds.has(w.id))
      .map((w) => structuredClone(w)),
    origHvac: model.hvac
      .filter((h) => hvacIds.has(h.id))
      .map((h) => structuredClone(h)),
    moved: false,
  };
}
