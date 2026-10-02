import { useMemo } from "react";
import { wallPolygonExtended } from "../../geometry";
import { useStore } from "../../store";
import type { Wall } from "../../types";

const M = 1 / 100;

export interface Bounds {
  cx: number;
  cz: number;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  radius: number;
}

export function buildingBoundsForWalls(walls: Wall[]): Bounds {
  if (walls.length === 0) {
    return {
      cx: 0,
      cz: 0,
      minX: -5,
      minZ: -5,
      maxX: 5,
      maxZ: 5,
      radius: 6,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const wall of walls) {
    for (const point of wallPolygonExtended(wall)) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  const cx = ((minX + maxX) / 2) * M;
  const cz = ((minY + maxY) / 2) * M;
  const radius = Math.max(
    2,
    (Math.hypot(maxX - minX, maxY - minY) / 2) * M,
  );

  return {
    cx,
    cz,
    minX: minX * M,
    minZ: minY * M,
    maxX: maxX * M,
    maxZ: maxY * M,
    radius,
  };
}

/** Building bounds in scene meters, derived from all floor outlines. */
export function useBuildingBounds(): Bounds {
  const walls = useStore((state) => state.model.walls);
  return useMemo(() => buildingBoundsForWalls(walls), [walls]);
}
