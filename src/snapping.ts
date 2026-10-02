import {
  closestT,
  dist,
  lerp,
  pointInPolygon,
  snapToAxis,
  snapToEndpoints,
  snapToGrid,
  wallPolygonExtended,
} from "./geometry";
import type { Point, Wall } from "./types";

/** Modifier state for draft-point snapping. */
export interface SnapMods {
  /** Alt: no snapping at all (free angle, free position) */
  free?: boolean;
  /** Shift: keep the axis lock but skip grid rounding (fine placement) */
  fine?: boolean;
}

/**
 * Project `p` onto the nearest wall centerline when it falls inside the
 * wall band (half thickness) plus `tol` — makes T-junctions land exactly
 * on the centerline so room detection can close the loop.
 */
export function snapToWallLine(
  p: Point,
  walls: Wall[],
  tol: number,
): Point | null {
  let best: Point | null = null;
  let bestD = Infinity;
  for (const w of walls) {
    const q = lerp(w.a, w.b, closestT(w.a, w.b, p));
    const d = dist(p, q);
    if (d <= w.thickness / 2 + tol && d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

/**
 * Snap a wall/draft point.
 * Priority: wall endpoints → free → axis lock from `from` (+grid) →
 * grid, each refined onto a nearby wall centerline.
 */
export function snapDraftPoint(
  raw: Point,
  from: Point | null,
  mods: SnapMods,
  walls: Wall[],
  endpointTolerance: number,
  gridSize: number,
): Point {
  const ep = snapToEndpoints(raw, walls, endpointTolerance);
  if (ep) return ep;
  if (mods.free) return raw;

  let p: Point;
  if (from) {
    const onAxis = snapToAxis(from, raw);
    if (mods.fine) {
      p = onAxis;
    } else if (onAxis.y === from.y) {
      p = { x: Math.round(onAxis.x / gridSize) * gridSize, y: from.y };
    } else {
      p = { x: from.x, y: Math.round(onAxis.y / gridSize) * gridSize };
    }
  } else {
    p = mods.fine ? raw : snapToGrid(raw, gridSize);
  }
  return snapToWallLine(p, walls, endpointTolerance) ?? p;
}

/** Snap to the closest visible edge of the rendered wall polygons. */
export function snapToWallEdge(
  p: Point,
  walls: Wall[],
  tolerance: number,
): Point | null {
  let nearestCorner: Point | null = null;
  let cornerDistance = tolerance;
  for (const wall of walls) {
    for (const corner of wallPolygonExtended(wall)) {
      const candidateDistance = dist(p, corner);
      if (candidateDistance <= cornerDistance) {
        nearestCorner = corner;
        cornerDistance = candidateDistance;
      }
    }
  }
  if (nearestCorner) return { ...nearestCorner };

  let best: Point | null = null;
  let bestDistance = Infinity;

  for (const wall of walls) {
    const polygon = wallPolygonExtended(wall);
    const insideWall = pointInPolygon(p, polygon);
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const candidate = lerp(a, b, closestT(a, b, p));
      const candidateDistance = dist(p, candidate);
      if (
        (insideWall || candidateDistance <= tolerance) &&
        candidateDistance < bestDistance
      ) {
        best = candidate;
        bestDistance = candidateDistance;
      }
    }
  }
  return best;
}

/**
 * Snap a manual measurement point to the physical wall edge. Unlike wall
 * drafting, this deliberately never projects onto the wall centerline.
 */
export function snapMeasurementPoint(
  raw: Point,
  mods: SnapMods,
  walls: Wall[],
  edgeTolerance: number,
  gridSize: number,
): Point {
  if (mods.free) return raw;
  const point = mods.fine ? raw : snapToGrid(raw, gridSize);
  return snapToWallEdge(point, walls, edgeTolerance) ?? point;
}
