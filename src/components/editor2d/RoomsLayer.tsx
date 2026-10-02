import { memo } from "react";
import { formatArea } from "../../geometry";
import type { Room } from "../../types";

interface Props {
  rooms: Room[];
  selectedId: string | null;
  scale: number;
  /** view rotation (deg) — labels counter-rotate to stay horizontal */
  rotation?: number;
}

/** Light room fill + centered name / area label. */
export const RoomsLayer = memo(function RoomsLayer({
  rooms,
  selectedId,
  scale,
  rotation = 0,
}: Props) {
  const fontSize = Math.min(16 / scale, 40);
  return (
    <g>
      {rooms.map((r) => (
        <g key={r.id}>
          <polygon
            points={r.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={r.id === selectedId ? "#dbe7ff" : "#f7f5f0"}
          />
          <g
            transform={
              rotation
                ? `rotate(${-rotation} ${r.centroid.x} ${r.centroid.y})`
                : undefined
            }
          >
            <text
              x={r.centroid.x}
              y={r.centroid.y}
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight={600}
              fill="#44403c"
              pointerEvents="none"
            >
              {r.name}
            </text>
            <text
              x={r.centroid.x}
              y={r.centroid.y + fontSize * 1.2}
              textAnchor="middle"
              fontSize={fontSize * 0.85}
              fill="#78716c"
              pointerEvents="none"
            >
              {formatArea(r.area)}
            </text>
          </g>
        </g>
      ))}
    </g>
  );
});
