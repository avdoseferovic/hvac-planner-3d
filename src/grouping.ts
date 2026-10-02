import type { HvacElement, Model, Point, Selection, Wall } from "./types";

/** Only walls and hvac elements can be grouped (rooms/openings are derived). */
export function isGroupable(sel: Selection): boolean {
  return sel.type === "wall" || sel.type === "hvac";
}

function findElement(m: Model, sel: Selection): Wall | HvacElement | undefined {
  if (sel.type === "wall") return m.walls.find((w) => w.id === sel.id);
  if (sel.type === "hvac") return m.hvac.find((h) => h.id === sel.id);
  return undefined;
}

/** All members of the clicked element's group (or just the element itself). */
export function expandToGroup(m: Model, item: Selection): Selection[] {
  const el = findElement(m, item);
  const gid = el?.groupId;
  if (!gid) return [item];
  const members: Selection[] = [];
  for (const w of m.walls) {
    if (w.groupId === gid) members.push({ type: "wall", id: w.id });
  }
  for (const h of m.hvac) {
    if (h.groupId === gid) members.push({ type: "hvac", id: h.id });
  }
  return members;
}

/** The shared groupId when every selected element belongs to the same group. */
export function selectionGroupId(m: Model, sel: Selection[]): string | null {
  const groupable = sel.filter(isGroupable);
  if (groupable.length === 0) return null;
  let gid: string | null = null;
  for (const s of groupable) {
    const el = findElement(m, s);
    if (!el?.groupId) return null;
    if (gid === null) gid = el.groupId;
    else if (gid !== el.groupId) return null;
  }
  return gid;
}

/** Mutator: assign `groupId` to all groupable selected elements. */
export function applyGrouping(
  m: Model,
  sel: Selection[],
  groupId: string,
): void {
  for (const s of sel.filter(isGroupable)) {
    const el = findElement(m, s);
    if (el) el.groupId = groupId;
  }
}

/** Mutator: dissolve a group. */
export function applyUngrouping(m: Model, groupId: string): void {
  for (const w of m.walls) {
    if (w.groupId === groupId) delete w.groupId;
  }
  for (const h of m.hvac) {
    if (h.groupId === groupId) delete h.groupId;
  }
}

/** Mutator: put saved element copies back (reset before a live-drag update). */
export function restoreElements(
  m: Model,
  origWalls: Wall[],
  origHvac: HvacElement[],
): void {
  for (const ow of origWalls) {
    const i = m.walls.findIndex((w) => w.id === ow.id);
    if (i >= 0) m.walls[i] = structuredClone(ow);
  }
  for (const oh of origHvac) {
    const i = m.hvac.findIndex((h) => h.id === oh.id);
    if (i >= 0) m.hvac[i] = structuredClone(oh);
  }
}

const shift = (p: Point, d: Point): Point => ({ x: p.x + d.x, y: p.y + d.y });

/** Mutator: translate all selected walls and hvac elements by `delta` (cm). */
export function translateSelection(
  m: Model,
  sel: Selection[],
  delta: Point,
): void {
  for (const s of sel) {
    const el = findElement(m, s);
    if (!el) continue;
    if (s.type === "wall") {
      const w = el as Wall;
      w.a = shift(w.a, delta);
      w.b = shift(w.b, delta);
      continue;
    }
    const h = el as HvacElement;
    switch (h.kind) {
      case "duct":
        h.points = h.points.map((p) => shift(p, delta));
        break;
      case "jumperDuct":
        h.posA = shift(h.posA, delta);
        h.posB = shift(h.posB, delta);
        break;
      case "facadePenetration":
        // positioned on its wall (wallId + t) — moves with the wall
        break;
      default:
        h.pos = shift(h.pos, delta);
    }
  }
}
