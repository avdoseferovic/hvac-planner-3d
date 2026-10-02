import { memo } from "react";

export interface Camera {
  /** world coords (cm) at the viewport center */
  cx: number;
  cy: number;
  /** pixels per cm */
  scale: number;
}

interface Props {
  camera: Camera;
  width: number;
  height: number;
  gridSize: number;
}

/** Adaptive grid: minor lines at the snap grid (or a readable multiple), major lines every 1 m. */
export const GridLayer = memo(function GridLayer({
  camera,
  width,
  height,
  gridSize,
}: Props) {
  const { cx, cy, scale } = camera;
  const x0 = cx - width / 2 / scale;
  const x1 = cx + width / 2 / scale;
  const y0 = cy - height / 2 / scale;
  const y1 = cy + height / 2 / scale;

  // pick the smallest multiple of gridSize that renders at >= 8 px
  const multipliers = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  let minor = gridSize * multipliers[multipliers.length - 1];
  for (const m of multipliers) {
    if (gridSize * m * scale >= 8) {
      minor = gridSize * m;
      break;
    }
  }
  const major = 100; // 1 m
  const showMajor = major * scale >= 8;

  const lines: React.ReactNode[] = [];
  const strokeMinor = 0.75 / scale;
  const strokeMajor = 1 / scale;

  if (minor * scale >= 8) {
    for (let x = Math.floor(x0 / minor) * minor; x <= x1; x += minor) {
      if (showMajor && x % major === 0) continue;
      lines.push(
        <line
          key={`vx${x}`}
          x1={x}
          y1={y0}
          x2={x}
          y2={y1}
          stroke="#e5e7eb"
          strokeWidth={strokeMinor}
        />,
      );
    }
    for (let y = Math.floor(y0 / minor) * minor; y <= y1; y += minor) {
      if (showMajor && y % major === 0) continue;
      lines.push(
        <line
          key={`hy${y}`}
          x1={x0}
          y1={y}
          x2={x1}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={strokeMinor}
        />,
      );
    }
  }
  if (showMajor) {
    for (let x = Math.floor(x0 / major) * major; x <= x1; x += major) {
      lines.push(
        <line
          key={`Vx${x}`}
          x1={x}
          y1={y0}
          x2={x}
          y2={y1}
          stroke="#d4d8dd"
          strokeWidth={strokeMajor}
        />,
      );
    }
    for (let y = Math.floor(y0 / major) * major; y <= y1; y += major) {
      lines.push(
        <line
          key={`Hy${y}`}
          x1={x0}
          y1={y}
          x2={x1}
          y2={y}
          stroke="#d4d8dd"
          strokeWidth={strokeMajor}
        />,
      );
    }
  }

  return (
    <g pointerEvents="none">
      {lines}
      {/* origin cross */}
      <line
        x1={-20}
        y1={0}
        x2={20}
        y2={0}
        stroke="#b0b6bd"
        strokeWidth={1.5 / scale}
      />
      <line
        x1={0}
        y1={-20}
        x2={0}
        y2={20}
        stroke="#b0b6bd"
        strokeWidth={1.5 / scale}
      />
    </g>
  );
});
