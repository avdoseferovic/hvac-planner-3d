import { dist } from "./geometry";
import type { Point } from "./types";

export interface ConstructionGuide {
  a: Point;
  b: Point;
}

/** Return the nearest measured endpoint within the given world-space radius. */
export function snapToConstructionGuide(
  raw: Point,
  guide: ConstructionGuide | null,
  radius: number,
): Point | null {
  if (!guide) return null;

  const aDistance = dist(raw, guide.a);
  const bDistance = dist(raw, guide.b);
  if (aDistance > radius && bDistance > radius) return null;
  return aDistance <= bDistance ? { ...guide.a } : { ...guide.b };
}
