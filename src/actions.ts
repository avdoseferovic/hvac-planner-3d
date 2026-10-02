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
    setSelection({ type: "hvac", id: duct.id });
  }
  setDraftPath([]);
}

/** Delete the selected object (and anything that depends on it). */
export function deleteSelection(sel: Selection): void {
  const { commit, setSelection } = useStore.getState();
  commit((m) => {
    switch (sel.type) {
      case "wall":
        m.walls = m.walls.filter((w) => w.id !== sel.id);
        m.openings = m.openings.filter((o) => o.wallId !== sel.id);
        m.hvac = m.hvac.filter(
          (h) => !(h.kind === "facadePenetration" && h.wallId === sel.id),
        );
        break;
      case "opening":
        m.openings = m.openings.filter((o) => o.id !== sel.id);
        break;
      case "hvac":
        m.hvac = m.hvac.filter((h) => h.id !== sel.id);
        break;
      case "room":
        // rooms are derived; deleting a room is not a direct operation
        break;
    }
  });
  setSelection(null);
}
