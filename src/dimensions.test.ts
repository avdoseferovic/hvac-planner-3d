import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DimensionsLayer } from "./components/editor2d/DimensionsLayer";
import { wallDimension } from "./dimensions";
import { detectRooms } from "./rooms";
import type { Wall } from "./types";

let id = 0;
const wall = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  thickness = 20,
): Wall => ({
  id: `w${++id}`,
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  thickness,
  loadBearing: false,
});

const rectangle = (width = 400, height = 300, thickness = 20) => [
  wall(0, 0, width, 0, thickness),
  wall(width, 0, width, height, thickness),
  wall(width, height, 0, height, thickness),
  wall(0, height, 0, 0, thickness),
];

describe("wallDimension", () => {
  it("references the wall face instead of its centerline", () => {
    const walls = [wall(0, 0, 100, 0, 20)];

    const dimension = wallDimension(walls[0], walls, []);

    expect(dimension.faceA).toEqual({ x: 0, y: 10 });
    expect(dimension.faceB).toEqual({ x: 100, y: 10 });
    expect(dimension.length).toBe(100);
  });

  it("measures the exterior faces around a closed wall loop", () => {
    const walls = rectangle();
    const rooms = detectRooms(walls, {});

    const top = wallDimension(walls[0], walls, rooms);
    const right = wallDimension(walls[1], walls, rooms);

    expect(top.faceA.x).toBeCloseTo(-10);
    expect(top.faceA.y).toBeCloseTo(-10);
    expect(top.faceB.x).toBeCloseTo(410);
    expect(top.faceB.y).toBeCloseTo(-10);
    expect(top.length).toBeCloseTo(420);
    expect(right.length).toBeCloseTo(320);
  });

  it("uses the adjoining wall thickness at exterior corners", () => {
    const walls = rectangle();
    walls[1].thickness = 30;
    walls[3].thickness = 30;
    const rooms = detectRooms(walls, {});

    const top = wallDimension(walls[0], walls, rooms);

    expect(top.faceA.x).toBeCloseTo(-15);
    expect(top.faceB.x).toBeCloseTo(415);
    expect(top.length).toBeCloseTo(430);
  });

  it("follows the exterior face through a concave corner", () => {
    const walls = [
      wall(0, 0, 300, 0),
      wall(300, 0, 300, 100),
      wall(300, 100, 100, 100),
      wall(100, 100, 100, 300),
      wall(100, 300, 0, 300),
      wall(0, 300, 0, 0),
    ];
    const rooms = detectRooms(walls, {});

    const inset = wallDimension(walls[2], walls, rooms);

    expect(inset.faceA).toEqual({ x: 310, y: 110 });
    expect(inset.faceB).toEqual({ x: 110, y: 110 });
    expect(inset.length).toBe(200);
  });

  it("measures an interior wall between the inner faces of adjoining walls", () => {
    const walls = [...rectangle(), wall(200, 0, 200, 300, 14)];
    const rooms = detectRooms(walls, {});

    const divider = wallDimension(walls[4], walls, rooms);

    expect(divider.faceA).toEqual({ x: 207, y: 10 });
    expect(divider.faceB).toEqual({ x: 207, y: 290 });
    expect(divider.length).toBe(280);
  });

  it("renders witness lines from the wall face and labels the face length", () => {
    const walls = rectangle();
    const rooms = detectRooms(walls, {});

    const svg = renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(DimensionsLayer, { walls, rooms, scale: 1 }),
      ),
    );

    expect(svg).toContain('data-wall-dimension-id="w');
    expect(svg).toContain(
      'data-dimension-witness="start" x1="-10" y1="-10"',
    );
    expect(svg).toContain(">420</text>");
  });
});
