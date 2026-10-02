import { memo } from "react";
import { add, lerp, perp, scale, wallDirection } from "../../geometry";
import { openingRect } from "../../openings";
import type { Opening, Wall } from "../../types";

const BG = "#fbfcfd";

const toPoints = (poly: { x: number; y: number }[]) =>
  poly.map((p) => `${p.x},${p.y}`).join(" ");

function DoorSymbol({
  wall,
  opening,
  color,
}: {
  wall: Wall;
  opening: Opening;
  color: string;
}) {
  const d = wallDirection(wall);
  const n = perp(d);
  const c = lerp(wall.a, wall.b, opening.t);
  const hinge = add(c, scale(d, -opening.width / 2));
  const jamb = add(c, scale(d, opening.width / 2));
  // leaf swings to the wall's perp side
  const tip = add(hinge, scale(n, opening.width));
  const rect = openingRect(wall, opening);
  return (
    <g>
      <polygon points={toPoints(rect)} fill={BG} />
      <polygon
        points={toPoints(rect)}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={hinge.x}
        y1={hinge.y}
        x2={tip.x}
        y2={tip.y}
        stroke={color}
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${tip.x} ${tip.y} A ${opening.width} ${opening.width} 0 0 0 ${jamb.x} ${jamb.y}`}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function WindowSymbol({
  wall,
  opening,
  color,
}: {
  wall: Wall;
  opening: Opening;
  color: string;
}) {
  const d = wallDirection(wall);
  const c = lerp(wall.a, wall.b, opening.t);
  const half = scale(d, opening.width / 2);
  const rect = openingRect(wall, opening);
  const n = perp(d);
  const off = scale(n, wall.thickness / 6);
  const l1a = add(add(c, half), off);
  const l1b = add(add(c, scale(half, -1)), off);
  const l2a = add(add(c, half), scale(off, -1));
  const l2b = add(add(c, scale(half, -1)), scale(off, -1));
  return (
    <g>
      <polygon points={toPoints(rect)} fill={BG} />
      <polygon
        points={toPoints(rect)}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={l1a.x}
        y1={l1a.y}
        x2={l1b.x}
        y2={l1b.y}
        stroke={color}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={l2a.x}
        y1={l2a.y}
        x2={l2b.x}
        y2={l2b.y}
        stroke={color}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

interface Props {
  walls: Wall[];
  openings: Opening[];
  selectedId: string | null;
  /** transient preview opening (tool hover), rendered semi-transparent */
  preview?: { wall: Wall; opening: Opening } | null;
}

export const OpeningsLayer = memo(function OpeningsLayer({
  walls,
  openings,
  selectedId,
  preview,
}: Props) {
  const wallById = new Map(walls.map((w) => [w.id, w]));
  return (
    <g>
      {openings.map((o) => {
        const wall = wallById.get(o.wallId);
        if (!wall) return null;
        const color = o.id === selectedId ? "#2563eb" : "#52525b";
        return o.type === "door" ? (
          <DoorSymbol key={o.id} wall={wall} opening={o} color={color} />
        ) : (
          <WindowSymbol key={o.id} wall={wall} opening={o} color={color} />
        );
      })}
      {preview && (
        <g opacity={0.55} pointerEvents="none">
          {preview.opening.type === "door" ? (
            <DoorSymbol
              wall={preview.wall}
              opening={preview.opening}
              color="#2563eb"
            />
          ) : (
            <WindowSymbol
              wall={preview.wall}
              opening={preview.opening}
              color="#2563eb"
            />
          )}
        </g>
      )}
    </g>
  );
});
