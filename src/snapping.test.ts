import { describe, expect, it } from "vitest";
import { snapDraftPoint, snapMeasurementPoint } from "./snapping";
import type { Wall } from "./types";

const walls: Wall[] = [
  {
    id: "w1",
    a: { x: 0, y: 0 },
    b: { x: 400, y: 0 },
    thickness: 25,
    loadBearing: false,
  },
];
const GRID = 5;
const TOL = 12;

describe("snapDraftPoint", () => {
  it("snaps to a nearby wall endpoint above everything else", () => {
    const p = snapDraftPoint({ x: 396, y: 4 }, null, {}, walls, TOL, GRID);
    expect(p).toEqual({ x: 400, y: 0 });
  });

  it("returns the raw point when free (Alt)", () => {
    const p = snapDraftPoint(
      { x: 101, y: 77 },
      { x: 0, y: 0 },
      { free: true },
      walls,
      TOL,
      GRID,
    );
    expect(p).toEqual({ x: 101, y: 77 });
  });

  it("lets Alt pull away granularly even inside an endpoint magnet radius", () => {
    const p = snapDraftPoint(
      { x: 396.25, y: 3.5 },
      null,
      { free: true },
      walls,
      TOL,
      GRID,
    );
    expect(p).toEqual({ x: 396.25, y: 3.5 });
  });

  it("locks to the dominant axis and grid from an anchor (default and Shift)", () => {
    const anchor = { x: 100, y: 100 };
    // mostly horizontal movement → y locked to anchor, x on grid
    const def = snapDraftPoint({ x: 203, y: 110 }, anchor, {}, walls, TOL, GRID);
    expect(def).toEqual({ x: 205, y: 100 });
    // Shift = still axis-locked (straight wall), just no grid rounding
    const fine = snapDraftPoint(
      { x: 203, y: 110 },
      anchor,
      { fine: true },
      walls,
      TOL,
      GRID,
    );
    expect(fine).toEqual({ x: 203, y: 100 });
  });

  it("locks vertical movement to the x of the anchor", () => {
    const anchor = { x: 100, y: 100 };
    const p = snapDraftPoint({ x: 92, y: 222 }, anchor, {}, walls, TOL, GRID);
    expect(p).toEqual({ x: 100, y: 220 });
  });

  it("snaps to the grid without an anchor; fine skips the grid", () => {
    expect(snapDraftPoint({ x: 33, y: 51 }, null, {}, walls, TOL, GRID)).toEqual(
      { x: 35, y: 50 },
    );
    expect(
      snapDraftPoint({ x: 33, y: 51 }, null, { fine: true }, walls, TOL, GRID),
    ).toEqual({ x: 33, y: 51 });
  });

  describe("wall centerline snapping (T-junctions)", () => {
    // vertical exterior wall, 25 cm thick, centerline at x = 200
    const vertical: Wall[] = [
      {
        id: "v1",
        a: { x: 200, y: 0 },
        b: { x: 200, y: 400 },
        thickness: 25,
        loadBearing: true,
      },
    ];

    it("projects a click inside the wall band onto the centerline", () => {
      // 8 cm off the centerline — inside the 12.5 cm half-band
      const p = snapDraftPoint({ x: 208, y: 152 }, null, {}, vertical, TOL, GRID);
      expect(p.x).toBe(200);
      expect(p.y).toBe(150); // along-axis still grid-snapped
    });

    it("keeps the axis lock and lands exactly on a perpendicular wall", () => {
      // drawing horizontally from the anchor toward the vertical wall
      const anchor = { x: 20, y: 100 };
      const p = snapDraftPoint(
        { x: 193, y: 108 },
        anchor,
        {},
        vertical,
        TOL,
        GRID,
      );
      expect(p).toEqual({ x: 200, y: 100 });
    });

    it("does not snap beyond the band + tolerance", () => {
      const p = snapDraftPoint({ x: 240, y: 150 }, null, {}, vertical, TOL, GRID);
      expect(p).toEqual({ x: 240, y: 150 });
    });

    it("endpoint snap still wins near a corner", () => {
      const p = snapDraftPoint({ x: 204, y: 396 }, null, {}, vertical, TOL, GRID);
      expect(p).toEqual({ x: 200, y: 400 });
    });

    it("free (Alt) disables wall snapping too", () => {
      const p = snapDraftPoint(
        { x: 208, y: 152 },
        null,
        { free: true },
        vertical,
        TOL,
        GRID,
      );
      expect(p).toEqual({ x: 208, y: 152 });
    });
  });
});

describe("snapMeasurementPoint", () => {
  it("snaps to the nearest wall face instead of the centerline", () => {
    expect(
      snapMeasurementPoint({ x: 150, y: 3 }, {}, walls, TOL, GRID),
    ).toEqual({ x: 150, y: 12.5 });
    expect(
      snapMeasurementPoint({ x: 150, y: -4 }, {}, walls, TOL, GRID),
    ).toEqual({ x: 150, y: -12.5 });
  });

  it("snaps to rendered wall corners and end faces", () => {
    expect(
      snapMeasurementPoint({ x: -11, y: -13 }, {}, walls, TOL, GRID),
    ).toEqual({ x: -12.5, y: -12.5 });
    expect(
      snapMeasurementPoint({ x: -9, y: 0 }, {}, walls, TOL, GRID),
    ).toEqual({ x: -12.5, y: 0 });
  });

  it("keeps grid snapping when no wall edge is nearby", () => {
    expect(
      snapMeasurementPoint({ x: 153, y: 80 }, {}, walls, TOL, GRID),
    ).toEqual({ x: 155, y: 80 });
  });

  it("uses the raw point with Alt and skips only the grid with Shift", () => {
    expect(
      snapMeasurementPoint({ x: 151, y: 3 }, { free: true }, walls, TOL, GRID),
    ).toEqual({ x: 151, y: 3 });
    expect(
      snapMeasurementPoint({ x: 151, y: 3 }, { fine: true }, walls, TOL, GRID),
    ).toEqual({ x: 151, y: 12.5 });
  });
});
