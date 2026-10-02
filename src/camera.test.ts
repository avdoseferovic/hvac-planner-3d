import { describe, expect, it } from "vitest";
import {
  contentBounds,
  fitCamera,
  MAX_SCALE,
  MIN_SCALE,
  rotateCamera,
  rotateVec,
  screenOffsetToWorld,
  zoomAt,
  type Camera,
} from "./camera";
import { emptyModel, type Model } from "./types";

function modelWithWalls(): Model {
  const m = emptyModel();
  m.walls.push(
    {
      id: "w1",
      a: { x: 0, y: 0 },
      b: { x: 1000, y: 0 },
      thickness: 20,
      loadBearing: true,
    },
    {
      id: "w2",
      a: { x: 0, y: 0 },
      b: { x: 0, y: 600 },
      thickness: 20,
      loadBearing: true,
    },
  );
  return m;
}

describe("contentBounds", () => {
  it("returns null for an empty model", () => {
    expect(contentBounds(emptyModel())).toBeNull();
  });

  it("covers wall endpoints expanded by half thickness", () => {
    const b = contentBounds(modelWithWalls())!;
    expect(b.minX).toBe(-10);
    expect(b.minY).toBe(-10);
    expect(b.maxX).toBe(1010);
    expect(b.maxY).toBe(610);
  });

  it("includes hvac elements (duct points and unit footprints)", () => {
    const m = emptyModel();
    m.hvac.push(
      {
        kind: "duct",
        id: "d1",
        points: [
          { x: -200, y: 50 },
          { x: 300, y: 400 },
        ],
        diameter: 160,
        insulated: false,
      },
      {
        kind: "acUnit",
        id: "ac1",
        label: "AC",
        pos: { x: 500, y: 500 },
        rotation: 0,
        width: 100,
        depth: 30,
        height: 30,
        airflow: 300,
      },
    );
    const ductR = 160 / 10 / 2; // duct radius in cm
    const b = contentBounds(m)!;
    expect(b.minX).toBe(-200 - ductR);
    expect(b.minY).toBe(50 - ductR);
    expect(b.maxX).toBe(550); // ac pos.x + width/2
    expect(b.maxY).toBe(550); // ac pos.y + max(width,depth)/2
  });
});

describe("fitCamera", () => {
  it("returns null when the model has no content", () => {
    expect(fitCamera(emptyModel(), 800, 600)).toBeNull();
  });

  it("centers the camera on the content and fits it with padding", () => {
    const cam = fitCamera(modelWithWalls(), 800, 600, 40)!;
    expect(cam.cx).toBeCloseTo(500);
    expect(cam.cy).toBeCloseTo(300);
    // content is 1020 x 620 cm; available 720 x 520 px
    const expected = Math.min(720 / 1020, 520 / 620);
    expect(cam.scale).toBeCloseTo(expected);
  });

  it("caps the scale for tiny content instead of zooming to infinity", () => {
    const m = emptyModel();
    m.hvac.push({
      kind: "supplyDiffuser",
      id: "s1",
      pos: { x: 100, y: 100 },
      connDiameter: 125,
      drillDiameter: 145,
      drillAuto: true,
      airflow: 30,
    });
    const cam = fitCamera(m, 800, 600)!;
    expect(Number.isFinite(cam.scale)).toBe(true);
    expect(cam.scale).toBeLessThanOrEqual(3);
    expect(cam.cx).toBeCloseTo(100);
    expect(cam.cy).toBeCloseTo(100);
  });

  it("never returns a scale below MIN_SCALE", () => {
    const m = emptyModel();
    m.walls.push({
      id: "w",
      a: { x: 0, y: 0 },
      b: { x: 10_000_000, y: 0 },
      thickness: 20,
      loadBearing: false,
    });
    const cam = fitCamera(m, 800, 600)!;
    expect(cam.scale).toBeGreaterThanOrEqual(MIN_SCALE);
  });
});

describe("zoomAt", () => {
  const cam: Camera = { cx: 100, cy: 200, scale: 1, rotation: 30 };

  it("multiplies the scale and keeps center and rotation", () => {
    const z = zoomAt(cam, 1.25);
    expect(z.scale).toBeCloseTo(1.25);
    expect(z.cx).toBe(100);
    expect(z.cy).toBe(200);
    expect(z.rotation).toBe(30);
  });

  it("clamps to MIN_SCALE and MAX_SCALE", () => {
    expect(zoomAt(cam, 1e-9).scale).toBe(MIN_SCALE);
    expect(zoomAt(cam, 1e9).scale).toBe(MAX_SCALE);
  });
});

describe("rotateVec", () => {
  it("rotates a vector by 90° (y-down screen space)", () => {
    const v = rotateVec({ x: 1, y: 0 }, 90);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(1);
  });

  it("is identity at 0°", () => {
    expect(rotateVec({ x: 3, y: -4 }, 0)).toEqual({ x: 3, y: -4 });
  });
});

describe("screenOffsetToWorld", () => {
  it("divides by scale when not rotated", () => {
    const cam: Camera = { cx: 0, cy: 0, scale: 2, rotation: 0 };
    const v = screenOffsetToWorld(cam, { x: 100, y: 50 });
    expect(v.x).toBeCloseTo(50);
    expect(v.y).toBeCloseTo(25);
  });

  it("un-rotates the offset for a rotated view", () => {
    const cam: Camera = { cx: 0, cy: 0, scale: 2, rotation: 90 };
    const v = screenOffsetToWorld(cam, { x: 100, y: 0 });
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(-50);
  });
});

describe("rotateCamera", () => {
  const cam: Camera = { cx: 5, cy: 6, scale: 1, rotation: 270 };

  it("adds the delta and normalizes to [0, 360)", () => {
    const r = rotateCamera(cam, 180);
    expect(r.rotation).toBe(90);
    expect(rotateCamera(cam, -280).rotation).toBe(350);
  });

  it("keeps center and scale", () => {
    const r = rotateCamera(cam, 90);
    expect(r.cx).toBe(5);
    expect(r.cy).toBe(6);
    expect(r.scale).toBe(1);
  });
});

describe("fitCamera with rotation", () => {
  it("swaps the fitting dimensions at 90° and preserves the rotation", () => {
    // content 1020 × 620 cm; viewport 800 × 600, padding 40 → avail 720 × 520
    const cam = fitCamera(modelWithWalls(), 800, 600, 40, 90)!;
    expect(cam.rotation).toBe(90);
    const expected = Math.min(720 / 620, 520 / 1020);
    expect(cam.scale).toBeCloseTo(expected);
    expect(cam.cx).toBeCloseTo(500);
    expect(cam.cy).toBeCloseTo(300);
  });

  it("defaults to rotation 0", () => {
    expect(fitCamera(modelWithWalls(), 800, 600)!.rotation).toBe(0);
  });
});
