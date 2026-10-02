import { memo } from "react";
import { wallPolygonExtended } from "../../geometry";
import type { Wall } from "../../types";

interface Props {
  walls: Wall[];
  selectedIds: ReadonlySet<string>;
}

const toPoints = (poly: { x: number; y: number }[]) =>
  poly.map((p) => `${p.x},${p.y}`).join(" ");

/**
 * Walls rendered as architectural poché: solid dark fill, ends extended by
 * half the thickness so orthogonal joints merge into a clean union.
 */
export const WallsLayer = memo(function WallsLayer({
  walls,
  selectedIds,
}: Props) {
  return (
    <g>
      {walls.map((w) => (
        <polygon
          key={w.id}
          points={toPoints(wallPolygonExtended(w))}
          fill={selectedIds.has(w.id) ? "#2563eb" : "#3f3f46"}
          data-wall-id={w.id}
        />
      ))}
    </g>
  );
});
