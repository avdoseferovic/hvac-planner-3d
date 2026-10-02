import { makeDuct } from "./hvac-factories";
import { useStore } from "./store";
import type { Selection } from "./types";

/** Commit the in-progress duct polyline (>= 2 points) and clear the draft. */
export function commitDuctDraft(): void {
  const { draftPath, commit, setDraftPath, setSelection } = useStore.getState();
  if (draftPath.length >= 2) {
    const duct = makeDuct(draftPath);
    commit((m) => {
      m.hvac.push(duct);
    });
    setSelection([{ type: "hvac", id: duct.id }]);
  }
  setDraftPath([]);
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
    m.walls = m.walls.filter((w) => !wallIds.has(w.id));
    m.openings = m.openings.filter(
      (o) => !openingIds.has(o.id) && !wallIds.has(o.wallId),
    );
    m.hvac = m.hvac.filter(
      (h) =>
        !hvacIds.has(h.id) &&
        !(h.kind === "facadePenetration" && wallIds.has(h.wallId)),
    );
  });
  setSelection([]);
}
