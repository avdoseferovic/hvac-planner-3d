import * as THREE from "three";
import type { Bounds } from "./components/view3d/bounds3d";
import type { Point } from "./types";

const METERS_PER_CENTIMETER = 1 / 100;

function roomShape(polygon: Point[]): THREE.Shape {
  const shape = new THREE.Shape();
  const first = polygon[0];
  if (!first) return shape;

  shape.moveTo(
    first.x * METERS_PER_CENTIMETER,
    -first.y * METERS_PER_CENTIMETER,
  );
  for (const point of polygon.slice(1)) {
    shape.lineTo(
      point.x * METERS_PER_CENTIMETER,
      -point.y * METERS_PER_CENTIMETER,
    );
  }
  shape.closePath();
  return shape;
}

/** A finished-floor surface mapped from plan X/Y into scene X/Z. */
export function createRoomSurfaceGeometry(
  polygon: Point[],
): THREE.ShapeGeometry {
  const geometry = new THREE.ShapeGeometry(roomShape(polygon));
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** A footprint-following slab whose top stays on the finished-floor plane. */
export function createRoomSlabGeometry(
  polygon: Point[],
  thicknessMeters: number,
): THREE.ExtrudeGeometry {
  const depth = Math.max(0.001, thicknessMeters);
  const geometry = new THREE.ExtrudeGeometry(roomShape(polygon), {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -depth, 0);
  return geometry;
}

export interface RoofLayout {
  ridgeAlongX: boolean;
  halfSpan: number;
  roofHeight: number;
  slopeLength: number;
  slope: number;
  ridgeLength: number;
  panelCenterOffset: number;
  overhang: number;
}

export interface FlatRoofLayout {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  deckThickness: number;
  parapetHeight: number;
  pitchAlongX: boolean;
  pitchRun: number;
  pitchRise: number;
  pitchAngle: number;
  overhang: number;
}

/** Shared roof dimensions so panels meet exactly at ridge and eaves. */
export function roofLayout(
  bounds: Bounds,
  atticHeightMeters: number,
  overhang = 0.32,
): RoofLayout {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const ridgeAlongX = width >= depth;
  const halfSpan = (ridgeAlongX ? depth : width) / 2 + overhang;
  const roofHeight = Math.max(0.6, atticHeightMeters);
  const slopeLength = Math.hypot(halfSpan, roofHeight);

  return {
    ridgeAlongX,
    halfSpan,
    roofHeight,
    slopeLength,
    slope: Math.atan2(roofHeight, halfSpan),
    ridgeLength: (ridgeAlongX ? width : depth) + overhang * 2,
    panelCenterOffset: halfSpan / 2,
    overhang,
  };
}

/**
 * Shared dimensions for membrane and low-slope metal roofs.
 *
 * Metal panels fall along the shorter span, which keeps the high-to-low edge
 * difference realistic on long rectangular buildings.
 */
export function flatRoofLayout(
  bounds: Bounds,
  metal: boolean,
  overhang = 0.12,
): FlatRoofLayout {
  const width = bounds.maxX - bounds.minX + overhang * 2;
  const depth = bounds.maxZ - bounds.minZ + overhang * 2;
  const pitchAlongX = width <= depth;
  const pitchRun = pitchAlongX ? width : depth;
  const pitchRatio = metal ? 0.025 : 0;
  const pitchRise = pitchRun * pitchRatio;

  return {
    centerX: bounds.cx,
    centerZ: bounds.cz,
    width,
    depth,
    deckThickness: 0.18,
    parapetHeight: metal ? 0 : 0.34,
    pitchAlongX,
    pitchRun,
    pitchRise,
    pitchAngle: Math.atan(pitchRatio),
    overhang,
  };
}
