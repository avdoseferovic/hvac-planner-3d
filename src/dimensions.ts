import {
  add,
  cross,
  dist,
  dot,
  perp,
  pointInPolygon,
  scale,
  sub,
  wallDirection,
} from "./geometry";
import type { Point, Room, Wall } from "./types";

const JOIN_TOLERANCE = 2;
const PARALLEL_TOLERANCE = 1e-6;

export interface WallDimension {
  /** Endpoints on the physical wall face used as the dimension reference. */
  faceA: Point;
  faceB: Point;
  /** Unit vector pointing from the wall toward the dimension line. */
  normal: Point;
  /** Measured face length in centimeters. */
  length: number;
}

interface DimensionSide {
  normal: Point;
  /** Room that identifies the adjoining face at each corner. */
  room: Room | null;
  /** Whether adjoining references face toward or away from `room`. */
  roomFace: 1 | -1 | null;
}

/** Pick an exterior face when the wall bounds a room on only one side. */
function dimensionSide(wall: Wall, rooms: Room[]): DimensionSide {
  const direction = wallDirection(wall);
  const left = perp(direction);
  const midpoint = add(wall.a, scale(direction, dist(wall.a, wall.b) / 2));
  const probeOffset = wall.thickness / 2 + 1;
  const leftPoint = add(midpoint, scale(left, probeOffset));
  const rightPoint = add(midpoint, scale(left, -probeOffset));
  const leftRoom = rooms.find((room) => pointInPolygon(leftPoint, room.polygon));
  const rightRoom = rooms.find((room) =>
    pointInPolygon(rightPoint, room.polygon),
  );

  if (!leftRoom && !rightRoom) {
    return { normal: left, room: null, roomFace: null };
  }
  if (!leftRoom && rightRoom) {
    return { normal: left, room: rightRoom, roomFace: -1 };
  }
  if (leftRoom && !rightRoom) {
    return { normal: scale(left, -1), room: leftRoom, roomFace: -1 };
  }

  // Interior walls have rooms on both sides. Preserve the previous visual
  // preference, but retain the chosen room so their face length is measured
  // between the correct inner faces at each junction.
  return { normal: scale(left, -1), room: rightRoom!, roomFace: 1 };
}

function lineIntersectionParameter(
  origin: Point,
  direction: Point,
  otherOrigin: Point,
  otherDirection: Point,
): number | null {
  const denominator = cross(direction, otherDirection);
  if (Math.abs(denominator) < PARALLEL_TOLERANCE) return null;
  return cross(sub(otherOrigin, origin), otherDirection) / denominator;
}

function touchesEndpoint(wall: Wall, endpoint: Point): boolean {
  const direction = wallDirection(wall);
  const length = dist(wall.a, wall.b);
  if (length === 0) return false;
  const along = dot(sub(endpoint, wall.a), direction);
  const across = Math.abs(cross(sub(endpoint, wall.a), direction));
  return (
    across <= JOIN_TOLERANCE &&
    along >= -JOIN_TOLERANCE &&
    along <= length + JOIN_TOLERANCE
  );
}

/**
 * Find which face of an adjoining wall borders `room` near a junction.
 * T-junctions probe both directions because only one branch may bound the room.
 */
function adjoiningRoomFaceSign(
  wall: Wall,
  junction: Point,
  room: Room,
): 1 | -1 | null {
  const direction = wallDirection(wall);
  const normal = perp(direction);
  const length = dist(wall.a, wall.b);
  if (length === 0) return null;

  const junctionAlong = Math.max(
    0,
    Math.min(length, dot(sub(junction, wall.a), direction)),
  );
  const alongProbe = Math.min(5, length / 4);
  const faceProbe = wall.thickness / 2 + 1;

  for (const alongSign of [1, -1] as const) {
    const along = junctionAlong + alongSign * alongProbe;
    if (along < 0 || along > length) continue;
    const center = add(wall.a, scale(direction, along));
    for (const faceSign of [1, -1] as const) {
      const probe = add(center, scale(normal, faceSign * faceProbe));
      if (pointInPolygon(probe, room.polygon)) return faceSign;
    }
  }
  return null;
}

function endpointParameter(
  wall: Wall,
  walls: Wall[],
  faceOrigin: Point,
  direction: Point,
  endpoint: Point,
  fallback: number,
  end: "a" | "b",
  room: Room | null,
  roomFace: 1 | -1 | null,
): number {
  const candidates: number[] = [];

  for (const adjoining of walls) {
    if (adjoining.id === wall.id || !touchesEndpoint(adjoining, endpoint)) {
      continue;
    }

    const adjoiningDirection = wallDirection(adjoining);
    if (Math.abs(cross(direction, adjoiningDirection)) < PARALLEL_TOLERANCE) {
      continue;
    }
    const adjoiningNormal = perp(adjoiningDirection);
    const adjoiningRoomSign = room
      ? adjoiningRoomFaceSign(adjoining, endpoint, room)
      : null;
    const selectedFaceSign =
      adjoiningRoomSign && roomFace
        ? ((adjoiningRoomSign * roomFace) as 1 | -1)
        : null;
    const faceSigns = selectedFaceSign
      ? [selectedFaceSign]
      : ([1, -1] as const);

    for (const faceSign of faceSigns) {
      const adjoiningFace = add(
        adjoining.a,
        scale(adjoiningNormal, faceSign * adjoining.thickness / 2),
      );
      const parameter = lineIntersectionParameter(
        faceOrigin,
        direction,
        adjoiningFace,
        adjoiningDirection,
      );
      if (parameter !== null) candidates.push(parameter);
    }
  }

  if (candidates.length === 0) return fallback;
  if (roomFace === 1) {
    return candidates.reduce((best, candidate) =>
      Math.abs(candidate - fallback) < Math.abs(best - fallback)
        ? candidate
        : best,
    );
  }
  return end === "a" ? Math.min(...candidates) : Math.max(...candidates);
}

/**
 * Build an automatic wall dimension from the selected physical face rather
 * than from the wall centerline. Exterior corners use the outer adjoining
 * faces; interior walls use the faces bounding the chosen room.
 */
export function wallDimension(
  wall: Wall,
  walls: Wall[],
  rooms: Room[],
): WallDimension {
  const direction = wallDirection(wall);
  const centerLength = dist(wall.a, wall.b);
  const { normal, room, roomFace } = dimensionSide(wall, rooms);
  const faceOrigin = add(wall.a, scale(normal, wall.thickness / 2));
  const start = endpointParameter(
    wall,
    walls,
    faceOrigin,
    direction,
    wall.a,
    0,
    "a",
    room,
    roomFace,
  );
  const end = endpointParameter(
    wall,
    walls,
    faceOrigin,
    direction,
    wall.b,
    centerLength,
    "b",
    room,
    roomFace,
  );

  const faceA = add(faceOrigin, scale(direction, start));
  const faceB = add(faceOrigin, scale(direction, end));
  return {
    faceA,
    faceB,
    normal,
    length: Math.max(0, end - start),
  };
}
