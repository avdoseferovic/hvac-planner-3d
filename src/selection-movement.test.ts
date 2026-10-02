import { describe, expect, it } from "vitest";
import { resolveDuctPoints } from "./hvac";
import { moveSelectionPreservingJoints } from "./selection-movement";
import { emptyModel, type Wall } from "./types";

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

describe("keyboard selection movement", () => {
  it("nudges a wall while stretching every adjoining corner", () => {
    const model = emptyModel();
    model.walls = [
      wall("top", 0, 0, 400, 0),
      wall("right", 400, 0, 400, 300),
      wall("bottom", 400, 300, 0, 300),
      wall("left", 0, 300, 0, 0),
    ];

    moveSelectionPreservingJoints(
      model,
      [{ type: "wall", id: "top" }],
      { x: 0, y: 1 },
    );

    expect(model.walls[0]).toMatchObject({
      a: { x: 0, y: 1 },
      b: { x: 400, y: 1 },
    });
    expect(model.walls[1].a).toEqual({ x: 400, y: 1 });
    expect(model.walls[3].b).toEqual({ x: 0, y: 1 });
  });

  it("moves selected connected equipment and its bound route follows", () => {
    const model = emptyModel();
    model.hvac = [
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
          { x: 300, y: 200 },
        ],
        diameter: 160,
        insulated: false,
        startConnection: { elementId: "ac-1", portId: "right" },
      },
    ];

    moveSelectionPreservingJoints(
      model,
      [{ type: "hvac", id: "ac-1" }],
      { x: 0.1, y: -1 },
    );

    expect(model.hvac[0]).toMatchObject({
      pos: { x: 100.1, y: 99 },
    });
    const route = model.hvac[1];
    expect(
      route.kind === "duct"
        ? resolveDuctPoints(route, model.hvac, model.walls)[0]
        : null,
    ).toEqual({ x: 145.1, y: 99 });
  });
});
