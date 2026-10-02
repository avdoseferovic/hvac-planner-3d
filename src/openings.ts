import {
  add,
  closestT,
  dist,
  lerp,
  perp,
  scale,
  wallDirection,
} from "./geometry";
import type {
  DoorKind,
  Opening,
  OpeningType,
  Point,
  Wall,
} from "./types";

export const DOOR_DEFAULTS = { width: 90, height: 205, sill: 0 };
export const GARAGE_ROLLER_DEFAULTS = {
  width: 300,
  height: 240,
  sill: 0,
};
export const WINDOW_DEFAULTS = { width: 120, height: 130, sill: 90 };

/** Clamp opening center position so the whole opening stays inside the wall. */
export function clampOpeningT(wall: Wall, width: number, t: number): number {
  const wallLen = dist(wall.a, wall.b);
  if (wallLen <= width) return 0.5;
  const margin = width / 2 / wallLen;
  return Math.min(1 - margin, Math.max(margin, t));
}

/** Compute placement of a new opening on a wall from a cursor position. */
export function placeOpening(
  wall: Wall,
  cursor: Point,
  type: OpeningType,
): Pick<Opening, "type" | "t" | "width" | "height" | "sill"> {
  const defaults = type === "door" ? DOOR_DEFAULTS : WINDOW_DEFAULTS;
  const t = clampOpeningT(
    wall,
    defaults.width,
    closestT(wall.a, wall.b, cursor),
  );
  return { type, t, ...defaults };
}

/** Apply practical dimensions when converting between hinged and roller doors. */
export function applyDoorKind(
  opening: Opening,
  wall: Wall,
  kind: DoorKind,
): void {
  const defaults =
    kind === "garageRoller" ? GARAGE_ROLLER_DEFAULTS : DOOR_DEFAULTS;
  const wallLen = dist(wall.a, wall.b);
  opening.doorKind = kind;
  opening.width = Math.min(defaults.width, wallLen);
  opening.height = defaults.height;
  opening.sill = defaults.sill;
  opening.t = clampOpeningT(wall, opening.width, opening.t);
}

/** Center point of an opening in plan coordinates. */
export function openingCenter(wall: Wall, opening: Opening): Point {
  return lerp(wall.a, wall.b, opening.t);
}

/** The opening jamb centers, ordered from wall endpoint a toward b. */
export function openingEdgePoints(
  wall: Wall,
  opening: Pick<Opening, "t" | "width">,
): { a: Point; b: Point } {
  const wallLen = dist(wall.a, wall.b);
  if (wallLen === 0) return { a: { ...wall.a }, b: { ...wall.a } };
  const halfT = opening.width / 2 / wallLen;
  return {
    a: lerp(wall.a, wall.b, opening.t - halfT),
    b: lerp(wall.a, wall.b, opening.t + halfT),
  };
}

/**
 * Resize one opening jamb while preserving the other jamb in world space.
 * Cursor projection is constrained to the host wall, then snapped along it.
 */
export function resizeOpeningEdge(
  wall: Wall,
  opening: Pick<Opening, "t" | "width">,
  edge: "a" | "b",
  cursor: Point,
  snapIncrement = 1,
  minimumWidth = 20,
): Pick<Opening, "t" | "width"> {
  const wallLen = dist(wall.a, wall.b);
  if (wallLen === 0) return { t: 0.5, width: 0 };

  const center = opening.t * wallLen;
  const originalA = Math.max(0, center - opening.width / 2);
  const originalB = Math.min(wallLen, center + opening.width / 2);
  const projected = closestT(wall.a, wall.b, cursor) * wallLen;

  let a = originalA;
  let b = originalB;
  if (edge === "a") {
    const minWidth = Math.min(minimumWidth, originalB);
    const rawWidth = originalB - projected;
    const width =
      snapIncrement > 0
        ? Math.round(rawWidth / snapIncrement) * snapIncrement
        : rawWidth;
    a = originalB - Math.min(originalB, Math.max(minWidth, width));
  } else {
    const minWidth = Math.min(minimumWidth, wallLen - originalA);
    const rawWidth = projected - originalA;
    const width =
      snapIncrement > 0
        ? Math.round(rawWidth / snapIncrement) * snapIncrement
        : rawWidth;
    b = originalA + Math.min(wallLen - originalA, Math.max(minWidth, width));
  }

  return {
    t: (a + b) / 2 / wallLen,
    width: b - a,
  };
}

/** The 4 corners of the opening cut (a rectangle spanning the wall thickness). */
export function openingRect(wall: Wall, opening: Opening): Point[] {
  const c = openingCenter(wall, opening);
  const d = wallDirection(wall);
  const along = scale(d, opening.width / 2);
  const across = scale(perp(d), wall.thickness / 2);
  return [
    add(add(c, along), across),
    add(add(c, along), scale(across, -1)),
    add(add(c, scale(along, -1)), scale(across, -1)),
    add(add(c, scale(along, -1)), across),
  ];
}

export interface DoorSwingGeometry {
  /** jamb the leaf hinges on */
  hinge: Point;
  /** opposite jamb (arc end) */
  jamb: Point;
  /** open leaf tip (arc start) */
  tip: Point;
  /** SVG arc sweep flag so the quarter arc is centered on the hinge */
  sweep: 0 | 1;
}

/** Plan-view swing symbol for a door, honoring its hinge/swing settings. */
export function doorSwingGeometry(
  wall: Wall,
  opening: Opening,
): DoorSwingGeometry {
  const d = wallDirection(wall);
  const n = perp(d);
  const c = lerp(wall.a, wall.b, opening.t);
  const hingeSign = (opening.hinge ?? "left") === "left" ? -1 : 1;
  const swingSign = (opening.swing ?? "in") === "in" ? 1 : -1;
  const hinge = add(c, scale(d, (hingeSign * opening.width) / 2));
  const jamb = add(c, scale(d, (-hingeSign * opening.width) / 2));
  const tip = add(hinge, scale(n, swingSign * opening.width));
  const v1 = { x: tip.x - hinge.x, y: tip.y - hinge.y };
  const v2 = { x: jamb.x - hinge.x, y: jamb.y - hinge.y };
  const sweep = v1.x * v2.y - v1.y * v2.x > 0 ? 1 : 0;
  return { hinge, jamb, tip, sweep };
}

/** Distance from a point to an opening's center (for hit-testing). */
export function openingHitRadius(opening: Opening): number {
  return opening.width / 2;
}

/** Find the wall nearest to a point within `maxDist` of its centerline. */
export function findWallNear(
  walls: Wall[],
  p: Point,
  maxDist: number,
): Wall | null {
  let best: Wall | null = null;
  let bestD = Infinity;
  for (const w of walls) {
    const t = closestT(w.a, w.b, p);
    const d = dist(p, lerp(w.a, w.b, t));
    if (d <= maxDist + w.thickness / 2 && d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}
