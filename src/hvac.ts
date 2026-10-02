import { add, closestT, dist, distToSegment, lerp, sub } from "./geometry";
import type { FacadePenetration, HvacElement, Point, Wall } from "./types";

export const CONNECTION_DIAMETERS = [125, 160, 200, 250] as const;

/** Auto core-drill diameter: connection + 20 mm. */
export function autoDrill(connDiameter: number): number {
  return connDiameter + 20;
}

/** mm → cm */
export const mm = (v: number): number => v / 10;

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Points where a duct endpoint may snap: unit connections and all penetrations. */
export function ductSnapPoints(hvac: HvacElement[], walls: Wall[]): Point[] {
  const pts: Point[] = [];
  for (const el of hvac) {
    switch (el.kind) {
      case "acUnit":
      case "hrvUnit":
        pts.push(el.pos);
        break;
      case "supplyDiffuser":
      case "returnGrille":
      case "extractValve":
      case "freshAirValve":
        pts.push(el.pos);
        break;
      case "jumperDuct":
        pts.push(el.posA, el.posB);
        break;
      case "facadePenetration": {
        const wall = walls.find((w) => w.id === el.wallId);
        if (wall) pts.push(lerp(wall.a, wall.b, el.t));
        break;
      }
      case "duct":
        break;
    }
  }
  return pts;
}

/** Position of a facade penetration in plan coordinates. */
export function facadePos(el: FacadePenetration, walls: Wall[]): Point | null {
  const wall = walls.find((w) => w.id === el.wallId);
  return wall ? lerp(wall.a, wall.b, el.t) : null;
}

export type HvacHitPart = "body" | "posA" | "posB" | `vertex:${number}`;

export interface HvacHit {
  el: HvacElement;
  part: HvacHitPart;
}

/**
 * Hit-test HVAC elements. Ducts render below the other symbols, so they are
 * tested last; within a class, the last-placed element wins.
 */
export function hitTestHvac(
  hvac: HvacElement[],
  walls: Wall[],
  p: Point,
  tol: number,
): HvacHit | null {
  // iteration runs back-to-front, so ducts (bottom of the stack) go first
  const ordered = [
    ...hvac.filter((h) => h.kind === "duct"),
    ...hvac.filter((h) => h.kind !== "duct"),
  ];
  for (let i = ordered.length - 1; i >= 0; i--) {
    const el = ordered[i];
    switch (el.kind) {
      case "acUnit":
      case "hrvUnit": {
        // rotated rect test: transform p into unit local coords
        const rad = (el.rotation * Math.PI) / 180;
        const d = sub(p, el.pos);
        const lx = d.x * Math.cos(-rad) - d.y * Math.sin(-rad);
        const ly = d.x * Math.sin(-rad) + d.y * Math.cos(-rad);
        if (
          Math.abs(lx) <= el.width / 2 + tol &&
          Math.abs(ly) <= el.depth / 2 + tol
        ) {
          return { el, part: "body" };
        }
        break;
      }
      case "supplyDiffuser":
      case "returnGrille":
      case "extractValve":
      case "freshAirValve": {
        if (dist(p, el.pos) <= mm(el.drillDiameter) / 2 + tol)
          return { el, part: "body" };
        break;
      }
      case "jumperDuct": {
        if (dist(p, el.posA) <= mm(el.drillDiameter) / 2 + tol)
          return { el, part: "posA" };
        if (dist(p, el.posB) <= mm(el.drillDiameter) / 2 + tol)
          return { el, part: "posB" };
        if (distToSegment(p, el.posA, el.posB) <= mm(el.diameter) / 2 + tol) {
          return { el, part: "body" };
        }
        break;
      }
      case "duct": {
        for (let v = 0; v < el.points.length; v++) {
          if (dist(p, el.points[v]) <= mm(el.diameter) / 2 + tol) {
            return { el, part: `vertex:${v}` };
          }
        }
        for (let s = 0; s < el.points.length - 1; s++) {
          if (
            distToSegment(p, el.points[s], el.points[s + 1]) <=
            mm(el.diameter) / 2 + tol
          ) {
            return { el, part: "body" };
          }
        }
        break;
      }
      case "facadePenetration": {
        const pos = facadePos(el, walls);
        if (pos && dist(p, pos) <= mm(el.drillDiameter) / 2 + tol)
          return { el, part: "body" };
        break;
      }
    }
  }
  return null;
}

/** Move an element (or one of its parts). Mutates the given element in place. */
export function moveHvac(
  el: HvacElement,
  part: HvacHitPart,
  delta: Point,
  target: Point,
  walls: Wall[],
): void {
  switch (el.kind) {
    case "acUnit":
    case "hrvUnit":
    case "supplyDiffuser":
    case "returnGrille":
    case "extractValve":
    case "freshAirValve":
      el.pos = add(el.pos, delta);
      break;
    case "jumperDuct":
      if (part === "posA") el.posA = target;
      else if (part === "posB") el.posB = target;
      else {
        el.posA = add(el.posA, delta);
        el.posB = add(el.posB, delta);
      }
      break;
    case "duct":
      if (part.startsWith("vertex:")) {
        const i = Number(part.slice(7));
        if (el.points[i]) el.points[i] = target;
      } else {
        el.points = el.points.map((pt) => add(pt, delta));
      }
      break;
    case "facadePenetration": {
      const wall = walls.find((w) => w.id === el.wallId);
      if (wall) el.t = closestT(wall.a, wall.b, target);
      break;
    }
  }
}

/** True for elements that pierce the ceiling slab (used by the schedule). */
export function isCeilingPenetration(el: HvacElement): boolean {
  return (
    el.kind === "supplyDiffuser" ||
    el.kind === "returnGrille" ||
    el.kind === "extractValve" ||
    el.kind === "freshAirValve" ||
    el.kind === "jumperDuct"
  );
}

/** Re-derive drill diameter after a connection change, respecting manual override. */
export function updateConnDiameter(
  el: { connDiameter: number; drillDiameter: number; drillAuto: boolean },
  conn: number,
): void {
  el.connDiameter = conn;
  if (el.drillAuto) el.drillDiameter = autoDrill(conn);
}
