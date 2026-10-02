import { useStore } from "./store";
import type { Selection } from "./types";

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
