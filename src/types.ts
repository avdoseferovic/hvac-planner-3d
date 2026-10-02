/** All lengths are in centimeters unless noted otherwise. */

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  a: Point;
  b: Point;
  /** wall thickness in cm */
  thickness: number;
  loadBearing: boolean;
}

export type OpeningType = "door" | "window";

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  /** normalized position (0..1) of the opening center along the wall a→b */
  t: number;
  width: number;
  height: number;
  /** sill height above floor (windows only) */
  sill: number;
}

/** Rooms are derived from closed wall loops; names are user-editable. */
export interface Room {
  id: string;
  /** stable key derived from the wall ids forming the loop */
  key: string;
  name: string;
  /** inner boundary polygon (cm) */
  polygon: Point[];
  /** area in cm² */
  area: number;
  centroid: Point;
  wallIds: string[];
}

// ---------------------------------------------------------------------------
// HVAC
// ---------------------------------------------------------------------------

export type HvacKind =
  | "acUnit"
  | "supplyDiffuser"
  | "returnGrille"
  | "duct"
  | "hrvUnit"
  | "extractValve"
  | "freshAirValve"
  | "jumperDuct"
  | "facadePenetration";

export interface AcUnit {
  kind: "acUnit";
  id: string;
  label: string;
  pos: Point;
  /** rotation in degrees */
  rotation: number;
  width: number;
  depth: number;
  height: number;
  airflow: number; // m³/h
}

export interface CeilingPenetrationBase {
  id: string;
  pos: Point;
  /** connection diameter in mm (125/160/200/250) */
  connDiameter: number;
  /** core-drill diameter in mm (auto = connection + 20, editable) */
  drillDiameter: number;
  /** true while the user has not overridden the auto drill diameter */
  drillAuto: boolean;
  airflow: number; // m³/h
}

export interface SupplyDiffuser extends CeilingPenetrationBase {
  kind: "supplyDiffuser";
}
export interface ReturnGrille extends CeilingPenetrationBase {
  kind: "returnGrille";
}
export interface ExtractValve extends CeilingPenetrationBase {
  kind: "extractValve";
}
export interface FreshAirValve extends CeilingPenetrationBase {
  kind: "freshAirValve";
}

export interface Duct {
  kind: "duct";
  id: string;
  /** polyline in plan (cm); runs at attic height */
  points: Point[];
  /** diameter in mm */
  diameter: number;
  insulated: boolean;
}

export interface HrvUnit {
  kind: "hrvUnit";
  id: string;
  label: string;
  pos: Point;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  nominalFlow: number; // m³/h
}

export interface JumperDuct {
  kind: "jumperDuct";
  id: string;
  /** room-side ceiling hole */
  posA: Point;
  /** hallway-side ceiling hole */
  posB: Point;
  diameter: number; // mm
  drillDiameter: number; // mm
  drillAuto: boolean;
}

export interface FacadePenetration {
  kind: "facadePenetration";
  id: string;
  wallId: string;
  /** normalized position along wall */
  t: number;
  diameter: number; // mm
  drillDiameter: number; // mm
  drillAuto: boolean;
  /** height of axis above floor (cm) */
  heightAboveFloor: number;
}

export type HvacElement =
  | AcUnit
  | SupplyDiffuser
  | ReturnGrille
  | Duct
  | HrvUnit
  | ExtractValve
  | FreshAirValve
  | JumperDuct
  | FacadePenetration;

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface ProjectSettings {
  /** snap grid in cm */
  gridSize: number;
  /** global wall height in cm */
  wallHeight: number;
  /** concrete slab thickness in cm */
  slabThickness: number;
  /** attic height above slab (ridge) in cm — used for the 3D attic volume */
  atticHeight: number;
  /** default exterior wall thickness */
  exteriorWallThickness: number;
  /** default interior wall thickness */
  interiorWallThickness: number;
  /** keep-out band width along load-bearing walls (cm) */
  keepOutWidth: number;
}

export interface Model {
  walls: Wall[];
  openings: Opening[];
  hvac: HvacElement[];
  /** user-assigned room names, keyed by stable room key */
  roomNames: Record<string, string>;
  settings: ProjectSettings;
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  gridSize: 5,
  wallHeight: 280,
  slabThickness: 20,
  atticHeight: 250,
  exteriorWallThickness: 25,
  interiorWallThickness: 14,
  keepOutWidth: 60,
};

export function emptyModel(): Model {
  return {
    walls: [],
    openings: [],
    hvac: [],
    roomNames: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

export type Tool =
  | "select"
  | "wall"
  | "door"
  | "window"
  | "measure"
  | "acUnit"
  | "supplyDiffuser"
  | "returnGrille"
  | "duct"
  | "hrvUnit"
  | "extractValve"
  | "freshAirValve"
  | "jumperDuct"
  | "facadePenetration";

export type ViewMode = "2d" | "3d";

export interface Selection {
  type: "wall" | "opening" | "room" | "hvac";
  id: string;
}
