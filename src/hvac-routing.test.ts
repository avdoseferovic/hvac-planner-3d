import { describe, expect, it } from "vitest";
import { buildDuctRoute3D } from "./hvac-routing";
import type {
  AcUnit,
  Duct,
  HrvUnit,
  ProjectSettings,
  SupplyDiffuser,
} from "./types";

const settings: ProjectSettings = {
  gridSize: 5,
  wallHeight: 280,
  slabThickness: 20,
  atticHeight: 250,
  exteriorWallThickness: 25,
  interiorWallThickness: 14,
  keepOutWidth: 60,
};

describe("3D connected duct routes", () => {
  it("runs from the unit side port, up to the attic route, and down through the vent", () => {
    const ac: AcUnit = {
      kind: "acUnit",
      id: "ac-1",
      label: "AC 1",
      pos: { x: 100, y: 100 },
      rotation: 0,
      width: 90,
      depth: 70,
      height: 25,
      airflow: 350,
    };
    const vent: SupplyDiffuser = {
      kind: "supplyDiffuser",
      id: "vent-1",
      pos: { x: 300, y: 300 },
      connDiameter: 125,
      drillDiameter: 145,
      drillAuto: true,
      airflow: 90,
    };
    const route: Duct = {
      kind: "duct",
      id: "duct-1",
      points: [
        { x: 145, y: 100 },
        { x: 220, y: 100 },
        { x: 300, y: 300 },
      ],
      diameter: 160,
      insulated: false,
      startConnection: { elementId: "ac-1", portId: "right" },
      endConnection: { elementId: "vent-1", portId: "center" },
    };

    const points = buildDuctRoute3D(route, [ac, vent, route], [], settings);

    expect(points[0]).toEqual({ x: 1.45, y: 3.125, z: 1 });
    expect(points[1]).toMatchObject({ x: 1.45, z: 1 });
    expect(points[1].y).toBeCloseTo(3.3);
    expect(points.at(-2)).toMatchObject({ x: 3, z: 3 });
    expect(points.at(-2)?.y).toBeCloseTo(3.3);
    expect(points.at(-1)).toMatchObject({ x: 3, z: 3 });
    expect(points.at(-1)?.y).toBeCloseTo(2.8);
  });

  it("uses the live rotated HRV port as the 3D route origin", () => {
    const hrv: HrvUnit = {
      kind: "hrvUnit",
      id: "hrv-1",
      label: "HRV 1",
      pos: { x: 300, y: 100 },
      rotation: 90,
      width: 110,
      depth: 60,
      height: 30,
      nominalFlow: 350,
    };
    const route: Duct = {
      kind: "duct",
      id: "duct-hrv",
      points: [
        { x: 300, y: 70 },
        { x: 400, y: 250 },
      ],
      diameter: 160,
      insulated: true,
      startConnection: { elementId: "hrv-1", portId: "top" },
    };

    const points = buildDuctRoute3D(route, [hrv, route], [], settings);

    expect(points[0].x).toBeCloseTo(3.3);
    expect(points[0].y).toBeCloseTo(3.15);
    expect(points[0].z).toBeCloseTo(1);
    expect(points[1].x).toBeCloseTo(3.3);
    expect(points[1].z).toBeCloseTo(1);
    expect(points[1].y).toBeCloseTo(3.3);
  });
});
