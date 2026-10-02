import { describe, expect, it } from "vitest";
import {
  createRoomSlabGeometry,
  createRoomSurfaceGeometry,
  flatRoofLayout,
  roofLayout,
} from "./scene-geometry";
import type { Bounds } from "./components/view3d/bounds3d";

const rectangle = [
  { x: 100, y: 200 },
  { x: 500, y: 200 },
  { x: 500, y: 600 },
  { x: 100, y: 600 },
];

describe("3D scene geometry", () => {
  it("maps plan X/Y to scene X/Z without mirroring or detaching the floor", () => {
    const geometry = createRoomSurfaceGeometry(rectangle);
    geometry.computeBoundingBox();

    expect(geometry.boundingBox?.min.x).toBeCloseTo(1);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(5);
    expect(geometry.boundingBox?.min.z).toBeCloseTo(2);
    expect(geometry.boundingBox?.max.z).toBeCloseTo(6);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(0);

    geometry.dispose();
  });

  it("extrudes room slabs downward from the finished-floor plane", () => {
    const geometry = createRoomSlabGeometry(rectangle, 0.2);
    geometry.computeBoundingBox();

    expect(geometry.boundingBox?.min.x).toBeCloseTo(1);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(5);
    expect(geometry.boundingBox?.min.z).toBeCloseTo(2);
    expect(geometry.boundingBox?.max.z).toBeCloseTo(6);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(-0.2);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(0);

    geometry.dispose();
  });

  it("centers both roof planes exactly between ridge and eaves", () => {
    const bounds: Bounds = {
      cx: 4,
      cz: 3,
      minX: 0,
      minZ: 0,
      maxX: 8,
      maxZ: 6,
      radius: 5,
    };
    const layout = roofLayout(bounds, 2.5);

    expect(layout.ridgeAlongX).toBe(true);
    expect(layout.halfSpan).toBeCloseTo(3.32);
    expect(layout.panelCenterOffset).toBeCloseTo(layout.halfSpan / 2);
    expect(layout.ridgeLength).toBeCloseTo(8.64);

    const horizontalRun =
      Math.cos(layout.slope) * (layout.slopeLength / 2);
    const verticalRise =
      Math.sin(layout.slope) * (layout.slopeLength / 2);
    expect(layout.panelCenterOffset - horizontalRun).toBeCloseTo(0);
    expect(layout.panelCenterOffset + horizontalRun).toBeCloseTo(
      layout.halfSpan,
    );
    expect(layout.roofHeight / 2 + verticalRise).toBeCloseTo(
      layout.roofHeight,
    );
    expect(layout.roofHeight / 2 - verticalRise).toBeCloseTo(0);
  });

  it("centers a parapeted flat roof over the building footprint", () => {
    const bounds: Bounds = {
      cx: 4,
      cz: 3,
      minX: 0,
      minZ: 0,
      maxX: 8,
      maxZ: 6,
      radius: 5,
    };

    const layout = flatRoofLayout(bounds, false);

    expect(layout.centerX).toBe(4);
    expect(layout.centerZ).toBe(3);
    expect(layout.width).toBeCloseTo(8.24);
    expect(layout.depth).toBeCloseTo(6.24);
    expect(layout.deckThickness).toBeCloseTo(0.18);
    expect(layout.parapetHeight).toBeCloseTo(0.34);
    expect(layout.pitchRise).toBe(0);
    expect(layout.pitchAngle).toBe(0);
  });

  it("gives the flat metal roof a 2.5% fall along its shorter span", () => {
    const bounds: Bounds = {
      cx: 4,
      cz: 3,
      minX: 0,
      minZ: 0,
      maxX: 8,
      maxZ: 6,
      radius: 5,
    };

    const layout = flatRoofLayout(bounds, true);

    expect(layout.pitchAlongX).toBe(false);
    expect(layout.pitchRun).toBeCloseTo(6.24);
    expect(layout.pitchRise).toBeCloseTo(6.24 * 0.025);
    expect(Math.tan(layout.pitchAngle)).toBeCloseTo(0.025);
    expect(layout.parapetHeight).toBe(0);
  });
});
