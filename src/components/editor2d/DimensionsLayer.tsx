import { memo } from "react";
import { wallDimension } from "../../dimensions";
import { add, scale as vScale, wallDirection } from "../../geometry";
import type { Room, Wall } from "../../types";

const COLOR = "#8a8f98";

interface Props {
  walls: Wall[];
  rooms: Room[];
  scale: number;
}

function DimLine({
  wall,
  walls,
  rooms,
  scale,
}: {
  wall: Wall;
  walls: Wall[];
  rooms: Room[];
  scale: number;
}) {
  const dimension = wallDimension(wall, walls, rooms);
  const len = dimension.length;
  if (len * scale < 50) return null; // too small to label

  const d = wallDirection(wall);
  const n = dimension.normal;
  const offset = 30;
  const a = add(dimension.faceA, vScale(n, offset));
  const b = add(dimension.faceB, vScale(n, offset));
  const tick = 6 / scale;
  const witnessOverhang = 4 / scale;
  const tickDir = add(vScale(d, 0.7071), vScale(n, 0.7071));
  const fontSize = Math.min(12 / scale, 30);

  // keep text upright
  let angle = (Math.atan2(d.y, d.x) * 180) / Math.PI;
  if (angle > 90 || angle <= -90) angle += 180;
  const textPos = add(add(a, vScale(d, len / 2)), vScale(n, fontSize * 0.4));

  return (
    <g
      data-wall-dimension-id={wall.id}
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
        data-dimension-witness="start"
        x1={dimension.faceA.x}
        y1={dimension.faceA.y}
        x2={a.x + n.x * witnessOverhang}
        y2={a.y + n.y * witnessOverhang}
        vectorEffect="non-scaling-stroke"
      />
      <line
        data-dimension-witness="end"
        x1={dimension.faceB.x}
        y1={dimension.faceB.y}
        x2={b.x + n.x * witnessOverhang}
        y2={b.y + n.y * witnessOverhang}
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

/** Automatic wall-face dimensions (length in cm) with witnesses and 45° ticks. */
export const DimensionsLayer = memo(function DimensionsLayer({
  walls,
  rooms,
  scale,
}: Props) {
  return (
    <g pointerEvents="none">
      {walls.map((w) => (
        <DimLine
          key={w.id}
          wall={w}
          walls={walls}
          rooms={rooms}
          scale={scale}
        />
      ))}
    </g>
  );
});
