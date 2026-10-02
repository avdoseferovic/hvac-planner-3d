import { dist } from "./geometry";
import type { Opening, Wall } from "./types";

/**
 * A 3D box for one piece of a wall, in centimeters.
 * `along` is the box center measured along the wall from endpoint a;
 * `y` is the vertical center (0 = floor).
 */
export interface WallBox {
  /** center position along the wall axis (cm from wall.a) */
  along: number;
  /** vertical center (cm above floor) */
  y: number;
  /** size: length along wall, height, depth = wall thickness */
  sizeAlong: number;
  sizeY: number;
}

interface Span {
  from: number;
  to: number;
  /** vertical range of the OPENING (the hole) */
  bottom: number;
  top: number;
}

/**
 * Split a wall into solid boxes around its openings.
 * Full-height pieces between openings, lintels above, sills below windows.
 */
export function wallBoxes(
  wall: Wall,
  openings: Opening[],
  wallHeight: number,
): WallBox[] {
  const L = dist(wall.a, wall.b);
  if (L <= 0) return [];

  const spans: Span[] = openings
    .filter((o) => o.wallId === wall.id)
    .map((o) => {
      const c = o.t * L;
      const bottom = o.type === "window" ? o.sill : 0;
      return {
        from: Math.max(0, c - o.width / 2),
        to: Math.min(L, c + o.width / 2),
        bottom: Math.min(bottom, wallHeight),
        top: Math.min(bottom + o.height, wallHeight),
      };
    })
    .filter((s) => s.to > s.from)
    .sort((a, b) => a.from - b.from);

  const boxes: WallBox[] = [];
  const solid = (from: number, to: number, y0: number, y1: number) => {
    if (to - from > 0.01 && y1 - y0 > 0.01) {
      boxes.push({
        along: (from + to) / 2,
        y: (y0 + y1) / 2,
        sizeAlong: to - from,
        sizeY: y1 - y0,
      });
    }
  };

  let cursor = 0;
  for (const s of spans) {
    solid(cursor, s.from, 0, wallHeight); // piece before the opening
    solid(s.from, s.to, 0, s.bottom); // sill (windows)
    solid(s.from, s.to, s.top, wallHeight); // lintel
    cursor = Math.max(cursor, s.to);
  }
  solid(cursor, L, 0, wallHeight);
  return boxes;
}
