import { describe, expect, it } from "vitest";
import {
  applyGrouping,
  applyUngrouping,
  expandToGroup,
  restoreElements,
  selectionGroupId,
  translateSelection,
} from "./grouping";
import { emptyModel, type Model, type Selection } from "./types";

function makeModel(): Model {
  const m = emptyModel();
  m.walls.push(
    {
      id: "w1",
      a: { x: 0, y: 0 },
      b: { x: 400, y: 0 },
      thickness: 25,
      loadBearing: true,
    },
    {
      id: "w2",
      a: { x: 400, y: 0 },
      b: { x: 400, y: 300 },
      thickness: 25,
      loadBearing: true,
    },
    {
      id: "w3",
      a: { x: 0, y: 300 },
      b: { x: 400, y: 300 },
      thickness: 14,
      loadBearing: false,
    },
  );
  m.hvac.push({
    kind: "supplyDiffuser",
    id: "h1",
    pos: { x: 100, y: 100 },
    connDiameter: 125,
    drillDiameter: 145,
    drillAuto: true,
    airflow: 30,
  });
  return m;
}

const sel = (type: Selection["type"], id: string): Selection => ({ type, id });

describe("applyGrouping / expandToGroup", () => {
  it("assigns a shared groupId to walls and hvac", () => {
    const m = makeModel();
    applyGrouping(m, [sel("wall", "w1"), sel("wall", "w2"), sel("hvac", "h1")], "g1");
    expect(m.walls[0].groupId).toBe("g1");
    expect(m.walls[1].groupId).toBe("g1");
    expect(m.walls[2].groupId).toBeUndefined();
    expect(m.hvac[0].groupId).toBe("g1");
  });

  it("expands a click on a grouped member to the whole group", () => {
    const m = makeModel();
    applyGrouping(m, [sel("wall", "w1"), sel("wall", "w2")], "g1");
    const expanded = expandToGroup(m, sel("wall", "w2"));
    expect(expanded).toHaveLength(2);
    expect(expanded.map((s) => s.id).sort()).toEqual(["w1", "w2"]);
  });

  it("returns just the item for ungrouped elements", () => {
    const m = makeModel();
    expect(expandToGroup(m, sel("wall", "w3"))).toEqual([sel("wall", "w3")]);
  });

  it("ignores rooms and openings when grouping", () => {
    const m = makeModel();
    applyGrouping(m, [sel("room", "r1"), sel("wall", "w1")], "g1");
    expect(m.walls[0].groupId).toBe("g1");
  });
});

describe("selectionGroupId", () => {
  it("returns the groupId when the whole selection shares one group", () => {
    const m = makeModel();
    applyGrouping(m, [sel("wall", "w1"), sel("wall", "w2")], "g1");
    expect(
      selectionGroupId(m, [sel("wall", "w1"), sel("wall", "w2")]),
    ).toBe("g1");
  });

  it("returns null for mixed or ungrouped selections", () => {
    const m = makeModel();
    applyGrouping(m, [sel("wall", "w1"), sel("wall", "w2")], "g1");
    expect(selectionGroupId(m, [sel("wall", "w1"), sel("wall", "w3")])).toBeNull();
    expect(selectionGroupId(m, [sel("wall", "w3")])).toBeNull();
    expect(selectionGroupId(m, [])).toBeNull();
  });
});

describe("applyUngrouping", () => {
  it("clears groupId from all members", () => {
    const m = makeModel();
    applyGrouping(m, [sel("wall", "w1"), sel("wall", "w2")], "g1");
    applyUngrouping(m, "g1");
    expect(m.walls[0].groupId).toBeUndefined();
    expect(m.walls[1].groupId).toBeUndefined();
  });
});

describe("restoreElements", () => {
  it("puts saved wall/hvac copies back into the model (live-drag reset)", () => {
    const m = makeModel();
    const origWall = structuredClone(m.walls[0]);
    const origHvac = structuredClone(m.hvac[0]);
    translateSelection(m, [sel("wall", "w1"), sel("hvac", "h1")], {
      x: 50,
      y: 50,
    });
    restoreElements(m, [origWall], [origHvac]);
    expect(m.walls[0].a).toEqual({ x: 0, y: 0 });
    const h = m.hvac[0];
    expect(h.kind === "supplyDiffuser" && h.pos).toEqual({ x: 100, y: 100 });
  });
});

describe("translateSelection", () => {
  it("moves selected walls (both endpoints) and hvac positions", () => {
    const m = makeModel();
    translateSelection(m, [sel("wall", "w1"), sel("hvac", "h1")], {
      x: 10,
      y: -20,
    });
    expect(m.walls[0].a).toEqual({ x: 10, y: -20 });
    expect(m.walls[0].b).toEqual({ x: 410, y: -20 });
    expect(m.walls[1].a).toEqual({ x: 400, y: 0 }); // untouched
    const h = m.hvac[0];
    expect(h.kind === "supplyDiffuser" && h.pos).toEqual({ x: 110, y: 80 });
  });

  it("moves duct polylines and jumper endpoints", () => {
    const m = makeModel();
    m.hvac.push(
      {
        kind: "duct",
        id: "d1",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        diameter: 160,
        insulated: false,
      },
      {
        kind: "jumperDuct",
        id: "j1",
        posA: { x: 10, y: 10 },
        posB: { x: 50, y: 10 },
        diameter: 125,
        drillDiameter: 145,
        drillAuto: true,
      },
    );
    translateSelection(m, [sel("hvac", "d1"), sel("hvac", "j1")], { x: 5, y: 5 });
    const d = m.hvac.find((h) => h.id === "d1");
    const j = m.hvac.find((h) => h.id === "j1");
    expect(d?.kind === "duct" && d.points[1]).toEqual({ x: 105, y: 5 });
    expect(j?.kind === "jumperDuct" && j.posA).toEqual({ x: 15, y: 15 });
  });
});
