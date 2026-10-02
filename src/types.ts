/** All lengths are in centimeters unless noted otherwise. */

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  /** owning floor; absent only in legacy project files */
  storyId?: string;
  a: Point;
  b: Point;
  /** wall thickness in cm */
  thickness: number;
  loadBearing: boolean;
  /** elements sharing a groupId select and move as one unit */
  groupId?: string;
}

export type OpeningType = "door" | "window";

/** Door hinge jamb, seen along the wall a→b direction. */
export type DoorHinge = "left" | "right";
/** Which side of the wall the door leaf swings into ("in" = wall perp side). */
export type DoorSwing = "in" | "out";
/** Visual/construction type for door openings; missing means legacy swing door. */
export type DoorKind = "swing" | "garageRoller";

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
  /** windows only; W/(m²·K), absent = project glazing default */
  uValue?: number;
  /** windows only; solar heat gain coefficient, absent = project default */
  shgc?: number;
  /** friendly UI choice; numeric overrides above remain authoritative */
  glazing?: "project" | "single" | "double" | "triple";
  /** doors only; absent = "left" (kept optional for older project files) */
  hinge?: DoorHinge;
  /** doors only; absent = "in" */
  swing?: DoorSwing;
  /** doors only; absent = standard hinged door for legacy projects */
  doorKind?: DoorKind;
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
  /** exact wall-centerline segments forming this room's boundary */
  boundaries: RoomBoundary[];
}

export interface RoomBoundary {
  wallId: string;
  a: Point;
  b: Point;
  thickness: number;
}

// ---------------------------------------------------------------------------
// HVAC
// ---------------------------------------------------------------------------

export interface StoryOwned {
  /** owning floor; absent only in legacy project files */
  storyId?: string;
}

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

export interface AcUnit extends StoryOwned {
  kind: "acUnit";
  id: string;
  groupId?: string;
  label: string;
  pos: Point;
  /** rotation in degrees */
  rotation: number;
  width: number;
  depth: number;
  height: number;
  airflow: number; // m³/h
}

export interface CeilingPenetrationBase extends StoryOwned {
  id: string;
  groupId?: string;
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

export interface Duct extends StoryOwned {
  kind: "duct";
  id: string;
  groupId?: string;
  /** polyline in plan (cm); runs at attic height */
  points: Point[];
  /** persistent binding from the first route point to a physical HVAC port */
  startConnection?: DuctConnection;
  /** persistent binding from the last route point to a physical HVAC port */
  endConnection?: DuctConnection;
  /** diameter in mm */
  diameter: number;
  insulated: boolean;
}

export type DuctPortId =
  | "center"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "a"
  | "b";

export interface DuctConnection {
  elementId: string;
  portId: DuctPortId;
}

export interface HrvUnit extends StoryOwned {
  kind: "hrvUnit";
  id: string;
  groupId?: string;
  label: string;
  pos: Point;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  nominalFlow: number; // m³/h
}

export interface JumperDuct extends StoryOwned {
  kind: "jumperDuct";
  id: string;
  groupId?: string;
  /** room-side ceiling hole */
  posA: Point;
  /** hallway-side ceiling hole */
  posB: Point;
  diameter: number; // mm
  drillDiameter: number; // mm
  drillAuto: boolean;
}

export interface FacadePenetration extends StoryOwned {
  kind: "facadePenetration";
  id: string;
  groupId?: string;
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

export interface Story {
  id: string;
  name: string;
  /** finished-floor elevation above the project datum (cm) */
  elevation: number;
}

export type InsulationPreset = "basic" | "standard" | "highPerformance";

export interface EnvelopeSettings {
  preset: InsulationPreset;
  /** opaque exterior wall transmittance, W/(m²·K) */
  wallUValue: number;
  /** top-floor roof/ceiling transmittance, W/(m²·K) */
  roofUValue: number;
  /** ground-floor transmittance, W/(m²·K) */
  floorUValue: number;
  /** default window transmittance, W/(m²·K) */
  windowUValue: number;
  /** default solar heat gain coefficient (0–1) */
  windowShgc: number;
  /** design air changes per hour */
  airChangesPerHour: number;
}

export interface ThermalSettings {
  envelope: EnvelopeSettings;
  indoorHeatingC: number;
  outdoorWinterC: number;
  indoorCoolingC: number;
  outdoorSummerC: number;
  /** total expected occupants; gains are distributed by room area */
  occupants: number;
  /** clockwise plan rotation of north; 0° means the top of the canvas */
  northAngleDeg: number;
}

export type RoofType = "pitched" | "flat" | "metalFlat";

export interface ProjectSettings {
  /** snap grid in cm */
  gridSize: number;
  /** global wall height in cm */
  wallHeight: number;
  /** concrete slab thickness in cm */
  slabThickness: number;
  /** attic height above slab (ridge) in cm — used for the 3D attic volume */
  atticHeight: number;
  /** construction profile used by the synchronized 3D roof */
  roofType: RoofType;
  /** default exterior wall thickness */
  exteriorWallThickness: number;
  /** default interior wall thickness */
  interiorWallThickness: number;
  /** keep-out band width along load-bearing walls (cm) */
  keepOutWidth: number;
}

export interface Model {
  stories: Story[];
  walls: Wall[];
  openings: Opening[];
  hvac: HvacElement[];
  /** user-assigned room names, keyed by stable room key */
  roomNames: Record<string, string>;
  /** false means the room is excluded from heating/cooling equipment sizing */
  roomConditioning: Record<string, boolean>;
  settings: ProjectSettings;
  thermal: ThermalSettings;
}

export const DEFAULT_STORY_ID = "story-ground";

export const DEFAULT_SETTINGS: ProjectSettings = {
  gridSize: 5,
  wallHeight: 280,
  slabThickness: 20,
  atticHeight: 250,
  roofType: "pitched",
  exteriorWallThickness: 25,
  interiorWallThickness: 14,
  keepOutWidth: 60,
};

export const DEFAULT_THERMAL_SETTINGS: ThermalSettings = {
  envelope: {
    preset: "standard",
    wallUValue: 0.35,
    roofUValue: 0.24,
    floorUValue: 0.3,
    windowUValue: 1.4,
    windowShgc: 0.5,
    airChangesPerHour: 0.5,
  },
  indoorHeatingC: 21,
  outdoorWinterC: -12,
  indoorCoolingC: 24,
  outdoorSummerC: 34,
  occupants: 4,
  northAngleDeg: 0,
};

export function emptyModel(): Model {
  return {
    stories: [
      {
        id: DEFAULT_STORY_ID,
        name: "Ground floor",
        elevation: 0,
      },
    ],
    walls: [],
    openings: [],
    hvac: [],
    roomNames: {},
    roomConditioning: {},
    settings: { ...DEFAULT_SETTINGS },
    thermal: {
      ...DEFAULT_THERMAL_SETTINGS,
      envelope: { ...DEFAULT_THERMAL_SETTINGS.envelope },
    },
  };
}

export type Tool =
  | "select"
  | "wall"
  | "cutWall"
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
