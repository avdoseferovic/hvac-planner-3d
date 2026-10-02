import { resolveDuctConnection, resolveDuctPoints } from "./hvac";
import type {
  Duct,
  DuctConnection,
  HvacElement,
  Point,
  ProjectSettings,
  Wall,
} from "./types";

export interface RoutePoint3D {
  x: number;
  y: number;
  z: number;
}

const M = 1 / 100;

function connectionHeight(
  connection: DuctConnection | undefined,
  hvac: HvacElement[],
  settings: ProjectSettings,
): number | null {
  if (!connection) return null;
  const el = hvac.find((candidate) => candidate.id === connection.elementId);
  if (!el) return null;
  const ceiling = settings.wallHeight;
  const slabTop = ceiling + settings.slabThickness;
  switch (el.kind) {
    case "acUnit":
    case "hrvUnit":
      return slabTop + el.height / 2;
    case "facadePenetration":
      return el.heightAboveFloor;
    case "supplyDiffuser":
    case "returnGrille":
    case "extractValve":
    case "freshAirValve":
    case "jumperDuct":
      return ceiling;
    case "duct":
      return null;
  }
}

function at(point: Point, height: number): RoutePoint3D {
  return { x: point.x * M, y: height * M, z: point.y * M };
}

/**
 * Build an explicit route profile. Connected ends include a side/vertical
 * connector from the equipment or ceiling port to the shared attic run.
 */
export function buildDuctRoute3D(
  duct: Duct,
  hvac: HvacElement[],
  walls: Wall[],
  settings: ProjectSettings,
): RoutePoint3D[] {
  const plan = resolveDuctPoints(duct, hvac, walls);
  if (plan.length < 2) return [];

  const atticHeight =
    settings.wallHeight + settings.slabThickness + 30;
  const startTarget = resolveDuctConnection(
    duct.startConnection,
    hvac,
    walls,
  );
  const endTarget = resolveDuctConnection(duct.endConnection, hvac, walls);
  const startHeight = startTarget
    ? connectionHeight(duct.startConnection, hvac, settings)
    : null;
  const endHeight = endTarget
    ? connectionHeight(duct.endConnection, hvac, settings)
    : null;
  const route: RoutePoint3D[] = [];

  const push = (point: RoutePoint3D) => {
    const previous = route[route.length - 1];
    if (
      !previous ||
      previous.x !== point.x ||
      previous.y !== point.y ||
      previous.z !== point.z
    ) {
      route.push(point);
    }
  };

  if (startHeight !== null) push(at(plan[0], startHeight));
  for (const point of plan) push(at(point, atticHeight));
  if (endHeight !== null) push(at(plan[plan.length - 1], endHeight));

  return route;
}
