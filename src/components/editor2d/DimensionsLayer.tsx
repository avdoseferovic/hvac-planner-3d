import { memo } from "react";
import {
  add,
  dist,
  perp,
  pointInPolygon,
  scale as vScale,
  wallDirection,
} from "../../geometry";
import type { Room, Wall } from "../../types";

const COLOR = "#8a8f98";

interface Props {
  walls: Wall[];
  rooms: Room[];
  scale: number;
}

function DimLine({
  wall,
  rooms,
  scale,
}: {
  wall: Wall;
  rooms: Room[];
  scale: number;
}) {
  const len = dist(wall.a, wall.b);
  if (len * scale < 50) return null; // too small to label

  const d = wallDirection(wall);
  let n = perp(d);
  // prefer the side that is NOT inside a room (exterior side)
  const mid = add(wall.a, vScale(d, len / 2));
  const probe = add(mid, vScale(n, wall.thickness / 2 + 20));
  if (rooms.some((r) => pointInPolygon(probe, r.polygon))) n = vScale(n, -1);

  const offset = wall.thickness / 2 + 30;
  const a = add(wall.a, vScale(n, offset));
  const b = add(wall.b, vScale(n, offset));
  const tick = 6 / scale;
  const tickDir = add(vScale(d, 0.7071), vScale(n, 0.7071));
  const fontSize = Math.min(12 / scale, 30);

  // keep text upright
  let angle = (Math.atan2(d.y, d.x) * 180) / Math.PI;
  if (angle > 90 || angle <= -90) angle += 180;
  const textPos = add(add(a, vScale(d, len / 2)), vScale(n, fontSize * 0.4));

  return (
    <g
      stroke={COLOR}
      strokeWidth={1}
      fill="none"
      vectorEffect="non-scaling-stroke"
    >
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={a.x - tickDir.x * tick}
        y1={a.y - tickDir.y * tick}
        x2={a.x + tickDir.x * tick}
        y2={a.y + tickDir.y * tick}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={b.x - tickDir.x * tick}
        y1={b.y - tickDir.y * tick}
        x2={b.x + tickDir.x * tick}
        y2={b.y + tickDir.y * tick}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={textPos.x}
        y={textPos.y}
        transform={`rotate(${angle} ${textPos.x} ${textPos.y})`}
        textAnchor="middle"
        fontSize={fontSize}
        fill={COLOR}
        stroke="none"
      >
        {Math.round(len)}
      </text>
    </g>
  );
}

/** Automatic wall dimension lines (length in cm) with 45° ticks. */
export const DimensionsLayer = memo(function DimensionsLayer({
  walls,
  rooms,
  scale,
}: Props) {
  return (
    <g pointerEvents="none">
      {walls.map((w) => (
        <DimLine key={w.id} wall={w} rooms={rooms} scale={scale} />
      ))}
    </g>
  );
});
