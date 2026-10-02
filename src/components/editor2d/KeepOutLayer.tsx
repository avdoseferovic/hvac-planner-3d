import { memo } from "react";
import { add, normalize, perp, scale, sub } from "../../geometry";
import type { Wall } from "../../types";

interface Props {
  walls: Wall[];
  width: number;
}

/** Red hatched keep-out band along load-bearing walls (ceiling danger zone). */
export const KeepOutLayer = memo(function KeepOutLayer({
  walls,
  width,
}: Props) {
  const bearing = walls.filter((w) => w.loadBearing);
  return (
    <g pointerEvents="none" data-testid="keepout-layer">
      <defs>
        <pattern
          id="keepout-hatch"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="12" height="12" fill="#dc262612" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="12"
            stroke="#dc2626"
            strokeWidth="2"
            strokeOpacity="0.45"
          />
        </pattern>
      </defs>
      {bearing.map((w) => {
        const d = normalize(sub(w.b, w.a));
        const half = w.thickness / 2 + width;
        const n = scale(perp(d), half);
        const ext = scale(d, half);
        const a = sub(w.a, ext);
        const b = add(w.b, ext);
        const poly = [add(a, n), add(b, n), sub(b, n), sub(a, n)];
        return (
          <polygon
            key={w.id}
            points={poly.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="url(#keepout-hatch)"
            stroke="#dc2626"
            strokeOpacity={0.4}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
});
