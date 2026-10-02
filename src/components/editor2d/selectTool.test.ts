import { describe, expect, it } from "vitest";
import { makeMultiDrag, pickSelection } from "./selectTool";
import { applyGrouping } from "../../grouping";
import { emptyModel, type Model, type Selection } from "../../types";

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
  return m;
}

const wall = (id: string): Selection => ({ type: "wall", id });

describe("pickSelection", () => {
  it("plain click selects the single element", () => {
    expect(pickSelection(makeModel(), [], wall("w1"), false)).toEqual([
      wall("w1"),
    ]);
  });

  it("plain click on a grouped element selects the whole group", () => {
    const m = makeModel();
    applyGrouping(m, [wall("w1"), wall("w2")], "g1");
    const sel = pickSelection(m, [], wall("w1"), false);
    expect(sel.map((s) => s.id).sort()).toEqual(["w1", "w2"]);
  });

  it("shift-click adds and removes elements from the selection", () => {
    const m = makeModel();
    const s1 = pickSelection(m, [wall("w1")], wall("w3"), true);
    expect(s1.map((s) => s.id).sort()).toEqual(["w1", "w3"]);
    const s2 = pickSelection(m, s1, wall("w3"), true);
    expect(s2.map((s) => s.id)).toEqual(["w1"]);
  });

  it("shift-click on a grouped element toggles the whole group", () => {
    const m = makeModel();
    applyGrouping(m, [wall("w1"), wall("w2")], "g1");
    const s1 = pickSelection(m, [wall("w3")], wall("w1"), true);
    expect(s1.map((s) => s.id).sort()).toEqual(["w1", "w2", "w3"]);
    const s2 = pickSelection(m, s1, wall("w2"), true);
    expect(s2.map((s) => s.id)).toEqual(["w3"]);
  });

  it("plain click on a member of a multi-selection keeps the selection", () => {
    const m = makeModel();
    const cur = [wall("w1"), wall("w3")];
    expect(pickSelection(m, cur, wall("w3"), false)).toEqual(cur);
  });

  it("shift-click on a room behaves like a plain click", () => {
    const m = makeModel();
    const room: Selection = { type: "room", id: "r1" };
    expect(pickSelection(m, [wall("w1")], room, true)).toEqual([room]);
  });
});

describe("makeMultiDrag", () => {
  it("snapshots the selected walls and hvac for the drag", () => {
    const m = makeModel();
    const drag = makeMultiDrag(m, [wall("w1"), wall("w3")], { x: 5, y: 5 });
    expect(drag.kind).toBe("moveMulti");
    expect(drag.origWalls.map((w) => w.id).sort()).toEqual(["w1", "w3"]);
    expect(drag.origHvac).toEqual([]);
    // deep copies, not references
    expect(drag.origWalls[0]).not.toBe(m.walls[0]);
  });
});
