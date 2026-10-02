import { dist, lerp } from "./geometry";
import type { Model, Wall } from "./types";

/** pieces shorter than this are dropped (cm) */
const MIN_PIECE = 1;

interface Piece {
  id: string;
  /** span along the original wall, in cm from endpoint a */
  s0: number;
  s1: number;
  wall: Wall;
}

/**
 * Remove the span [tA, tB] (normalized, any order) from a wall.
 * The remainder becomes up to two walls (`idLeft`, `idRight`) that inherit
 * the original's properties. Openings and facade penetrations are re-homed
 * into the retained pieces at the same world position; ones that fall in
 * the removed span (or straddle a cut) are deleted.
 */
export function cutWallSegment(
  m: Model,
  wallId: string,
  tA: number,
  tB: number,
  idLeft: string,
  idRight: string,
): void {
  const wall = m.walls.find((w) => w.id === wallId);
  if (!wall) return;
  const len = dist(wall.a, wall.b);
  if (len <= 0) return;

  const s1 = Math.max(0, Math.min(tA, tB) * len);
  const s2 = Math.min(len, Math.max(tA, tB) * len);
  if (s2 - s1 < MIN_PIECE) return;

  const pieceAt = (id: string, s0: number, sEnd: number): Piece | null => {
    if (sEnd - s0 < MIN_PIECE) return null;
    return {
      id,
      s0,
      s1: sEnd,
      wall: {
        ...wall,
        id,
        a: lerp(wall.a, wall.b, s0 / len),
        b: lerp(wall.a, wall.b, sEnd / len),
      },
    };
  };
  const pieces = [pieceAt(idLeft, 0, s1), pieceAt(idRight, s2, len)].filter(
    (p): p is Piece => p !== null,
  );

  m.walls = m.walls.flatMap((w) => (w.id === wallId ? [] : [w]));
  const insertAt = m.walls.length;
  m.walls.splice(insertAt, 0, ...pieces.map((p) => p.wall));

  const homeFor = (s: number, halfWidth: number): Piece | undefined =>
    pieces.find((p) => s - halfWidth >= p.s0 && s + halfWidth <= p.s1);

  m.openings = m.openings.flatMap((o) => {
    if (o.wallId !== wallId) return [o];
    const s = o.t * len;
    const home = homeFor(s, o.width / 2);
    if (!home) return [];
    return [{ ...o, wallId: home.id, t: (s - home.s0) / (home.s1 - home.s0) }];
  });

  m.hvac = m.hvac.flatMap((h) => {
    if (h.kind !== "facadePenetration" || h.wallId !== wallId) return [h];
    const s = h.t * len;
    const home = homeFor(s, h.drillDiameter / 10 / 2);
    if (!home) return [];
    return [{ ...h, wallId: home.id, t: (s - home.s0) / (home.s1 - home.s0) }];
  });
}
