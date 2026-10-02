import { useMemo } from "react";
import { detectRooms } from "./rooms";
import { modelForStory } from "./stories";
import { useStore } from "./store";
import type { Room } from "./types";

/** Rooms derived from the floor currently being edited. */
export function useRooms(): Room[] {
  const model = useStore((s) => s.model);
  const activeStoryId = useStore((s) => s.activeStoryId);
  const lang = useStore((s) => s.lang);
  return useMemo(
    () => {
      const story = modelForStory(model, activeStoryId);
      return detectRooms(
        story.walls,
        model.roomNames,
        lang === "bs" ? "Prostorija" : "Room",
      );
    },
    [model, activeStoryId, lang],
  );
}
