import { beforeEach, describe, expect, it } from "vitest";
import { commitDuctDraft, deleteSelection } from "./actions";
import { useStore } from "./store";
import { emptyModel, type AcUnit, type SupplyDiffuser } from "./types";

describe("duct drafting actions", () => {
  beforeEach(() => {
    useStore.getState().replaceModel(emptyModel());
  });

  it("automatically binds a finished route clicked from a unit body to a vent", () => {
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
    const model = emptyModel();
    model.hvac.push(ac, vent);
    useStore.getState().replaceModel(model);
    useStore.getState().setDraftPath([
      { x: 100, y: 65 },
      { x: 200, y: 100 },
      { x: 300, y: 300 },
    ]);

    commitDuctDraft();

    const route = useStore
      .getState()
      .model.hvac.find((element) => element.kind === "duct");
    expect(route?.startConnection).toEqual({
      elementId: "ac-1",
      portId: "top",
    });
    expect(route?.endConnection).toEqual({
      elementId: "vent-1",
      portId: "center",
    });
  });

  it("turns a binding into an open end when its equipment is deleted", () => {
    const model = emptyModel();
    model.hvac.push(
      {
        kind: "acUnit",
        id: "ac-1",
        label: "AC 1",
        pos: { x: 100, y: 100 },
        rotation: 0,
        width: 90,
        depth: 70,
        height: 25,
        airflow: 350,
      },
      {
        kind: "duct",
        id: "duct-1",
        points: [
          { x: 145, y: 100 },
          { x: 300, y: 300 },
        ],
        diameter: 160,
        insulated: false,
        startConnection: { elementId: "ac-1", portId: "right" },
      },
    );
    useStore.getState().replaceModel(model);

    deleteSelection([{ type: "hvac", id: "ac-1" }]);

    const route = useStore
      .getState()
      .model.hvac.find((element) => element.kind === "duct");
    expect(route?.startConnection).toBeUndefined();
  });
});
