import { memo } from "react";
import {
  facadePos,
  mm,
  resolveDuctConnection,
  resolveDuctPoints,
} from "../../hvac";
import type { HvacElement, Point, Wall } from "../../types";

export const HVAC_COLORS: Record<string, string> = {
  acUnit: "#334155",
  hrvUnit: "#0d9488",
  supplyDiffuser: "#2563eb",
  returnGrille: "#ea580c",
  extractValve: "#dc2626",
  freshAirValve: "#16a34a",
  jumperDuct: "#9333ea",
  duct: "#64748b",
  facadePenetration: "#78350f",
};

const SEL = "#f59e0b";

function DrillLabel({
  pos,
  drill,
  r,
  color,
}: {
  pos: Point;
  drill: number;
  r: number;
  color: string;
}) {
  return (
    <text
      x={pos.x}
      y={pos.y - r - 6}
      textAnchor="middle"
      fontSize={13}
      fontWeight={600}
      fill={color}
      stroke="#ffffff"
      strokeWidth={3}
      paintOrder="stroke"
      pointerEvents="none"
    >
      {`Ø${drill}`}
    </text>
  );
}

function UnitBox({
  el,
  selected,
  connectedPorts,
  scale,
}: {
  el: HvacElement & { kind: "acUnit" | "hrvUnit" };
  selected: boolean;
  connectedPorts: ReadonlySet<string>;
  scale: number;
}) {
  const color = selected ? SEL : HVAC_COLORS[el.kind];
  const ports = [
    { id: "left", x: -el.width / 2, y: 0 },
    { id: "right", x: el.width / 2, y: 0 },
    { id: "top", x: 0, y: -el.depth / 2 },
    { id: "bottom", x: 0, y: el.depth / 2 },
  ] as const;
  return (
    <g transform={`translate(${el.pos.x} ${el.pos.y}) rotate(${el.rotation})`}>
      <rect
        x={-el.width / 2}
        y={-el.depth / 2}
        width={el.width}
        height={el.depth}
        fill={`${color}22`}
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={-el.width / 2}
        y1={-el.depth / 2}
        x2={el.width / 2}
        y2={el.depth / 2}
        stroke={color}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {ports.map((port) => {
        const connected = connectedPorts.has(`${el.id}:${port.id}`);
        return (
          <circle
            key={port.id}
            cx={port.x}
            cy={port.y}
            r={4 / scale}
            fill={connected ? "#0f766e" : "#ffffff"}
            stroke={connected ? "#0f766e" : color}
            strokeWidth={connected ? 2.5 : 1.5}
            vectorEffect="non-scaling-stroke"
            data-duct-port={`${el.id}:${port.id}`}
            data-connected={connected ? "true" : "false"}
          />
        );
      })}
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
        fontWeight={700}
        fill={color}
        pointerEvents="none"
      >
        {el.label}
      </text>
    </g>
  );
}

interface Props {
  hvac: HvacElement[];
  walls: Wall[];
  selectedIds: ReadonlySet<string>;
  scale: number;
}

