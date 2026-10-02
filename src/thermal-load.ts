import { dist, distToSegment } from "./geometry";
import { openingCenter } from "./openings";
import { detectRooms } from "./rooms";
import { modelForStory } from "./stories";
import type {
  EnvelopeSettings,
  InsulationPreset,
  Model,
  Opening,
  Room,
  Story,
  Wall,
} from "./types";

const STANDARD_CAPACITIES_KW = [2.5, 3.5, 5, 7, 9, 12, 14, 16];
const AIR_HEAT_CAPACITY = 0.33; // W·h/(m³·K)
const BLENDED_SOLAR_W_M2 = 180;
const SIZING_MARGIN = 1.1;

export function envelopeForPreset(
  preset: InsulationPreset,
): EnvelopeSettings {
  if (preset === "basic") {
    return {
      preset,
      wallUValue: 1.2,
      roofUValue: 0.8,
      floorUValue: 0.7,
      windowUValue: 2.8,
      windowShgc: 0.65,
      airChangesPerHour: 0.9,
    };
  }
  if (preset === "highPerformance") {
    return {
      preset,
      wallUValue: 0.18,
      roofUValue: 0.13,
      floorUValue: 0.2,
      windowUValue: 0.9,
      windowShgc: 0.42,
      airChangesPerHour: 0.3,
    };
  }
  return {
    preset,
    wallUValue: 0.35,
    roofUValue: 0.24,
    floorUValue: 0.3,
    windowUValue: 1.4,
    windowShgc: 0.5,
    airChangesPerHour: 0.5,
  };
}

export interface LoadBreakdown {
  /** heating-design transmission through opaque walls */
  wallWatts: number;
  /** heating-design transmission through windows and doors */
  windowWatts: number;
  roofWatts: number;
  floorWatts: number;
  /** heating-design infiltration / outdoor-air load */
  airWatts: number;
  /** cooling-only blended peak solar gain */
  solarWatts: number;
  /** cooling-only people and plug/load allowance */
  internalWatts: number;
}

export interface RoomLoad {
  storyId: string;
  storyName: string;
  roomKey: string;
  roomName: string;
  areaM2: number;
  conditioned: boolean;
  heatingWatts: number;
  coolingWatts: number;
  recommendedCapacityKw: number;
  breakdown: LoadBreakdown;
}

export interface HeatLoadSummary {
  heatingKw: number;
  coolingKw: number;
  designKw: number;
  recommendedCapacityKw: number;
  rooms: RoomLoad[];
  warnings: string[];
}

function standardCapacity(loadKw: number): number {
  if (loadKw <= 0) return 0;
  const target = Math.max(0, loadKw) * SIZING_MARGIN;
  return (
    STANDARD_CAPACITIES_KW.find((capacity) => capacity >= target) ??
    Math.ceil(target * 2) / 2
  );
}

function boundaryKey(
  boundary: Room["boundaries"][number],
): string {
  const pointKey = (point: { x: number; y: number }) =>
    `${Math.round(point.x * 10)},${Math.round(point.y * 10)}`;
  const ends = [pointKey(boundary.a), pointKey(boundary.b)].sort();
  return `${boundary.wallId}:${ends[0]}:${ends[1]}`;
}

