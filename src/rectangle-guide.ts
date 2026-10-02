import { dist, dot, sub } from "./geometry";
import type { Point, Wall } from "./types";

export interface RectangleGuide {
  /** First point of the first wall in the active chain. */
  start: Point;
  /** Shared corner between the two existing walls. */
  corner: Point;
  /** End of the second wall in the active chain. */
  end: Point;
  /** Exact corner that completes the rectangle. */
  suggestedCorner: Point;
}

const POINT_EPSILON = 1e-6;
const ORTHOGONAL_TOLERANCE = 0.02;

const samePoint = (a: Point, b: Point) => dist(a, b) <= POINT_EPSILON;

const hasWallBetween = (walls: readonly Wall[], a: Point, b: Point) =>
  walls.some(
    (wall) =>
      (samePoint(wall.a, a) && samePoint(wall.b, b)) ||
      (samePoint(wall.a, b) && samePoint(wall.b, a)),
  );

/**
 * Return the two missing sides of an active, right-angled wall chain.
 * The guide is deliberately derived from only the two latest walls so it
 * stays a temporary drawing aid and never becomes part of the model.
 */
export function getRectangleGuide(
  walls: readonly Wall[],
  draftAnchor: Point | null,
): RectangleGuide | null {
  if (!draftAnchor || walls.length < 2) return null;

  const second = walls.at(-1)!;
  const first = walls.at(-2)!;
  if (!samePoint(second.b, draftAnchor) || !samePoint(first.b, second.a)) {
    return null;
  }

  const firstVector = sub(first.b, first.a);
  const secondVector = sub(second.b, second.a);
  const firstLength = dist(first.a, first.b);
  const secondLength = dist(second.a, second.b);
  if (firstLength <= POINT_EPSILON || secondLength <= POINT_EPSILON) {
    return null;
  }
  if (
    Math.abs(dot(firstVector, secondVector)) >
    firstLength * secondLength * ORTHOGONAL_TOLERANCE
  ) {
    return null;
  }

  const suggestedCorner = {
    x: first.a.x + secondVector.x,
    y: first.a.y + secondVector.y,
  };
  // Once the third side is present, the latest two walls would otherwise
  // generate a redundant guide over the already-drawn first side.
  if (hasWallBetween(walls, suggestedCorner, first.a)) return null;

  return {
    start: { ...first.a },
    corner: { ...first.b },
    end: { ...second.b },
    suggestedCorner,
  };
}