/** 2D symbols for the HVAC layer, incl. drill-diameter labels for penetrations. */
export const HvacLayer = memo(function HvacLayer({
  hvac,
  walls,
  selectedIds,
  scale,
}: Props) {
  const connectedPorts = new Set<string>();
  for (const el of hvac) {
    if (el.kind !== "duct") continue;
    for (const connection of [el.startConnection, el.endConnection]) {
      if (resolveDuctConnection(connection, hvac, walls) && connection) {
        connectedPorts.add(`${connection.elementId}:${connection.portId}`);
      }
    }
  }

  return (
    <g>
      {/* ducts go below other symbols */}
      {hvac.map((el) => {
        if (el.kind !== "duct") return null;
        const selected = selectedIds.has(el.id);
        const color = selected ? SEL : HVAC_COLORS.duct;
        const points = resolveDuctPoints(el, hvac, walls);
        const pts = points.map((p) => `${p.x},${p.y}`).join(" ");
        const endpointStates = [
          {
            point: points[0],
            connected: Boolean(
              resolveDuctConnection(el.startConnection, hvac, walls),
            ),
          },
          {
            point: points[points.length - 1],
            connected: Boolean(
              resolveDuctConnection(el.endConnection, hvac, walls),
            ),
          },
        ];
        return (
          <g key={el.id}>
            <polyline
              points={pts}
              fill="none"
              stroke={`${color}66`}
              strokeWidth={mm(el.diameter)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {el.insulated && (
              <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth={mm(el.diameter) + 8}
                strokeOpacity={0.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <polyline
              points={pts}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="10 6"
              vectorEffect="non-scaling-stroke"
            />
            {endpointStates.map(
              ({ point, connected }, index) =>
                point && (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={5 / scale}
                    fill={connected ? "#0f766e" : "#fff7ed"}
                    stroke={connected ? "#0f766e" : "#f97316"}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    data-testid={
                      connected
                        ? "duct-endpoint-connected"
                        : "duct-endpoint-open"
                    }
                  />
                ),
            )}
            {selected &&
              points.slice(1, -1).map((point, index) => (
                <circle
                  key={`vertex-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={4.5 / scale}
                  fill="#ffffff"
                  stroke={SEL}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  data-testid="duct-elbow-handle"
                />
              ))}
          </g>
        );
      })}

      {hvac.map((el) => {
        const selected = selectedIds.has(el.id);
        switch (el.kind) {
          case "acUnit":
          case "hrvUnit":
            return (
              <UnitBox
                key={el.id}
                el={el}
                selected={selected}
                connectedPorts={connectedPorts}
                scale={scale}
              />
            );

          case "supplyDiffuser":
          case "extractValve":
          case "freshAirValve": {
            const color = selected ? SEL : HVAC_COLORS[el.kind];
            const r = mm(el.connDiameter) / 2;
            const rd = mm(el.drillDiameter) / 2;
            return (
              <g key={el.id}>
                <circle
                  cx={el.pos.x}
                  cy={el.pos.y}
                  r={rd}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={el.pos.x}
                  cy={el.pos.y}
                  r={r}
                  fill={`${color}33`}
                  stroke={color}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                {el.kind === "supplyDiffuser" && (
                  <circle
                    cx={el.pos.x}
                    cy={el.pos.y}
                    r={r * 0.45}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {el.kind === "extractValve" && (
                  <circle
                    cx={el.pos.x}
                    cy={el.pos.y}
                    r={r * 0.25}
                    fill={color}
                  />
                )}
                {el.kind === "freshAirValve" && (
                  <g
                    stroke={color}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  >
                    <line
                      x1={el.pos.x - r * 0.6}
                      y1={el.pos.y}
                      x2={el.pos.x + r * 0.6}
                      y2={el.pos.y}
                    />
                    <line
                      x1={el.pos.x}
                      y1={el.pos.y - r * 0.6}
                      x2={el.pos.x}
                      y2={el.pos.y + r * 0.6}
                    />
                  </g>
                )}
                <DrillLabel
                  pos={el.pos}
                  drill={el.drillDiameter}
                  r={rd}
                  color={color}
                />
              </g>
            );
          }

          case "returnGrille": {
            const color = selected ? SEL : HVAC_COLORS.returnGrille;
            const s = mm(el.connDiameter);
            const rd = mm(el.drillDiameter) / 2;
            return (
              <g key={el.id}>
                <circle
                  cx={el.pos.x}
                  cy={el.pos.y}
                  r={rd}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={el.pos.x - s / 2}
                  y={el.pos.y - s / 2}
                  width={s}
                  height={s}
                  fill={`${color}33`}
                  stroke={color}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                {[-0.25, 0, 0.25].map((f) => (
                  <line
                    key={f}
                    x1={el.pos.x - s / 2 + 3}
                    y1={el.pos.y + s * f}
                    x2={el.pos.x + s / 2 - 3}
                    y2={el.pos.y + s * f}
                    stroke={color}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <DrillLabel
                  pos={el.pos}
                  drill={el.drillDiameter}
                  r={rd}
                  color={color}
                />
              </g>
            );
          }

          case "jumperDuct": {
            const color = selected ? SEL : HVAC_COLORS.jumperDuct;
            const r = mm(el.drillDiameter) / 2;
            return (
              <g key={el.id}>
                <line
                  x1={el.posA.x}
                  y1={el.posA.y}
                  x2={el.posB.x}
                  y2={el.posB.y}
                  stroke={color}
                  strokeWidth={mm(el.diameter)}
                  strokeOpacity={0.3}
                  strokeLinecap="round"
                />
                {[el.posA, el.posB].map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={`${color}33`}
                    stroke={color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <DrillLabel
                  pos={el.posA}
                  drill={el.drillDiameter}
                  r={r}
                  color={color}
                />
                <DrillLabel
                  pos={el.posB}
                  drill={el.drillDiameter}
                  r={r}
                  color={color}
                />
              </g>
            );
          }

          case "facadePenetration": {
            const pos = facadePos(el, walls);
            if (!pos) return null;
            const color = selected ? SEL : HVAC_COLORS.facadePenetration;
            const r = mm(el.drillDiameter) / 2;
            return (
              <g key={el.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill="#fff"
                  stroke={color}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={pos.x - r}
                  y1={pos.y - r}
                  x2={pos.x + r}
                  y2={pos.y + r}
                  stroke={color}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
                <DrillLabel
                  pos={pos}
                  drill={el.drillDiameter}
                  r={r}
                  color={color}
                />
              </g>
            );
          }

          case "duct":
            return null;
        }
      })}
    </g>
  );
});
