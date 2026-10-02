import { lazy, Suspense, useEffect } from "react";
import "./App.css";
import {
  commitDuctDraft,
  deleteSelection,
  nudgeSelection,
} from "./actions";
import { isTextEntryTarget } from "./dom";
import {
  applyGrouping,
  applyUngrouping,
  isGroupable,
  selectionGroupId,
} from "./grouping";
import { downloadProject, pickAndLoadProject } from "./persistence";
import { Editor2D } from "./components/Editor2D";
const View3D = lazy(() =>
  import("./components/View3D").then((m) => ({ default: m.View3D })),
);
import { PropertiesPanel } from "./components/PropertiesPanel";
import { SchedulePanel } from "./components/SchedulePanel";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { nextId, useStore, useT } from "./store";
import type { Tool } from "./types";

const TOOL_KEYS: Record<string, Tool> = {
  w: "wall",
  x: "cutWall",
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
const ENABLED_TOOLS: Tool[] = [
  "select",
  "wall",
  "cutWall",
  "door",
  "window",
  "measure",
  "acUnit",
  "supplyDiffuser",
  "returnGrille",
  "duct",
  "hrvUnit",
  "extractValve",
  "freshAirValve",
  "jumperDuct",
  "facadePenetration",
];
const VIEW_3D_ENABLED = true;

const iconStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const topIcons = {
  undo: (
    <svg viewBox="0 0 24 24" {...iconStroke}>
      <path d="M8 5L3 10l5 5" />
      <path d="M3 10h11a6 6 0 0 1 0 12h-4" />
    </svg>
  ),
  redo: (
    <svg viewBox="0 0 24 24" {...iconStroke}>
      <path d="M16 5l5 5-5 5" />
      <path d="M21 10H10a6 6 0 0 0 0 12h4" />
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" {...iconStroke}>
      <path d="M12 3v11M7.5 10L12 14.5 16.5 10" />
      <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  ),
  load: (
    <svg viewBox="0 0 24 24" {...iconStroke}>
      <path d="M12 14V3M7.5 7L12 2.5 16.5 7" />
      <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  ),
};

export default function App() {
  const t = useT();
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const showSchedule = useStore((s) => s.showSchedule);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (isTextEntryTarget(target)) {
        // Escape leaves the field so shortcuts work again immediately
        if (e.key === "Escape") target.blur();
        return;
      }
      const st = useStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) {
          const gid = selectionGroupId(st.model, st.selection);
          if (gid) st.commit((m) => applyUngrouping(m, gid));
        } else {
          const groupable = st.selection.filter(isGroupable);
          if (groupable.length >= 2) {
            const id = nextId("group");
            st.commit((m) => applyGrouping(m, groupable, id));
            st.setSelection(groupable);
          }
        }
        return;
      }
      const arrow = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      }[e.key];
      if (
        arrow &&
        !e.ctrlKey &&
        !e.metaKey &&
        st.selection.some(
          (item) => item.type === "wall" || item.type === "hvac",
        )
      ) {
        e.preventDefault();
        const step = e.altKey ? 0.1 : e.shiftKey ? 10 : 1;
        nudgeSelection(st.selection, {
          x: arrow.x * step,
          y: arrow.y * step,
        });
        return;
      }
      if (e.key === "Escape") {
        if (st.draftPath.length > 0) st.setDraftPath([]);
        else if (st.draftAnchor) st.setDraftAnchor(null);
        else if (st.selection.length) st.setSelection([]);
        else st.setTool("select");
        return;
      }
      if (e.key === "Enter") {
        if (st.tool === "duct") commitDuctDraft();
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
        <div className="view-switch" title={`${t("view.toggle")} (V)`}>
          <button
            className={viewMode === "2d" ? "active" : ""}
            onClick={() => setViewMode("2d")}
            aria-pressed={viewMode === "2d"}
          >
            {t("view.2d")}
          </button>
          <button
            className={viewMode === "3d" ? "active" : ""}
            onClick={() => setViewMode("3d")}
            aria-pressed={viewMode === "3d"}
          >
            {t("view.3d")}
          </button>
        </div>
        <div className="topbar-actions">
          <button
            onClick={undo}
            disabled={!canUndo}
            title={`${t("action.undo")} (Ctrl+Z)`}
          >
            {topIcons.undo} {t("action.undo")}
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title={`${t("action.redo")} (Ctrl+Shift+Z)`}
          >
            {topIcons.redo} {t("action.redo")}
          </button>
          <button onClick={() => downloadProject(useStore.getState().model)}>
            {topIcons.save} {t("action.save")}
          </button>
          <button
            onClick={async () => {
              try {
                const m = await pickAndLoadProject();
                if (m) useStore.getState().replaceModel(m);
              } catch {
                alert("Invalid project file / Neispravan fajl projekta");
              }
            }}
          >
            {topIcons.load} {t("action.load")}
          </button>
        </div>
      </header>
      <div className="main">
        <Toolbar />
        {viewMode === "2d" ? (
          <Editor2D />
        ) : (
          <Suspense fallback={<div className="view3d" />}>
            <View3D />
          </Suspense>
        )}
        <PropertiesPanel />
      </div>
      {showSchedule && <SchedulePanel />}
      <StatusBar />
    </div>
  );
}
