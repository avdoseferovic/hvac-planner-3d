import { detectRooms } from "./rooms";
import {
  DEFAULT_STORY_ID as STORY_ID,
  type HvacElement,
  type Model,
  type Story,
  type Wall,
} from "./types";

export const DEFAULT_STORY_ID = STORY_ID;

export function storyIdOf(
  element: Wall | HvacElement,
  model: Pick<Model, "stories">,
): string {
  return element.storyId ?? model.stories[0]?.id ?? DEFAULT_STORY_ID;
}

/** Mutates a loaded model into the current, explicit-story representation. */
export function normalizeStories(model: Model): Model {
  if (!Array.isArray(model.stories) || model.stories.length === 0) {
    model.stories = [
      { id: DEFAULT_STORY_ID, name: "Ground floor", elevation: 0 },
    ];
  }
  model.stories.sort((a, b) => a.elevation - b.elevation);
  const fallbackId = model.stories[0].id;
  for (const wall of model.walls) wall.storyId ??= fallbackId;
  for (const element of model.hvac) element.storyId ??= fallbackId;
  return model;
}

/** A read-only view of one story using the existing Model interface. */
export function modelForStory(model: Model, storyId: string): Model {
  const fallbackId = model.stories[0]?.id ?? DEFAULT_STORY_ID;
  const walls = model.walls.filter(
    (wall) => (wall.storyId ?? fallbackId) === storyId,
  );
  const wallIds = new Set(walls.map((wall) => wall.id));
  return {
    ...model,
    walls,
    openings: model.openings.filter((opening) => wallIds.has(opening.wallId)),
    hvac: model.hvac.filter(
      (element) => (element.storyId ?? fallbackId) === storyId,
    ),
  };
}

interface NewStory {
  id: string;
  name: string;
}

/**
 * Add a level by copying the active floor plan. HVAC is intentionally not
 * copied: envelope geometry is reusable, equipment layout should be designed
 * for the new load.
 */
export function addClonedStory(
  model: Model,
  sourceStoryId: string,
  next: NewStory,
): Story {
  normalizeStories(model);
  if (model.stories.some((story) => story.id === next.id)) {
    throw new Error(`Story already exists: ${next.id}`);
  }

  const source = modelForStory(model, sourceStoryId);
  const top = model.stories.reduce(
    (highest, story) => Math.max(highest, story.elevation),
    0,
  );
  const story: Story = {
    ...next,
    elevation:
      top + model.settings.wallHeight + model.settings.slabThickness,
  };

  const wallIds = new Map<string, string>();
  const copiedWalls = source.walls.map((wall, index) => {
    const id = `${story.id}-wall-${index + 1}`;
    wallIds.set(wall.id, id);
    return {
      ...structuredClone(wall),
      id,
      storyId: story.id,
      groupId: undefined,
    };
  });
  const copiedOpenings = source.openings.map((opening, index) => ({
    ...structuredClone(opening),
    id: `${story.id}-${opening.type}-${index + 1}`,
    wallId: wallIds.get(opening.wallId)!,
  }));

  const sourceRooms = detectRooms(
    source.walls,
    model.roomNames,
    "Room",
  );
  const copiedRooms = detectRooms(copiedWalls, {}, "Room");
  copiedRooms.forEach((room, index) => {
    const sourceRoom = sourceRooms[index];
    if (!sourceRoom) return;
    model.roomNames[room.key] = sourceRoom.name;
    const conditioned = model.roomConditioning[sourceRoom.key];
    if (conditioned !== undefined) {
      model.roomConditioning[room.key] = conditioned;
    }
  });

  model.stories.push(story);
  model.walls.push(...copiedWalls);
  model.openings.push(...copiedOpenings);
  return story;
}

export function storyName(
  model: Pick<Model, "stories">,
  storyId: string,
): string {
  return model.stories.find((story) => story.id === storyId)?.name ?? storyId;
}
