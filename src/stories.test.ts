import { describe, expect, it } from "vitest";
import { emptyModel, type Wall } from "./types";
import {
  DEFAULT_STORY_ID,
  addClonedStory,
  modelForStory,
  normalizeStories,
} from "./stories";
import { detectRooms } from "./rooms";

const rectangle = (storyId?: string): Wall[] => [
  {
    id: "w1",
    storyId,
    a: { x: 0, y: 0 },
    b: { x: 400, y: 0 },
    thickness: 25,
    loadBearing: true,
  },
  {
    id: "w2",
    storyId,
    a: { x: 400, y: 0 },
    b: { x: 400, y: 300 },
    thickness: 25,
    loadBearing: true,
  },
  {
    id: "w3",
    storyId,
    a: { x: 400, y: 300 },
    b: { x: 0, y: 300 },
    thickness: 25,
    loadBearing: true,
  },
  {
    id: "w4",
    storyId,
    a: { x: 0, y: 300 },
    b: { x: 0, y: 0 },
    thickness: 25,
    loadBearing: true,
  },
];

describe("stories", () => {
  it("normalizes legacy one-floor models without losing elements", () => {
    const model = emptyModel();
    model.stories = [];
    model.walls = rectangle();
    model.hvac.push({
      kind: "acUnit",
      id: "ac1",
      label: "AC 1",
      pos: { x: 100, y: 100 },
      rotation: 0,
      width: 90,
      depth: 70,
      height: 25,
      airflow: 350,
    });

    normalizeStories(model);

    expect(model.stories).toEqual([
      {
        id: DEFAULT_STORY_ID,
        name: "Ground floor",
        elevation: 0,
      },
    ]);
    expect(model.walls.every((wall) => wall.storyId === DEFAULT_STORY_ID)).toBe(
      true,
    );
    expect(model.hvac[0].storyId).toBe(DEFAULT_STORY_ID);
  });

  it("duplicates the active outline, openings, and names into a new story", () => {
    const model = emptyModel();
    model.walls = rectangle(DEFAULT_STORY_ID);
    model.openings.push({
      id: "window-1",
      wallId: "w1",
      type: "window",
      t: 0.5,
      width: 140,
      height: 130,
      sill: 90,
    });
    model.roomNames["w1|w2|w3|w4"] = "Living";
    model.roomConditioning["w1|w2|w3|w4"] = false;

    const story = addClonedStory(model, DEFAULT_STORY_ID, {
      id: "story-upper",
      name: "Upper floor",
    });

    expect(story.elevation).toBe(
      model.settings.wallHeight + model.settings.slabThickness,
    );
    expect(model.stories).toHaveLength(2);
    const upper = modelForStory(model, "story-upper");
    expect(upper.walls).toHaveLength(4);
    expect(upper.walls.every((wall) => wall.storyId === "story-upper")).toBe(
      true,
    );
    expect(new Set(upper.walls.map((wall) => wall.id))).not.toContain("w1");
    expect(upper.openings).toHaveLength(1);
    expect(upper.walls.some((wall) => wall.id === upper.openings[0].wallId)).toBe(
      true,
    );
    expect(Object.values(model.roomNames)).toContain("Living");
    const [upperRoom] = detectRooms(upper.walls, model.roomNames, "Room");
    expect(model.roomConditioning[upperRoom.key]).toBe(false);
  });

  it("filters walls, openings, and HVAC by story", () => {
    const model = emptyModel();
    model.stories.push({
      id: "story-upper",
      name: "Upper floor",
      elevation: 300,
    });
    model.walls = [
      ...rectangle(DEFAULT_STORY_ID),
      ...rectangle("story-upper").map((wall) => ({
        ...wall,
        id: `up-${wall.id}`,
      })),
    ];
    model.openings.push({
      id: "up-window",
      wallId: "up-w1",
      type: "window",
      t: 0.5,
      width: 120,
      height: 120,
      sill: 90,
    });
    model.hvac.push({
      kind: "supplyDiffuser",
      id: "up-supply",
      storyId: "story-upper",
      pos: { x: 100, y: 100 },
      connDiameter: 125,
      drillDiameter: 145,
      drillAuto: true,
      airflow: 90,
    });

    const upper = modelForStory(model, "story-upper");

    expect(upper.walls).toHaveLength(4);
    expect(upper.openings.map((opening) => opening.id)).toEqual(["up-window"]);
    expect(upper.hvac.map((element) => element.id)).toEqual(["up-supply"]);
  });
});
