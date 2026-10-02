import { describe, expect, it } from "vitest";
import { envelopeForPreset, calculateHeatLoads } from "./thermal-load";
import { DEFAULT_STORY_ID } from "./stories";
import { emptyModel, type Model, type Wall } from "./types";

function oneRoomModel(): Model {
  const model = emptyModel();
  const walls: Wall[] = [
    {
      id: "north",
      storyId: DEFAULT_STORY_ID,
      a: { x: 0, y: 0 },
      b: { x: 500, y: 0 },
      thickness: 25,
      loadBearing: true,
    },
    {
      id: "east",
      storyId: DEFAULT_STORY_ID,
      a: { x: 500, y: 0 },
      b: { x: 500, y: 400 },
      thickness: 25,
      loadBearing: true,
    },
    {
      id: "south",
      storyId: DEFAULT_STORY_ID,
      a: { x: 500, y: 400 },
      b: { x: 0, y: 400 },
      thickness: 25,
      loadBearing: true,
    },
    {
      id: "west",
      storyId: DEFAULT_STORY_ID,
      a: { x: 0, y: 400 },
      b: { x: 0, y: 0 },
      thickness: 25,
      loadBearing: true,
    },
  ];
  model.walls = walls;
  model.openings.push({
    id: "window",
    wallId: "south",
    type: "window",
    t: 0.5,
    width: 180,
    height: 140,
    sill: 90,
  });
  model.roomNames["east|north|south|west"] = "Living";
  return model;
}

