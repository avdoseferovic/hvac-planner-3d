import { useMemo } from "react";
import { detectRooms } from "./rooms";
import { useStore } from "./store";
import type { Room } from "./types";

/** Rooms derived from the current wall graph (memoized). */
export function useRooms(): Room[] {
  const walls = useStore((s) => s.model.walls);
  const roomNames = useStore((s) => s.model.roomNames);
  const lang = useStore((s) => s.lang);
  return useMemo(
    () => detectRooms(walls, roomNames, lang === "bs" ? "Prostorija" : "Room"),
    [walls, roomNames, lang],
  );
}
