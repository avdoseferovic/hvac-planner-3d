import { nextId } from "./store";
import { autoDrill } from "./hvac";
import type {
  AcUnit,
  Duct,
  ExtractValve,
  FacadePenetration,
  FreshAirValve,
  HrvUnit,
  JumperDuct,
  Point,
  ReturnGrille,
  SupplyDiffuser,
  Wall,
} from "./types";

// ---------------------------------------------------------------------------
// Factories (defaults per spec)
// ---------------------------------------------------------------------------

export function makeAcUnit(pos: Point, index: number): AcUnit {
  return {
    kind: "acUnit",
    id: nextId("ac"),
    label: `AC ${index}`,
    pos,
    rotation: 0,
    width: 90,
    depth: 70,
    height: 25,
    airflow: 350,
  };
}

export function makeHrvUnit(pos: Point, index: number): HrvUnit {
  return {
    kind: "hrvUnit",
    id: nextId("hrv"),
    label: `HRV ${index}`,
    pos,
    rotation: 0,
    width: 110,
    depth: 60,
    height: 30,
    nominalFlow: 350,
  };
}

export function makeSupplyDiffuser(pos: Point): SupplyDiffuser {
  return {
    kind: "supplyDiffuser",
    id: nextId("sup"),
    pos,
    connDiameter: 125,
    drillDiameter: autoDrill(125),
    drillAuto: true,
    airflow: 90,
  };
}

export function makeReturnGrille(pos: Point): ReturnGrille {
  return {
    kind: "returnGrille",
    id: nextId("ret"),
    pos,
    connDiameter: 125,
    drillDiameter: autoDrill(125),
    drillAuto: true,
    airflow: 90,
  };
}

export function makeExtractValve(pos: Point): ExtractValve {
  return {
    kind: "extractValve",
    id: nextId("ext"),
    pos,
    connDiameter: 125,
    drillDiameter: autoDrill(125),
    drillAuto: true,
    airflow: 50,
  };
}

export function makeFreshAirValve(pos: Point): FreshAirValve {
  return {
    kind: "freshAirValve",
    id: nextId("fre"),
    pos,
    connDiameter: 160,
    drillDiameter: autoDrill(160),
    drillAuto: true,
    airflow: 100,
  };
}

export function makeJumperDuct(posA: Point, posB: Point): JumperDuct {
  return {
    kind: "jumperDuct",
    id: nextId("jmp"),
    posA,
    posB,
    diameter: 160,
    drillDiameter: autoDrill(160),
    drillAuto: true,
  };
}

export function makeDuct(points: Point[]): Duct {
  return {
    kind: "duct",
    id: nextId("duct"),
    points,
    diameter: 160,
    insulated: false,
  };
}

export function makeFacadePenetration(
  wall: Wall,
  t: number,
): FacadePenetration {
  return {
    kind: "facadePenetration",
    id: nextId("fac"),
    wallId: wall.id,
    t,
    diameter: 160,
    drillDiameter: autoDrill(160),
    drillAuto: true,
    heightAboveFloor: 220,
  };
}

