import { add, distToSegment } from "./geometry";
import { translateSelection } from "./grouping";
import { storyIdOf } from "./stories";
import type { Model, Point, Selection } from "./types";
import { WALL_JOINT_TOLERANCE, type WallEnd } from "./wall-connections";

interface AttachedEndpoint {
  wallId: string;
  end: WallEnd;
  point: Point;
}

/**
 * Translate walls/HVAC while stretching endpoints of unselected walls that
 * are attached to a selected wall span. Used by keyboard nudging.
 */
export function moveSelectionPreservingJoints(
  model: Model,
  selection: Selection[],
  delta: Point,
  tolerance = WALL_JOINT_TOLERANCE,
): void {
  const selectedWallIds = new Set(
    selection
      .filter((item) => item.type === "wall")
      .map((item) => item.id),
  );
  const selectedWalls = model.walls.filter((wall) =>
    selectedWallIds.has(wall.id),
  );
  const selectedStoryIds = new Set(
    selectedWalls.map((wall) => storyIdOf(wall, model)),
  );
  const attached = new Map<string, AttachedEndpoint>();

  for (const wall of model.walls) {
    if (selectedWallIds.has(wall.id)) continue;
    if (!selectedStoryIds.has(storyIdOf(wall, model))) continue;
    for (const end of ["a", "b"] as const) {
      if (
        selectedWalls.some(
          (selected) =>
            distToSegment(wall[end], selected.a, selected.b) <= tolerance,
        )
      ) {
        attached.set(`${wall.id}:${end}`, {
          wallId: wall.id,
          end,
          point: { ...wall[end] },
        });
      }
    }
  }

  translateSelection(model, selection, delta);
  for (const endpoint of attached.values()) {
    const wall = model.walls.find(
      (candidate) => candidate.id === endpoint.wallId,
    );
    if (wall) wall[endpoint.end] = add(endpoint.point, delta);
  }
}
