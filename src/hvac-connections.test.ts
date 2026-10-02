import { describe, expect, it } from "vitest";
import {
  connectDuctEndpoints,
  ductConnectionTargets,
  findDuctConnectionTarget,
  resolveDuctPoints,
} from "./hvac";
import type {
  AcUnit,
  Duct,
  HrvUnit,
  HvacElement,
  SupplyDiffuser,
} from "./types";

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

const hrv: HrvUnit = {
  kind: "hrvUnit",
  id: "hrv-1",
  label: "HRV 1",
  pos: { x: 300, y: 100 },
  rotation: 0,
  width: 110,
  depth: 60,
  height: 30,
  nominalFlow: 350,
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

const duct = (points: Duct["points"]): Duct => ({
  kind: "duct",
  id: "duct-1",
  points,
  diameter: 160,
  insulated: false,
});

describe("HVAC connection ports", () => {
  it("exposes physical side ports for indoor units and HRV units", () => {
    const targets = ductConnectionTargets([ac, hrv], []);

    expect(
      targets.find(
        (target) =>
          target.connection.elementId === "ac-1" &&
          target.connection.portId === "right",
      )?.point,
    ).toEqual({ x: 145, y: 100 });
    expect(
      targets.find(
        (target) =>
          target.connection.elementId === "hrv-1" &&
          target.connection.portId === "top",
      )?.point,
    ).toEqual({ x: 300, y: 70 });
  });

  it("turns a click anywhere on a unit body into the nearest physical port", () => {
    const target = findDuctConnectionTarget(
      { x: 100, y: 100 },
      [ac],
      [],
      5,
    );

    expect(target?.connection).toEqual({
      elementId: "ac-1",
      portId: "top",
    });
    expect(target?.point).toEqual({ x: 100, y: 65 });
  });

  it("persists endpoint bindings when a route starts and ends on ports", () => {
    const route = duct([
      { x: 145, y: 100 },
      { x: 220, y: 100 },
      { x: 300, y: 300 },
    ]);

    connectDuctEndpoints(route, [ac, vent], []);

    expect(route.startConnection).toEqual({
      elementId: "ac-1",
      portId: "right",
    });
    expect(route.endConnection).toEqual({
      elementId: "vent-1",
      portId: "center",
    });
  });

  it("keeps bound route endpoints attached when equipment moves", () => {
    const route = duct([
      { x: 145, y: 100 },
      { x: 220, y: 100 },
      { x: 300, y: 300 },
    ]);
    const elements: HvacElement[] = [ac, vent, route];
    connectDuctEndpoints(route, elements, []);
    ac.pos = { x: 130, y: 120 };
    vent.pos = { x: 340, y: 320 };

    expect(resolveDuctPoints(route, elements, [])).toEqual([
      { x: 175, y: 120 },
      { x: 220, y: 100 },
      { x: 340, y: 320 },
    ]);
  });

  it("keeps an HRV route attached to the same named port after rotation", () => {
    const route = duct([
      { x: 300, y: 70 },
      { x: 300, y: 300 },
    ]);
    const elements: HvacElement[] = [hrv, vent, route];
    connectDuctEndpoints(route, elements, []);
    hrv.rotation = 90;

    expect(route.startConnection).toEqual({
      elementId: "hrv-1",
      portId: "top",
    });
    expect(resolveDuctPoints(route, elements, [])[0]).toEqual({
      x: 330,
      y: 100,
    });
  });
});
