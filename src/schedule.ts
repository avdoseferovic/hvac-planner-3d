import { distToSegment, pointInPolygon, round1 } from "./geometry";
import { facadePos, mm } from "./hvac";
import type { HvacElement, Model, Point, Room } from "./types";

export interface PenetrationRow {
  id: string;
  /** element id + optional hole suffix (jumper has two holes) */
  elementId: string;
  kind: HvacElement["kind"];
  /** slab (ceiling) or wall (facade) */
  surface: "slab" | "wall";
  roomName: string;
  connDiameter: number;
  drillDiameter: number;
  pos: Point;
  /** distance (cm) from the nearest ~vertical wall of the room */
  x: number | null;
  /** distance (cm) from the nearest ~horizontal wall of the room */
  y: number | null;
}

interface RawPen {
  elementId: string;
  kind: HvacElement["kind"];
  surface: "slab" | "wall";
  connDiameter: number;
  drillDiameter: number;
  pos: Point;
}

function collectPenetrations(model: Model): RawPen[] {
  const out: RawPen[] = [];
  for (const el of model.hvac) {
    switch (el.kind) {
      case "supplyDiffuser":
      case "returnGrille":
      case "extractValve":
      case "freshAirValve":
        out.push({
          elementId: el.id,
          kind: el.kind,
          surface: "slab",
          connDiameter: el.connDiameter,
          drillDiameter: el.drillDiameter,
          pos: el.pos,
        });
        break;
      case "jumperDuct":
        out.push(
          {
            elementId: `${el.id}-A`,
            kind: el.kind,
            surface: "slab",
            connDiameter: el.diameter,
            drillDiameter: el.drillDiameter,
            pos: el.posA,
          },
          {
            elementId: `${el.id}-B`,
            kind: el.kind,
            surface: "slab",
            connDiameter: el.diameter,
            drillDiameter: el.drillDiameter,
            pos: el.posB,
          },
        );
        break;
      case "facadePenetration": {
        const pos = facadePos(el, model.walls);
        if (pos) {
          out.push({
            elementId: el.id,
            kind: el.kind,
            surface: "wall",
            connDiameter: el.diameter,
            drillDiameter: el.drillDiameter,
            pos,
          });
        }
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/** Distances from a point to the nearest ~vertical / ~horizontal edge of a polygon. */
function wallOffsets(
  p: Point,
  polygon: Point[],
): { x: number | null; y: number | null } {
  let x: number | null = null;
  let y: number | null = null;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const d = distToSegment(p, a, b);
    const vertical = Math.abs(b.x - a.x) <= Math.abs(b.y - a.y);
    if (vertical) {
      if (x === null || d < x) x = d;
    } else {
      if (y === null || d < y) y = d;
    }
  }
  return { x: x === null ? null : round1(x), y: y === null ? null : round1(y) };
}

/**
 * Full penetration schedule: every slab and facade penetration with room and
 * X/Y offsets from the two nearest walls of that room.
 */
export function penetrationSchedule(
  model: Model,
  rooms: Room[],
): PenetrationRow[] {
  const raw = collectPenetrations(model);
  // stable ordering: top→bottom, left→right
  raw.sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);
  return raw.map((r, i) => {
    const room = rooms.find((rm) => pointInPolygon(r.pos, rm.polygon));
    const offsets = room
      ? wallOffsets(r.pos, room.polygon)
      : { x: null, y: null };
    return {
      id: `P${String(i + 1).padStart(2, "0")}`,
      elementId: r.elementId,
      kind: r.kind,
      surface: r.surface,
      roomName: room?.name ?? "—",
      connDiameter: r.connDiameter,
      drillDiameter: r.drillDiameter,
      pos: r.pos,
      ...offsets,
    };
  });
}

/** Pairs of penetrations closer than 3× the larger drill diameter. */
export interface ProximityWarning {
  a: PenetrationRow;
  b: PenetrationRow;
  distance: number;
  minAllowed: number;
}

export function proximityWarnings(rows: PenetrationRow[]): ProximityWarning[] {
  const out: ProximityWarning[] = [];
  const slab = rows.filter((r) => r.surface === "slab");
  for (let i = 0; i < slab.length; i++) {
    for (let j = i + 1; j < slab.length; j++) {
      const a = slab[i];
      const b = slab[j];
      const d = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
      const minAllowed = 3 * mm(Math.max(a.drillDiameter, b.drillDiameter));
      if (d < minAllowed) out.push({ a, b, distance: round1(d), minAllowed });
    }
  }
  return out;
}

/** CSV export (comma-separated, quoted strings). */
export function scheduleToCsv(
  rows: PenetrationRow[],
  headers: string[],
): string {
  const esc = (v: string | number | null): string => {
    if (v === null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.roomName,
        r.kind,
        r.surface,
        r.connDiameter,
        r.drillDiameter,
        r.x,
        r.y,
      ]
        .map(esc)
        .join(","),
    );
  }
  return lines.join("\n");
}