describe("heat-pump / AC sizing", () => {
  it("reduces heating and cooling loads when the envelope improves", () => {
    const basic = oneRoomModel();
    basic.thermal.envelope = envelopeForPreset("basic");
    const high = structuredClone(basic);
    high.thermal.envelope = envelopeForPreset("highPerformance");

    const basicLoad = calculateHeatLoads(basic);
    const highLoad = calculateHeatLoads(high);

    expect(highLoad.heatingKw).toBeLessThan(basicLoad.heatingKw);
    expect(highLoad.coolingKw).toBeLessThan(basicLoad.coolingKw);
    expect(highLoad.recommendedCapacityKw).toBeLessThan(
      basicLoad.recommendedCapacityKw,
    );
  });

  it("uses per-window glazing overrides and solar gain", () => {
    const single = oneRoomModel();
    single.openings[0].uValue = 5.7;
    single.openings[0].shgc = 0.75;
    const triple = structuredClone(single);
    triple.openings[0].uValue = 0.9;
    triple.openings[0].shgc = 0.45;

    const singleLoad = calculateHeatLoads(single);
    const tripleLoad = calculateHeatLoads(triple);

    expect(tripleLoad.heatingKw).toBeLessThan(singleLoad.heatingKw);
    expect(tripleLoad.coolingKw).toBeLessThan(singleLoad.coolingKw);
    expect(singleLoad.rooms[0].breakdown.windowWatts).toBeGreaterThan(
      tripleLoad.rooms[0].breakdown.windowWatts,
    );
  });

  it("treats the floor and roof as exposed only on the bottom and top stories", () => {
    const model = oneRoomModel();
    model.stories.push({
      id: "story-upper",
      name: "Upper floor",
      elevation: 300,
    });
    const upperWalls = model.walls.map((wall) => ({
      ...wall,
      id: `upper-${wall.id}`,
      storyId: "story-upper",
    }));
    model.walls.push(...upperWalls);
    model.openings.push({
      ...model.openings[0],
      id: "upper-window",
      wallId: "upper-south",
    });

    const result = calculateHeatLoads(model);
    const ground = result.rooms.find(
      (room) => room.storyId === DEFAULT_STORY_ID,
    )!;
    const upper = result.rooms.find((room) => room.storyId === "story-upper")!;

    expect(ground.breakdown.floorWatts).toBeGreaterThan(0);
    expect(ground.breakdown.roofWatts).toBe(0);
    expect(upper.breakdown.floorWatts).toBe(0);
    expect(upper.breakdown.roofWatts).toBeGreaterThan(0);
    expect(result.heatingKw).toBeCloseTo(
      result.rooms.reduce((sum, room) => sum + room.heatingWatts, 0) / 1000,
      8,
    );
  });

  it("returns a standard equipment step at or above the design load", () => {
    const result = calculateHeatLoads(oneRoomModel());
    const design = Math.max(result.heatingKw, result.coolingKw);

    expect(result.recommendedCapacityKw).toBeGreaterThanOrEqual(design);
    expect([2.5, 3.5, 5, 7, 9, 12, 14, 16]).toContain(
      result.recommendedCapacityKw,
    );
  });

  it("uses plan orientation for window solar gains", () => {
    const south = oneRoomModel();
    const north = structuredClone(south);
    north.openings[0].wallId = "north";

    expect(calculateHeatLoads(south).coolingKw).toBeGreaterThan(
      calculateHeatLoads(north).coolingKw,
    );
  });

  it("counts split exterior-wall segments exactly once across adjacent rooms", () => {
    const model = emptyModel();
    model.walls = [
      {
        id: "top",
        a: { x: 0, y: 0 },
        b: { x: 1000, y: 0 },
        thickness: 25,
        loadBearing: true,
      },
      {
        id: "right",
        a: { x: 1000, y: 0 },
        b: { x: 1000, y: 400 },
        thickness: 25,
        loadBearing: true,
      },
      {
        id: "bottom",
        a: { x: 1000, y: 400 },
        b: { x: 0, y: 400 },
        thickness: 25,
        loadBearing: true,
      },
      {
        id: "left",
        a: { x: 0, y: 400 },
        b: { x: 0, y: 0 },
        thickness: 25,
        loadBearing: true,
      },
      {
        id: "partition",
        a: { x: 500, y: 0 },
        b: { x: 500, y: 400 },
        thickness: 14,
        loadBearing: false,
      },
    ];

    const result = calculateHeatLoads(model);
    const wallWatts = result.rooms.reduce(
      (sum, room) => sum + room.breakdown.wallWatts,
      0,
    );
    const expectedExteriorAreaM2 = 28 * 2.8;
    const expected =
      expectedExteriorAreaM2 *
      model.thermal.envelope.wallUValue *
      (model.thermal.indoorHeatingC - model.thermal.outdoorWinterC);

    expect(result.rooms).toHaveLength(2);
    expect(wallWatts).toBeCloseTo(expected, 6);
  });

  it("excludes rooms marked as unconditioned from system sizing", () => {
    const model = emptyModel();
    model.walls = [
      {
        id: "top",
        a: { x: 0, y: 0 },
        b: { x: 1000, y: 0 },
        thickness: 25,
        loadBearing: true,
      },
      {
        id: "right",
        a: { x: 1000, y: 0 },
        b: { x: 1000, y: 400 },
        thickness: 25,
        loadBearing: true,
      },
      {
        id: "bottom",
        a: { x: 1000, y: 400 },
        b: { x: 0, y: 400 },
        thickness: 25,
        loadBearing: true,
      },
      {
        id: "left",
        a: { x: 0, y: 400 },
        b: { x: 0, y: 0 },
        thickness: 25,
        loadBearing: true,
      },
      {
        id: "partition",
        a: { x: 500, y: 0 },
        b: { x: 500, y: 400 },
        thickness: 14,
        loadBearing: false,
      },
    ];

    const allConditioned = calculateHeatLoads(model);
    const excludedKey = allConditioned.rooms[0].roomKey;
    model.roomConditioning[excludedKey] = false;
    const result = calculateHeatLoads(model);
    const excluded = result.rooms.find(
      (room) => room.roomKey === excludedKey,
    )!;
    const included = result.rooms.filter((room) => room.conditioned);

    expect(excluded.conditioned).toBe(false);
    expect(result.heatingKw).toBeCloseTo(
      included.reduce((sum, room) => sum + room.heatingWatts, 0) / 1000,
      8,
    );
    expect(result.coolingKw).toBeCloseTo(
      included.reduce((sum, room) => sum + room.coolingWatts, 0) / 1000,
      8,
    );
    expect(result.heatingKw).toBeLessThan(allConditioned.heatingKw);
    expect(result.coolingKw).toBeLessThan(allConditioned.coolingKw);
  });

  it("recommends no equipment when every room is unconditioned", () => {
    const model = oneRoomModel();
    const roomKey = calculateHeatLoads(model).rooms[0].roomKey;
    model.roomConditioning[roomKey] = false;

    const result = calculateHeatLoads(model);

    expect(result.heatingKw).toBe(0);
    expect(result.coolingKw).toBe(0);
    expect(result.designKw).toBe(0);
    expect(result.recommendedCapacityKw).toBe(0);
  });
});
