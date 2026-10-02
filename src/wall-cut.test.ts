import { describe, expect, it } from "vitest";
import { cutWallSegment } from "./wall-cut";
import { openingCenter } from "./openings";
import { emptyModel, type Model, type Wall } from "./types";

function makeModel(): Model {
  const m = emptyModel();
  m.walls.push({
    id: "w1",
    a: { x: 0, y: 0 },
    b: { x: 400, y: 0 },
    thickness: 25,
    loadBearing: true,
    groupId: "g1",
  });
  return m;
}

const wallById = (m: Model, id: string): Wall | undefined =>
  m.walls.find((w) => w.id === id);

describe("cutWallSegment", () => {
  it("removes the middle span and leaves two walls with inherited props", () => {
    const m = makeModel();
    cutWallSegment(m, "w1", 100 / 400, 300 / 400, "p1", "p2");
    expect(m.walls).toHaveLength(2);
    const p1 = wallById(m, "p1")!;
    const p2 = wallById(m, "p2")!;
    expect(p1.a).toEqual({ x: 0, y: 0 });
    expect(p1.b).toEqual({ x: 100, y: 0 });
    expect(p2.a).toEqual({ x: 300, y: 0 });
    expect(p2.b).toEqual({ x: 400, y: 0 });
    expect(p1.thickness).toBe(25);
    expect(p1.loadBearing).toBe(true);
    expect(p1.groupId).toBe("g1");
  });

  it("accepts t values in any order and clamps beyond the ends", () => {
    const m = makeModel();
    cutWallSegment(m, "w1", 0.75, -0.2, "p1", "p2");
    expect(m.walls).toHaveLength(1);
    expect(m.walls[0].a).toEqual({ x: 300, y: 0 });
    expect(m.walls[0].b).toEqual({ x: 400, y: 0 });
  });

  it("deletes the whole wall when the span covers it", () => {
    const m = makeModel();
    cutWallSegment(m, "w1", 0, 1, "p1", "p2");
    expect(m.walls).toHaveLength(0);
  });

  it("drops slivers shorter than 1 cm", () => {
    const m = makeModel();
    cutWallSegment(m, "w1", 0.5 / 400, 0.5, "p1", "p2");
    expect(m.walls).toHaveLength(1);
    expect(m.walls[0].id).toBe("p2");
  });

  it("keeps openings in retained pieces at the same world position", () => {
    const m = makeModel();
    m.openings.push({
      id: "o1",
      wallId: "w1",
      type: "door",
      t: 50 / 400, // center at x=50 → in left piece [0,100]
      width: 90,
      height: 205,
      sill: 0,
    });
    cutWallSegment(m, "w1", 100 / 400, 300 / 400, "p1", "p2");
    expect(m.openings).toHaveLength(1);
    const o = m.openings[0];
    expect(o.wallId).toBe("p1");
    expect(openingCenter(wallById(m, "p1")!, o).x).toBeCloseTo(50);
  });

  it("deletes openings inside the removed span or straddling a cut", () => {
    const m = makeModel();
    m.openings.push(
      {
        id: "inside",
        wallId: "w1",
        type: "window",
        t: 0.5, // center 200 → removed
        width: 120,
        height: 130,
        sill: 90,
      },
      {
        id: "straddle",
        wallId: "w1",
        type: "door",
        t: 90 / 400, // center 90, width 90 → spans 45..135, crosses cut at 100
        width: 90,
        height: 205,
        sill: 0,
      },
    );
    cutWallSegment(m, "w1", 100 / 400, 300 / 400, "p1", "p2");
    expect(m.openings).toHaveLength(0);
  });

  it("remaps facade penetrations into retained pieces and drops removed ones", () => {
    const m = makeModel();
    m.hvac.push(
      {
        kind: "facadePenetration",
        id: "f-keep",
        wallId: "w1",
        t: 350 / 400, // x=350 → right piece
        diameter: 160,
        drillDiameter: 180,
        drillAuto: true,
        heightAboveFloor: 220,
      },
      {
        kind: "facadePenetration",
        id: "f-gone",
        wallId: "w1",
        t: 0.5, // removed span
        diameter: 160,
        drillDiameter: 180,
        drillAuto: true,
        heightAboveFloor: 220,
      },
    );
    cutWallSegment(m, "w1", 100 / 400, 300 / 400, "p1", "p2");
    const kept = m.hvac.find((h) => h.id === "f-keep");
    expect(m.hvac).toHaveLength(1);
    expect(kept?.kind === "facadePenetration" && kept.wallId).toBe("p2");
    // world position preserved: piece2 spans 300..400, t=0.5 → x=350
    expect(kept?.kind === "facadePenetration" && kept.t).toBeCloseTo(0.5);
  });

  it("does nothing for an unknown wall or an empty span", () => {
    const m = makeModel();
    cutWallSegment(m, "nope", 0.2, 0.4, "p1", "p2");
    expect(m.walls).toHaveLength(1);
    cutWallSegment(m, "w1", 0.3, 0.3, "p1", "p2");
    expect(m.walls).toHaveLength(1);
    expect(m.walls[0].id).toBe("w1");
  });
});
