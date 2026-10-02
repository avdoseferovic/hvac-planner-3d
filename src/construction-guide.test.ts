import { describe, expect, it } from "vitest";
import { snapToConstructionGuide } from "./construction-guide";

describe("snapToConstructionGuide", () => {
  const guide = { a: { x: 0, y: 0 }, b: { x: 400, y: 0 } };

  it("snaps to the closest endpoint of a completed measurement", () => {
    expect(snapToConstructionGuide({ x: 392, y: 4 }, guide, 12)).toEqual({
      x: 400,
      y: 0,
    });
    expect(snapToConstructionGuide({ x: 5, y: 3 }, guide, 12)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("does not alter a point outside the guide tolerance", () => {
    expect(snapToConstructionGuide({ x: 380, y: 0 }, guide, 12)).toBeNull();
    expect(snapToConstructionGuide({ x: 0, y: 0 }, null, 12)).toBeNull();
  });
});
