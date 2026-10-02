import { describe, expect, it } from "vitest";
import {
  analyzeWallStructure,
  applyEndpointMove,
  applyWallMove,
  captureEndpointMove,
  captureWallMove,
  isWallConnectionPoint,
  snapWallMoveDelta,
} from "./wall-connections";
import type { Wall } from "./types";

const wall = (
  id: string,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Wall => ({
  id,
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  thickness: 20,
  loadBearing: false,
});

describe("wall movement precision", () => {
  it("uses a 1 cm move increment independently of the drawing grid", () => {
    expect(snapWallMoveDelta({ x: 3.6, y: -2.4 }, false)).toEqual({
      x: 4,
      y: -2,
    });
  });

  it("keeps the raw delta while fine movement is active", () => {
    expect(snapWallMoveDelta({ x: 3.625, y: -2.375 }, true)).toEqual({
      x: 3.625,
      y: -2.375,
    });
  });
});

describe("connected wall editing", () => {
  it("recognizes both corners and centerline hits as chain-finishing connections", () => {
    const walls = [wall("existing", 0, 0, 400, 0)];

    expect(isWallConnectionPoint({ x: 400, y: 0 }, walls)).toBe(true);
    expect(isWallConnectionPoint({ x: 180, y: 0 }, walls)).toBe(true);
    expect(isWallConnectionPoint({ x: 180, y: 40 }, walls)).toBe(false);
  });

  it("stretches adjoining walls when a joined wall is moved", () => {
    const walls = [
      wall("top", 0, 0, 400, 0),
      wall("right", 400, 0, 400, 300),
      wall("bottom", 400, 300, 0, 300),
      wall("left", 0, 300, 0, 0),
    ];
    const move = captureWallMove(walls, "top");

    applyWallMove(walls, move, { x: 0, y: 17 });

    expect(walls.find((w) => w.id === "top")).toMatchObject({
      a: { x: 0, y: 17 },
      b: { x: 400, y: 17 },
    });
    expect(walls.find((w) => w.id === "left")?.b).toEqual({ x: 0, y: 17 });
    expect(walls.find((w) => w.id === "right")?.a).toEqual({
      x: 400,
      y: 17,
    });
    expect(analyzeWallStructure(walls).openEnds).toHaveLength(0);
  });

  it("moves every endpoint in a corner joint during endpoint editing", () => {
    const walls = [
      wall("horizontal", 0, 0, 300, 0),
      wall("vertical", 300, 0, 300, 250),
    ];
    const move = captureEndpointMove(walls, "horizontal", "b");

    applyEndpointMove(walls, move, { x: 307.5, y: 6.25 });

    expect(walls[0].b).toEqual({ x: 307.5, y: 6.25 });
    expect(walls[1].a).toEqual({ x: 307.5, y: 6.25 });
  });

  it("treats an endpoint on another wall centerline as a real T-junction", () => {
    const walls = [
      wall("base", 0, 0, 400, 0),
      wall("divider", 180, 0, 180, 240),
    ];

    const analysis = analyzeWallStructure(walls);

    expect(analysis.joints.some((joint) => joint.connections === 2)).toBe(true);
    expect(analysis.openEnds).toEqual([
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 180, y: 240 },
    ]);
  });
});
