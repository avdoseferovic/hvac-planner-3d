import { add, dist, distToSegment } from "./geometry";
import type { Point, Wall } from "./types";

export const WALL_JOINT_TOLERANCE = 2;
export const WALL_MOVE_INCREMENT = 1;

export type WallEnd = "a" | "b";

interface EndpointSnapshot {
  wallId: string;
  end: WallEnd;
  point: Point;
}

export interface WallMoveSnapshot {
  wallId: string;
  wall: Wall;
  attached: EndpointSnapshot[];
}

export interface EndpointMoveSnapshot {
  endpoints: EndpointSnapshot[];
}

export interface WallJoint {
  point: Point;
  connections: number;
}

export interface WallStructureAnalysis {
  joints: WallJoint[];
  openEnds: Point[];
}

/** True when a new wall endpoint lands on an existing structural centerline. */
export function isWallConnectionPoint(
  point: Point,
  walls: Wall[],
  tolerance = WALL_JOINT_TOLERANCE,
): boolean {
  return walls.some(
    (wall) => distToSegment(point, wall.a, wall.b) <= tolerance,
  );
}

/** Wall dragging is intentionally finer than the drawing grid. */
export function snapWallMoveDelta(
  raw: Point,
  fine: boolean,
  increment = WALL_MOVE_INCREMENT,
): Point {
  if (fine || increment <= 0) return { ...raw };
  return {
    x: Math.round(raw.x / increment) * increment,
    y: Math.round(raw.y / increment) * increment,
  };
}

/** Capture the selected wall and every foreign endpoint attached to its span. */
export function captureWallMove(
  walls: Wall[],
  wallId: string,
  tolerance = WALL_JOINT_TOLERANCE,
): WallMoveSnapshot {
  const wall = walls.find((candidate) => candidate.id === wallId);
  if (!wall) throw new Error(`Unknown wall: ${wallId}`);

  const attached: EndpointSnapshot[] = [];
  for (const candidate of walls) {
    if (candidate.id === wallId) continue;
    for (const end of ["a", "b"] as const) {
      if (distToSegment(candidate[end], wall.a, wall.b) <= tolerance) {
        attached.push({
          wallId: candidate.id,
          end,
          point: { ...candidate[end] },
        });
      }
    }
  }
  return { wallId, wall: structuredClone(wall), attached };
}

/** Apply a wall-body move from its captured origin, preserving every joint. */
export function applyWallMove(
  walls: Wall[],
  snapshot: WallMoveSnapshot,
  delta: Point,
): void {
  const wall = walls.find((candidate) => candidate.id === snapshot.wallId);
  if (!wall) return;
  wall.a = add(snapshot.wall.a, delta);
  wall.b = add(snapshot.wall.b, delta);

  for (const attached of snapshot.attached) {
    const candidate = walls.find((item) => item.id === attached.wallId);
    if (candidate) candidate[attached.end] = add(attached.point, delta);
  }
}

/** Capture every endpoint that participates in the same corner joint. */
export function captureEndpointMove(
  walls: Wall[],
  wallId: string,
  end: WallEnd,
  tolerance = WALL_JOINT_TOLERANCE,
): EndpointMoveSnapshot {
  const wall = walls.find((candidate) => candidate.id === wallId);
  if (!wall) throw new Error(`Unknown wall: ${wallId}`);
  const origin = wall[end];
  const endpoints: EndpointSnapshot[] = [];
  for (const candidate of walls) {
    for (const candidateEnd of ["a", "b"] as const) {
      if (dist(candidate[candidateEnd], origin) <= tolerance) {
        endpoints.push({
          wallId: candidate.id,
          end: candidateEnd,
          point: { ...candidate[candidateEnd] },
        });
      }
    }
  }
  return { endpoints };
}

/** Move every endpoint in a captured corner to the exact same target. */
export function applyEndpointMove(
  walls: Wall[],
  snapshot: EndpointMoveSnapshot,
  target: Point,
): void {
  for (const endpoint of snapshot.endpoints) {
    const wall = walls.find((candidate) => candidate.id === endpoint.wallId);
    if (wall) wall[endpoint.end] = { ...target };
  }
}

/**
 * Report open endpoints and real junctions. An endpoint landing on the middle
 * of another wall counts as connected, matching room detection semantics.
 */
export function analyzeWallStructure(
  walls: Wall[],
  tolerance = WALL_JOINT_TOLERANCE,
): WallStructureAnalysis {
  const openEnds: Point[] = [];
  const joints: WallJoint[] = [];

  const addJoint = (point: Point, connections: number) => {
    const existing = joints.find(
      (candidate) => dist(candidate.point, point) <= tolerance,
    );
    if (existing) existing.connections = Math.max(existing.connections, connections);
    else joints.push({ point: { ...point }, connections });
  };

  for (const wall of walls) {
    for (const end of ["a", "b"] as const) {
      const point = wall[end];
      const connectedWallIds = new Set<string>();
      for (const candidate of walls) {
        if (distToSegment(point, candidate.a, candidate.b) <= tolerance) {
          connectedWallIds.add(candidate.id);
        }
      }
      if (connectedWallIds.size <= 1) openEnds.push({ ...point });
      else addJoint(point, connectedWallIds.size);
    }
  }

  return { joints, openEnds };
}
