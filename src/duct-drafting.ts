import { cross, sub } from "./geometry";
import type { Point } from "./types";

export type DuctRoutingMode = "orthogonal" | "direct";

const EPS = 1e-6;

const samePoint = (left: Point, right: Point): boolean =>
  Math.abs(left.x - right.x) <= EPS && Math.abs(left.y - right.y) <= EPS;

/** Remove duplicate points and collinear vertices without changing the route. */
export function simplifyDuctRoute(points: Point[]): Point[] {
  const route: Point[] = [];
  for (const point of points) {
    if (!route.length || !samePoint(route[route.length - 1], point)) {
      route.push({ ...point });
    }
    while (route.length >= 3) {
      const a = route[route.length - 3];
      const b = route[route.length - 2];
      const c = route[route.length - 1];
      const ab = sub(b, a);
      const bc = sub(c, b);
      const continuesForward = ab.x * bc.x + ab.y * bc.y >= 0;
      if (Math.abs(cross(ab, bc)) > EPS || !continuesForward) break;
      route.splice(route.length - 2, 1);
    }
  }
  return route;
}

/**
 * Add a clicked target. Smart mode continues the previous segment direction
 * before inserting one deterministic right-angle elbow.
 */
export function appendDuctRoutePoint(
  path: Point[],
  target: Point,
  mode: DuctRoutingMode,
): Point[] {
  if (path.length === 0) return [{ ...target }];
  const from = path[path.length - 1];
  if (samePoint(from, target)) return path.map((point) => ({ ...point }));
  if (
    mode === "direct" ||
    Math.abs(from.x - target.x) <= EPS ||
    Math.abs(from.y - target.y) <= EPS
  ) {
    return simplifyDuctRoute([...path, target]);
  }

  let horizontalFirst: boolean;
  if (path.length >= 2) {
    const previous = path[path.length - 2];
    horizontalFirst =
      Math.abs(from.x - previous.x) >= Math.abs(from.y - previous.y);
  } else {
    horizontalFirst =
      Math.abs(target.x - from.x) >= Math.abs(target.y - from.y);
  }
  const corner = horizontalFirst
    ? { x: target.x, y: from.y }
    : { x: from.x, y: target.y };
  return simplifyDuctRoute([...path, corner, target]);
}

export function previewDuctRoute(
  path: Point[],
  target: Point,
  mode: DuctRoutingMode,
): Point[] {
  return appendDuctRoutePoint(path, target, mode);
}
