import type { Model, Point } from "./types";

/** 2D editor camera: world coords (cm) at the viewport center, scale in px/cm. */
export interface Camera {
  cx: number;
  cy: number;
  scale: number;
  /** view rotation in degrees, clockwise on screen, normalized to [0, 360) */
  rotation: number;
}

export const MIN_SCALE = 0.02;
export const MAX_SCALE = 40;
/** Upper bound used by fit-to-content so tiny plans don't zoom absurdly far in. */
const FIT_MAX_SCALE = 3;

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/** Zoom around the viewport center by `factor`, clamped to the scale limits. */
export function zoomAt(camera: Camera, factor: number): Camera {
  return { ...camera, scale: clampScale(camera.scale * factor) };
}

/** Rotate a vector by `deg` degrees (positive = clockwise in y-down space). */
export function rotateVec(v: Point, deg: number): Point {
  if (deg === 0) return v;
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

/** Convert a screen-px offset from the viewport center into a world offset. */
export function screenOffsetToWorld(camera: Camera, offset: Point): Point {
  const v = rotateVec(offset, -camera.rotation);
  return { x: v.x / camera.scale, y: v.y / camera.scale };
}

/** Rotate the view by `delta` degrees around the viewport center. */
export function rotateCamera(camera: Camera, delta: number): Camera {
  const rotation = (((camera.rotation + delta) % 360) + 360) % 360;
  return { ...camera, rotation };
}

/** Bounding box (cm) of everything drawable: walls, ducts, and HVAC elements. */
export function contentBounds(model: Model): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const extend = (p: Point, r: number): void => {
    minX = Math.min(minX, p.x - r);
    minY = Math.min(minY, p.y - r);
    maxX = Math.max(maxX, p.x + r);
    maxY = Math.max(maxY, p.y + r);
  };

  for (const w of model.walls) {
    extend(w.a, w.thickness / 2);
    extend(w.b, w.thickness / 2);
  }
  for (const h of model.hvac) {
    switch (h.kind) {
      case "duct": {
        const r = h.diameter / 10 / 2; // mm → cm radius
        for (const p of h.points) extend(p, r);
        break;
      }
      case "acUnit":
      case "hrvUnit":
        extend(h.pos, Math.max(h.width, h.depth) / 2);
        break;
      case "jumperDuct":
        extend(h.posA, h.diameter / 10 / 2);
        extend(h.posB, h.diameter / 10 / 2);
        break;
      case "facadePenetration":
        // positioned on a wall, already covered by the wall bounds
        break;
      default:
        extend(h.pos, h.connDiameter / 10 / 2);
    }
  }

  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

/** Camera that shows the whole plan with `padding` px around it, or null if empty. */
export function fitCamera(
  model: Model,
  viewportW: number,
  viewportH: number,
  padding = 60,
  rotation = 0,
): Camera | null {
  const b = contentBounds(model);
  if (!b) return null;
  const w = Math.max(b.maxX - b.minX, 1e-6);
  const h = Math.max(b.maxY - b.minY, 1e-6);
  // screen-space extent of the world bbox once the view is rotated
  const r = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  const wRot = w * cos + h * sin;
  const hRot = w * sin + h * cos;
  const availW = Math.max(viewportW - padding * 2, 40);
  const availH = Math.max(viewportH - padding * 2, 40);
  const scale = clampScale(
    Math.min(availW / wRot, availH / hRot, FIT_MAX_SCALE),
  );
  return {
    cx: (b.minX + b.maxX) / 2,
    cy: (b.minY + b.maxY) / 2,
    scale,
    rotation,
  };
}
