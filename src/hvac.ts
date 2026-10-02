import { add, closestT, dist, distToSegment, lerp, sub } from "./geometry";
import type {
  AcUnit,
  Duct,
  DuctConnection,
  DuctPortId,
  FacadePenetration,
  HrvUnit,
  HvacElement,
  Point,
  Wall,
} from "./types";

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

export interface DuctConnectionTarget {
  connection: DuctConnection;
  point: Point;
  kind: HvacElement["kind"];
}

type Unit = AcUnit | HrvUnit;

/** Physical plan position of a named unit-side connection port. */
export function unitPortPoint(unit: Unit, portId: DuctPortId): Point {
  const local =
    portId === "left"
      ? { x: -unit.width / 2, y: 0 }
      : portId === "right"
        ? { x: unit.width / 2, y: 0 }
        : portId === "top"
          ? { x: 0, y: -unit.depth / 2 }
          : portId === "bottom"
            ? { x: 0, y: unit.depth / 2 }
            : { x: 0, y: 0 };
  const rad = (unit.rotation * Math.PI) / 180;
  return {
    x: unit.pos.x + local.x * Math.cos(rad) - local.y * Math.sin(rad),
    y: unit.pos.y + local.x * Math.sin(rad) + local.y * Math.cos(rad),
  };
}

/**
 * Physical targets where a duct endpoint can bind. Units expose named side
 * ports; vents and penetrations expose their actual connection centers.
 */
export function ductConnectionTargets(
  hvac: HvacElement[],
  walls: Wall[],
): DuctConnectionTarget[] {
  const targets: DuctConnectionTarget[] = [];
  const push = (
    el: HvacElement,
    portId: DuctPortId,
    point: Point | null,
  ) => {
    if (!point) return;
    targets.push({
      connection: { elementId: el.id, portId },
      point: { ...point },
      kind: el.kind,
    });
  };

  for (const el of hvac) {
    switch (el.kind) {
      case "acUnit":
      case "hrvUnit": {
        for (const portId of ["left", "right", "top", "bottom"] as const) {
          push(el, portId, unitPortPoint(el, portId));
        }
        break;
      }
      case "supplyDiffuser":
      case "returnGrille":
      case "extractValve":
      case "freshAirValve":
        push(el, "center", el.pos);
        break;
      case "jumperDuct":
        push(el, "a", el.posA);
        push(el, "b", el.posB);
        break;
      case "facadePenetration": {
        push(el, "center", facadePos(el, walls));
        break;
      }
      case "duct":
        break;
    }
  }
  return targets;
}

/** Points where a duct endpoint may snap (backward-compatible geometry API). */
export function ductSnapPoints(hvac: HvacElement[], walls: Wall[]): Point[] {
  return ductConnectionTargets(hvac, walls).map((target) => target.point);
}

export function findDuctConnectionTarget(
  point: Point,
  hvac: HvacElement[],
  walls: Wall[],
  tolerance: number,
): DuctConnectionTarget | null {
  let best: DuctConnectionTarget | null = null;
  let bestDistance = tolerance;
  for (const target of ductConnectionTargets(hvac, walls)) {
    const distance = dist(point, target.point);
    if (distance <= bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  if (best) return best;

  // A user will naturally click the equipment body, not its tiny edge port.
  // Treat that as an explicit connection intent and choose the nearest port.
  for (let index = hvac.length - 1; index >= 0; index--) {
    const el = hvac[index];
    if (el.kind !== "acUnit" && el.kind !== "hrvUnit") continue;
    const rad = (el.rotation * Math.PI) / 180;
    const offset = sub(point, el.pos);
    const local = {
      x: offset.x * Math.cos(-rad) - offset.y * Math.sin(-rad),
      y: offset.x * Math.sin(-rad) + offset.y * Math.cos(-rad),
    };
    if (
      Math.abs(local.x) > el.width / 2 ||
      Math.abs(local.y) > el.depth / 2
    ) {
      continue;
    }
    const ports = ductConnectionTargets([el], walls);
    ports.sort(
      (left, right) =>
        dist(point, left.point) - dist(point, right.point),
    );
    return ports[0] ?? null;
  }
  return best;
}

export function resolveDuctConnection(
  connection: DuctConnection | undefined,
  hvac: HvacElement[],
  walls: Wall[],
): DuctConnectionTarget | null {
  if (!connection) return null;
  return (
    ductConnectionTargets(hvac, walls).find(
      (target) =>
        target.connection.elementId === connection.elementId &&
        target.connection.portId === connection.portId,
    ) ?? null
  );
}

/** Bind route endpoints to exact/nearby physical ports after drawing. */
export function connectDuctEndpoints(
  duct: Duct,
  hvac: HvacElement[],
  walls: Wall[],
  tolerance = 1,
): void {
  if (duct.points.length < 2) return;
  const start = findDuctConnectionTarget(
    duct.points[0],
    hvac,
    walls,
    tolerance,
  );
  const end = findDuctConnectionTarget(
    duct.points[duct.points.length - 1],
    hvac,
    walls,
    tolerance,
  );
  if (start) duct.startConnection = { ...start.connection };
  else delete duct.startConnection;
  if (end) duct.endConnection = { ...end.connection };
  else delete duct.endConnection;
}

/** Route points with bound endpoints resolved against the live equipment. */
export function resolveDuctPoints(
  duct: Duct,
  hvac: HvacElement[],
  walls: Wall[],
): Point[] {
  const points = duct.points.map((point) => ({ ...point }));
  if (points.length === 0) return points;
  const start = resolveDuctConnection(duct.startConnection, hvac, walls);
  const end = resolveDuctConnection(duct.endConnection, hvac, walls);
  if (start) points[0] = { ...start.point };
  if (end) points[points.length - 1] = { ...end.point };
  return points;
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
        const points = resolveDuctPoints(el, hvac, walls);
        for (let v = 0; v < points.length; v++) {
          if (dist(p, points[v]) <= mm(el.diameter) / 2 + tol) {
            return { el, part: `vertex:${v}` };
          }
        }
        for (let s = 0; s < points.length - 1; s++) {
          if (
            distToSegment(p, points[s], points[s + 1]) <=
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