function roomBoundaryCounts(rooms: Room[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const room of rooms) {
    for (const boundary of room.boundaries) {
      const key = boundaryKey(boundary);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function openingAreaM2(opening: Opening): number {
  return (opening.width * opening.height) / 10_000;
}

function openingUValue(
  opening: Opening,
  defaultWindowUValue: number,
): number {
  if (opening.type === "door") return 2;
  return opening.uValue ?? defaultWindowUValue;
}

function solarOrientationFactor(
  wall: Wall | undefined,
  room: Room,
  northAngleDeg: number,
): number {
  if (!wall) return 0.75;
  const midpoint = {
    x: (wall.a.x + wall.b.x) / 2,
    y: (wall.a.y + wall.b.y) / 2,
  };
  // The room centroid lies inside; the vector away from it points outdoors.
  const dx = midpoint.x - room.centroid.x;
  const dy = midpoint.y - room.centroid.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return 0.75;
  const outward = { x: dx / length, y: dy / length };
  const angle = (northAngleDeg * Math.PI) / 180;
  const north = { x: Math.sin(angle), y: -Math.cos(angle) };
  const east = { x: Math.cos(angle), y: Math.sin(angle) };
  const candidates = [
    { dot: outward.x * north.x + outward.y * north.y, factor: 0.35 },
    { dot: outward.x * east.x + outward.y * east.y, factor: 0.85 },
    { dot: -(outward.x * north.x + outward.y * north.y), factor: 1 },
    { dot: -(outward.x * east.x + outward.y * east.y), factor: 1.05 },
  ];
  candidates.sort((a, b) => b.dot - a.dot);
  return candidates[0].factor;
}

interface StoryContext {
  story: Story;
  storyIndex: number;
  storyCount: number;
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  boundaryCounts: Map<string, number>;
  openingRoomKeys: Map<string, string>;
}

function roomLoad(
  model: Model,
  room: Room,
  context: StoryContext,
  totalAreaM2: number,
): RoomLoad {
  const { envelope } = model.thermal;
  const heatDelta = Math.max(
    0,
    model.thermal.indoorHeatingC - model.thermal.outdoorWinterC,
  );
  const coolDelta = Math.max(
    0,
    model.thermal.outdoorSummerC - model.thermal.indoorCoolingC,
  );
  const heightM = model.settings.wallHeight / 100;
  const areaM2 = room.area / 10_000;
  const conditioned = model.roomConditioning[room.key] !== false;
  const volumeM3 = areaM2 * heightM;
  const wallsById = new Map(context.walls.map((wall) => [wall.id, wall]));
  const exteriorBoundaries = room.boundaries.filter(
    (boundary) => context.boundaryCounts.get(boundaryKey(boundary)) === 1,
  );
  const exteriorWallIds = new Set(
    exteriorBoundaries.map((boundary) => boundary.wallId),
  );
  const exteriorOpenings = context.openings.filter((opening) =>
    exteriorWallIds.has(opening.wallId) &&
    context.openingRoomKeys.get(opening.id) === room.key,
  );
  const openingsArea = exteriorOpenings.reduce(
    (sum, opening) => sum + openingAreaM2(opening),
    0,
  );
  const grossWallArea = exteriorBoundaries.reduce((sum, boundary) => {
    return sum + (dist(boundary.a, boundary.b) / 100) * heightM;
  }, 0);
  const opaqueWallArea = Math.max(0, grossWallArea - openingsArea);
  const openingConductance = exteriorOpenings.reduce(
    (sum, opening) =>
      sum +
      openingAreaM2(opening) *
        openingUValue(opening, envelope.windowUValue),
    0,
  );
  const solarWatts = exteriorOpenings.reduce((sum, opening) => {
    if (opening.type !== "window") return sum;
    return (
      sum +
      openingAreaM2(opening) *
        (opening.shgc ?? envelope.windowShgc) *
        BLENDED_SOLAR_W_M2 *
        solarOrientationFactor(
          wallsById.get(opening.wallId),
          room,
          model.thermal.northAngleDeg,
        )
    );
  }, 0);

  const wallConductance = opaqueWallArea * envelope.wallUValue;
  const roofConductance =
    context.storyIndex === context.storyCount - 1
      ? areaM2 * envelope.roofUValue
      : 0;
  const floorConductance =
    context.storyIndex === 0 ? areaM2 * envelope.floorUValue : 0;
  const airHeat =
    AIR_HEAT_CAPACITY *
    envelope.airChangesPerHour *
    volumeM3 *
    heatDelta;
  const airCool =
    AIR_HEAT_CAPACITY *
    envelope.airChangesPerHour *
    volumeM3 *
    coolDelta;
  const occupantShare =
    conditioned && totalAreaM2 > 0
      ? model.thermal.occupants * (areaM2 / totalAreaM2)
      : 0;
  const internalWatts = areaM2 * 3 + occupantShare * 75;

  const breakdown: LoadBreakdown = {
    wallWatts: wallConductance * heatDelta,
    windowWatts: openingConductance * heatDelta,
    roofWatts: roofConductance * heatDelta,
    floorWatts: floorConductance * heatDelta,
    airWatts: airHeat,
    solarWatts,
    internalWatts,
  };
  const heatingWatts =
    breakdown.wallWatts +
    breakdown.windowWatts +
    breakdown.roofWatts +
    breakdown.floorWatts +
    breakdown.airWatts;
  const coolingWatts =
    (wallConductance +
      openingConductance +
      roofConductance +
      floorConductance) *
      coolDelta +
    airCool +
    solarWatts +
    internalWatts;

  return {
    storyId: context.story.id,
    storyName: context.story.name,
    roomKey: room.key,
    roomName: room.name,
    areaM2,
    conditioned,
    heatingWatts,
    coolingWatts,
    recommendedCapacityKw: conditioned
      ? standardCapacity(Math.max(heatingWatts, coolingWatts) / 1000)
      : 0,
    breakdown,
  };
}

export function calculateHeatLoads(model: Model): HeatLoadSummary {
  const orderedStories = [...model.stories].sort(
    (a, b) => a.elevation - b.elevation,
  );
  const contexts: StoryContext[] = orderedStories.map((story, storyIndex) => {
    const storyModel = modelForStory(model, story.id);
    const rooms = detectRooms(storyModel.walls, model.roomNames, "Room");
    const openingRoomKeys = new Map<string, string>();
    const wallsById = new Map(storyModel.walls.map((wall) => [wall.id, wall]));
    for (const opening of storyModel.openings) {
      const wall = wallsById.get(opening.wallId);
      if (!wall) continue;
      const center = openingCenter(wall, opening);
      const candidates = rooms.flatMap((room) =>
        room.boundaries
          .filter((boundary) => boundary.wallId === opening.wallId)
          .map((boundary) => ({
            roomKey: room.key,
            distance: distToSegment(center, boundary.a, boundary.b),
          })),
      );
      candidates.sort((a, b) => a.distance - b.distance);
      if (candidates[0]) openingRoomKeys.set(opening.id, candidates[0].roomKey);
    }
    return {
      story,
      storyIndex,
      storyCount: orderedStories.length,
      rooms,
      walls: storyModel.walls,
      openings: storyModel.openings,
      boundaryCounts: roomBoundaryCounts(rooms),
      openingRoomKeys,
    };
  });
  const totalAreaM2 = contexts.reduce(
    (sum, context) =>
      sum +
      context.rooms.reduce(
        (area, room) =>
          area +
          (model.roomConditioning[room.key] === false
            ? 0
            : room.area / 10_000),
        0,
      ),
    0,
  );
  const rooms = contexts.flatMap((context) =>
    context.rooms.map((room) => roomLoad(model, room, context, totalAreaM2)),
  );
  const conditionedRooms = rooms.filter((room) => room.conditioned);
  const heatingKw =
    conditionedRooms.reduce((sum, room) => sum + room.heatingWatts, 0) / 1000;
  const coolingKw =
    conditionedRooms.reduce((sum, room) => sum + room.coolingWatts, 0) / 1000;
  const designKw = Math.max(heatingKw, coolingKw);
  const warnings: string[] = [];
  if (rooms.length === 0) {
    warnings.push("Draw closed rooms before sizing equipment.");
  }
  if (model.openings.every((opening) => opening.type !== "window")) {
    warnings.push("No windows are in the model; solar and glazing loads are zero.");
  }
  return {
    heatingKw,
    coolingKw,
    designKw,
    recommendedCapacityKw: standardCapacity(designKw),
    rooms,
    warnings,
  };
}
