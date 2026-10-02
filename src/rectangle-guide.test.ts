import { describe, expect, it } from "vitest";
import { getRectangleGuide } from "./rectangle-guide";
import type { Point, Wall } from "./types";

const wall = (id: string, a: Point, b: Point): Wall => ({
  id,
  a,
  b,
  thickness: 25,
  loadBearing: false,
});

describe("getRectangleGuide", () => {
  it("suggests the missing sides after two connected perpendicular walls", () => {
    const walls = [
      wall("first", { x: 0, y: 0 }, { x: 400, y: 0 }),
      wall("second", { x: 400, y: 0 }, { x: 400, y: 300 }),
    ];

    expect(getRectangleGuide(walls, { x: 400, y: 300 })).toEqual({
      start: { x: 0, y: 0 },
      corner: { x: 400, y: 0 },
      end: { x: 400, y: 300 },
      suggestedCorner: { x: 0, y: 300 },
    });
  });

  it("works for a square drawn in the opposite direction", () => {
    const walls = [
      wall("first", { x: 100, y: 100 }, { x: 100, y: 500 }),
      wall("second", { x: 100, y: 500 }, { x: -300, y: 500 }),
    ];

    expect(getRectangleGuide(walls, { x: -300, y: 500 })).toMatchObject({
      start: { x: 100, y: 100 },
      suggestedCorner: { x: -300, y: 100 },
    });
  });

  it("does not suggest a rectangle for disconnected or non-right-angle walls", () => {
    const disconnected = [
      wall("first", { x: 0, y: 0 }, { x: 400, y: 0 }),
      wall("second", { x: 500, y: 0 }, { x: 500, y: 300 }),
    ];
    const diagonal = [
      wall("first", { x: 0, y: 0 }, { x: 400, y: 0 }),
      wall("second", { x: 400, y: 0 }, { x: 650, y: 300 }),
    ];

    expect(getRectangleGuide(disconnected, { x: 500, y: 300 })).toBeNull();
    expect(getRectangleGuide(diagonal, { x: 650, y: 300 })).toBeNull();
  });

  it("only guides the active wall chain and disappears once a side is already closed", () => {
    const walls = [
      wall("first", { x: 0, y: 0 }, { x: 400, y: 0 }),
      wall("second", { x: 400, y: 0 }, { x: 400, y: 300 }),
    ];

    expect(getRectangleGuide(walls, { x: 400, y: 280 })).toBeNull();

    const closed = [
      ...walls,
      wall("third", { x: 400, y: 300 }, { x: 0, y: 300 }),
    ];
    expect(getRectangleGuide(closed, { x: 0, y: 300 })).toBeNull();
  });
});
