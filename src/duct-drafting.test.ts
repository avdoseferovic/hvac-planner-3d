import { describe, expect, it } from "vitest";
import {
  appendDuctRoutePoint,
  previewDuctRoute,
  simplifyDuctRoute,
} from "./duct-drafting";

describe("smart duct drafting", () => {
  it("adds a single automatic 90 degree elbow for a diagonal target", () => {
    expect(
      appendDuctRoutePoint(
        [{ x: 0, y: 0 }],
        { x: 120, y: 80 },
        "orthogonal",
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 80 },
    ]);
  });

  it("continues in the direction of the previous segment before bending", () => {
    expect(
      appendDuctRoutePoint(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        { x: 140, y: 80 },
        "orthogonal",
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 140, y: 0 },
      { x: 140, y: 80 },
    ]);

    expect(
      appendDuctRoutePoint(
        [
          { x: 0, y: 0 },
          { x: 0, y: 100 },
        ],
        { x: 80, y: 140 },
        "orthogonal",
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 140 },
      { x: 80, y: 140 },
    ]);
  });

  it("keeps direct mode as a deliberate diagonal route", () => {
    expect(
      appendDuctRoutePoint(
        [{ x: 0, y: 0 }],
        { x: 120, y: 80 },
        "direct",
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 120, y: 80 },
    ]);
  });

  it("removes duplicate and redundant collinear route vertices", () => {
    expect(
      simplifyDuctRoute([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
        { x: 200, y: 80 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 80 },
    ]);
  });

  it("uses the same smart geometry for the live preview", () => {
    expect(
      previewDuctRoute(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        { x: 160, y: 90 },
        "orthogonal",
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 160, y: 0 },
      { x: 160, y: 90 },
    ]);
  });
});
