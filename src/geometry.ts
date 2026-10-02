import type { Point, Wall } from "./types";

// ---------------------------------------------------------------------------
// Vector helpers (all in cm)
// ---------------------------------------------------------------------------

export const sub = (a: Point, b: Point): Point => ({
  x: a.x - b.x,
  y: a.y - b.y,
});
export const add = (a: Point, b: Point): Point => ({
  x: a.x + b.x,
  y: a.y + b.y,
});
export const scale = (a: Point, s: number): Point => ({
  x: a.x * s,
  y: a.y * s,
});
export const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;
export const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x;
export const len = (a: Point): number => Math.hypot(a.x, a.y);
export const dist = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function normalize(a: Point): Point {
  const l = len(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** perpendicular (rotated 90° CCW) */
export const perp = (a: Point): Point => ({ x: -a.y, y: a.x });

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ---------------------------------------------------------------------------
// Snapping
// ---------------------------------------------------------------------------

export function snapToGrid(p: Point, grid: number): Point {
  return {
    x: Math.round(p.x / grid) * grid,
    y: Math.round(p.y / grid) * grid,
  };
}

/** Constrain point p to a 0°/90° axis relative to origin (picks the closer axis). */
export function snapToAxis(origin: Point, p: Point): Point {
  const dx = Math.abs(p.x - origin.x);
  const dy = Math.abs(p.y - origin.y);
  return dx >= dy ? { x: p.x, y: origin.y } : { x: origin.x, y: p.y };
}

/** Find the nearest wall endpoint within `radius` of p, or null. */
export function snapToEndpoints(
  p: Point,
  walls: Wall[],
  radius: number,
): Point | null {
  let best: Point | null = null;
  let bestD = radius;
  for (const w of walls) {
    for (const e of [w.a, w.b]) {
      const d = dist(p, e);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
  }
  return best ? { ...best } : null;
}

// ---------------------------------------------------------------------------
// Segment / wall geometry
// ---------------------------------------------------------------------------

/** Closest point on segment ab to p, returned as normalized t (0..1). */
export function closestT(a: Point, b: Point, p: Point): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 === 0) return 0;
  return Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
}

export function pointOnSegment(a: Point, b: Point, t: number): Point {
  return lerp(a, b, t);
}

export function distToSegment(p: Point, a: Point, b: Point): number {
  return dist(p, pointOnSegment(a, b, closestT(a, b, p)));
}

export function wallLength(w: Wall): number {
  return dist(w.a, w.b);
}

export function wallDirection(w: Wall): Point {
  return normalize(sub(w.b, w.a));
}

/** The 4 corners of the wall rectangle (centerline ± thickness/2). */
export function wallPolygon(w: Wall): Point[] {
  const d = wallDirection(w);
  const n = scale(perp(d), w.thickness / 2);
  return [add(w.a, n), add(w.b, n), sub(w.b, n), sub(w.a, n)];
}

/**
 * Wall rectangle extended by thickness/2 at both ends so that
 * orthogonal joints render as a clean union (poché fill).
 */
export function wallPolygonExtended(w: Wall): Point[] {
  const d = wallDirection(w);
  const ext = scale(d, w.thickness / 2);
  const a = sub(w.a, ext);
  const b = add(w.b, ext);
  const n = scale(perp(d), w.thickness / 2);
  return [add(a, n), add(b, n), sub(b, n), sub(a, n)];
}

// ---------------------------------------------------------------------------
// Polygons
// ---------------------------------------------------------------------------

/** Signed area (cm²); positive for counter-clockwise in a y-up system. */
export function polygonSignedArea(poly: Point[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export function polygonArea(poly: Point[]): number {
  return Math.abs(polygonSignedArea(poly));
}

export function polygonCentroid(poly: Point[]): Point {
  const a = polygonSignedArea(poly);
  if (Math.abs(a) < 1e-9) {
    // degenerate: average the vertices
    let x = 0;
    let y = 0;
    for (const p of poly) {
      x += p.x;
      y += p.y;
    }
    return { x: x / poly.length, y: y / poly.length };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** format a cm length: below 100 cm → "83 cm", above → "2.45 m" */
export function formatLength(cm: number): string {
  if (Math.abs(cm) < 100) return `${round1(cm)} cm`;
  return `${round2(cm / 100)} m`;
}

export function formatArea(cm2: number): string {
  return `${round2(cm2 / 10_000)} m²`;
}

export const round1 = (n: number): number => Math.round(n * 10) / 10;
export const round2 = (n: number): number => Math.round(n * 100) / 100;
