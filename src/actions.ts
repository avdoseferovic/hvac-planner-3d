import { makeDuct } from "./hvac-factories";
import { connectDuctEndpoints } from "./hvac";
import { simplifyDuctRoute } from "./duct-drafting";
import { moveSelectionPreservingJoints } from "./selection-movement";
import { useStore } from "./store";
import type { Point, Selection } from "./types";

/** Commit the in-progress duct polyline (>= 2 points) and clear the draft. */
export function commitDuctDraft(): void {
  const { draftPath, commit, setDraftPath, setSelection } = useStore.getState();
  const route = simplifyDuctRoute(draftPath);
  if (route.length >= 2) {
    const duct = makeDuct(route);
    commit((m) => {
      connectDuctEndpoints(duct, m.hvac, m.walls);
      m.hvac.push(duct);
    });
    setSelection([{ type: "hvac", id: duct.id }]);
  }
  setDraftPath([]);
}

/** Move the current groupable selection by an exact keyboard delta. */
export function nudgeSelection(selection: Selection[], delta: Point): void {
  const movable = selection.filter(
    (item) => item.type === "wall" || item.type === "hvac",
  );
  if (movable.length === 0 || (delta.x === 0 && delta.y === 0)) return;
  useStore.getState().commit((model) => {
    moveSelectionPreservingJoints(model, movable, delta);
  });
}

/** Delete the selected objects (and anything that depends on them). */
export function deleteSelection(sel: Selection[]): void {
  const { commit, setSelection } = useStore.getState();
  const ids = (type: Selection["type"]) =>
    new Set(sel.filter((s) => s.type === type).map((s) => s.id));
  const wallIds = ids("wall");
  const openingIds = ids("opening");
  const hvacIds = ids("hvac");
  if (wallIds.size + openingIds.size + hvacIds.size === 0) return;
  commit((m) => {
    const removedHvacIds = new Set(hvacIds);
    for (const element of m.hvac) {
      if (
        element.kind === "facadePenetration" &&
        wallIds.has(element.wallId)
      ) {
        removedHvacIds.add(element.id);
      }
    }
    m.walls = m.walls.filter((w) => !wallIds.has(w.id));
    m.openings = m.openings.filter(
      (o) => !openingIds.has(o.id) && !wallIds.has(o.wallId),
    );
    m.hvac = m.hvac.filter(
      (h) =>
        !removedHvacIds.has(h.id) &&
        !(h.kind === "facadePenetration" && wallIds.has(h.wallId)),
    );
    for (const element of m.hvac) {
      if (element.kind !== "duct") continue;
      if (
        element.startConnection &&
        removedHvacIds.has(element.startConnection.elementId)
      ) {
        delete element.startConnection;
      }
      if (
        element.endConnection &&
        removedHvacIds.has(element.endConnection.elementId)
      ) {
        delete element.endConnection;
      }
    }
  });
  setSelection([]);
}
