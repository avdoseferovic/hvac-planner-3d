import { useEffect } from "react";
import "./App.css";
import { deleteSelection } from "./actions";
import { Editor2D } from "./components/Editor2D";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { useStore, useT } from "./store";
import type { Tool } from "./types";

const TOOL_KEYS: Record<string, Tool> = {
  w: "wall",
  d: "door",
  n: "window",
  m: "measure",
  u: "acUnit",
  s: "supplyDiffuser",
  r: "returnGrille",
  t: "duct",
  j: "jumperDuct",
};

/** Tools that are implemented so far (grows per milestone). */
const ENABLED_TOOLS: Tool[] = ["select", "wall"];
const VIEW_3D_ENABLED = false; // milestone 3

export default function App() {
  const t = useT();
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }
      const st = useStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (e.key === "Escape") {
        if (st.draftAnchor) st.setDraftAnchor(null);
        else if (st.selection) st.setSelection(null);
        else st.setTool("select");
        return;
      }
      if (e.key === "Enter") {
        st.setDraftAnchor(null);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (st.selection) deleteSelection(st.selection);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "v" && VIEW_3D_ENABLED) {
        st.setViewMode(st.viewMode === "2d" ? "3d" : "2d");
        return;
      }
      const tool = TOOL_KEYS[k];
      if (tool && ENABLED_TOOLS.includes(tool)) st.setTool(tool);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <h1>HVAC Planner 3D</h1>
        <div className="topbar-actions">
          <button
            onClick={undo}
            disabled={!canUndo}
            title={`${t("action.undo")} (Ctrl+Z)`}
          >
            ⟲ {t("action.undo")}
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title={`${t("action.redo")} (Ctrl+Shift+Z)`}
          >
            ⟳ {t("action.redo")}
          </button>
        </div>
      </header>
      <div className="main">
        <Toolbar />
        <Editor2D />
        <PropertiesPanel />
      </div>
      <StatusBar />
    </div>
  );
}
