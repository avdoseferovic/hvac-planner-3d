import { create } from "zustand";
import { translate, type Lang, type TranslationKey } from "./i18n";
import {
  DEFAULT_STORY_ID,
  emptyModel,
  type Model,
  type Point,
  type Selection,
  type Tool,
  type ViewMode,
} from "./types";
import { normalizeStories } from "./stories";
import type { DuctRoutingMode } from "./duct-drafting";

export type WallDraftKind = "exterior" | "interior";

const HISTORY_LIMIT = 200;

let idCounter = 0;
/** Unique-enough id for model objects (persisted, so include time salt). */
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export interface StoreState {
  model: Model;
  past: Model[];
  future: Model[];

  // --- UI state (not part of undo history, not persisted) ---
  tool: Tool;
  /** multi-selection; empty array = nothing selected */
  selection: Selection[];
  viewMode: ViewMode;
  lang: Lang;
  showHvac: boolean;
  showKeepOut: boolean;
  showRoof: boolean;
  showSlabs: boolean;
  activeStoryId: string;
  visibleStoryIds: string[];
  /** focused heat-pump / AC load drawer */
  showSizing: boolean;
  /** bottom schedule drawer */
  showSchedule: boolean;
  /** current chain-start point while drawing walls (null = no draft) */
  draftAnchor: Point | null;
  /** accumulated polyline points while drawing a duct */
  draftPath: Point[];
  /** which default thickness the wall tool uses */
  wallDraftKind: WallDraftKind;
  /** default geometry for newly clicked duct route segments */
  ductRoutingMode: DuctRoutingMode;

  // --- actions ---
  setTool: (tool: Tool) => void;
  setSelection: (sel: Selection[]) => void;
  setViewMode: (v: ViewMode) => void;
  setLang: (lang: Lang) => void;
  setShowHvac: (v: boolean) => void;
  setShowKeepOut: (v: boolean) => void;
  setShowRoof: (v: boolean) => void;
  setShowSlabs: (v: boolean) => void;
  setActiveStoryId: (id: string) => void;
  setStoryVisible: (id: string, visible: boolean) => void;
  setShowSizing: (v: boolean) => void;
  setShowSchedule: (v: boolean) => void;
  setDraftAnchor: (p: Point | null) => void;
  setDraftPath: (pts: Point[]) => void;
  setWallDraftKind: (k: WallDraftKind) => void;
  setDuctRoutingMode: (mode: DuctRoutingMode) => void;

  /** Mutate the model with undo support: snapshots current model to `past`. */
  commit: (mutate: (m: Model) => void) => void;
  /** Push the current model onto the undo stack (call once before a transient edit burst). */
  checkpoint: () => void;
  /** Mutate the model WITHOUT pushing history (live drag preview after checkpoint()). */
  updateModel: (mutate: (m: Model) => void) => void;
  undo: () => void;
  redo: () => void;
  /** Replace the whole model (load from file / new project). Clears history. */
  replaceModel: (m: Model) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  model: emptyModel(),
  past: [],
  future: [],

  tool: "select",
  selection: [],
  viewMode: "2d",
  lang: "bs",
  showHvac: true,
  showKeepOut: false,
  showRoof: true,
  showSlabs: true,
  activeStoryId: DEFAULT_STORY_ID,
  visibleStoryIds: [DEFAULT_STORY_ID],
  showSizing: false,
  showSchedule: false,
  draftAnchor: null,
  draftPath: [],
  wallDraftKind: "exterior",
  ductRoutingMode: "orthogonal",

  setTool: (tool) =>
    set({ tool, selection: [], draftAnchor: null, draftPath: [] }),
  setSelection: (selection) => set({ selection }),
  setViewMode: (viewMode) => set({ viewMode }),
  setLang: (lang) => set({ lang }),
  setShowHvac: (showHvac) => set({ showHvac }),
  setShowKeepOut: (showKeepOut) => set({ showKeepOut }),
  setShowRoof: (showRoof) => set({ showRoof }),
  setShowSlabs: (showSlabs) => set({ showSlabs }),
  setActiveStoryId: (activeStoryId) =>
    set({
      activeStoryId,
      selection: [],
      draftAnchor: null,
      draftPath: [],
    }),
  setStoryVisible: (id, visible) =>
    set((state) => ({
      visibleStoryIds: visible
        ? [...new Set([...state.visibleStoryIds, id])]
        : state.visibleStoryIds.filter((storyId) => storyId !== id),
    })),
  setShowSizing: (showSizing) => set({ showSizing }),
  setShowSchedule: (showSchedule) => set({ showSchedule }),
  setDraftAnchor: (draftAnchor) => set({ draftAnchor }),
  setDraftPath: (draftPath) => set({ draftPath }),
  setWallDraftKind: (wallDraftKind) => set({ wallDraftKind }),
  setDuctRoutingMode: (ductRoutingMode) => set({ ductRoutingMode }),

  commit: (mutate) => {
    const { model, past } = get();
    const next = structuredClone(model);
    mutate(next);
    set({
      model: next,
      past: [...past.slice(-HISTORY_LIMIT), model],
      future: [],
    });
  },

  checkpoint: () => {
    const { model, past } = get();
    set({
      past: [...past.slice(-HISTORY_LIMIT), structuredClone(model)],
      future: [],
    });
  },

  updateModel: (mutate) => {
    const next = structuredClone(get().model);
    mutate(next);
    set({ model: next });
  },

  undo: () => {
    const { past, future, model, activeStoryId, visibleStoryIds } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    const storyIds = new Set(prev.stories.map((story) => story.id));
    set({
      model: prev,
      past: past.slice(0, -1),
      future: [model, ...future].slice(0, HISTORY_LIMIT),
      selection: [],
      activeStoryId: storyIds.has(activeStoryId)
        ? activeStoryId
        : (prev.stories[0]?.id ?? DEFAULT_STORY_ID),
      visibleStoryIds: visibleStoryIds.filter((id) => storyIds.has(id)),
    });
  },

  redo: () => {
    const { past, future, model, activeStoryId, visibleStoryIds } = get();
    if (future.length === 0) return;
    const next = future[0];
    const storyIds = new Set(next.stories.map((story) => story.id));
    set({
      model: next,
      past: [...past.slice(-HISTORY_LIMIT), model],
      future: future.slice(1),
      selection: [],
      activeStoryId: storyIds.has(activeStoryId)
        ? activeStoryId
        : (next.stories[0]?.id ?? DEFAULT_STORY_ID),
      visibleStoryIds: [
        ...new Set([
          ...visibleStoryIds.filter((id) => storyIds.has(id)),
          next.stories[0]?.id ?? DEFAULT_STORY_ID,
        ]),
      ],
    });
  },

  replaceModel: (m) => {
    const model = normalizeStories(structuredClone(m));
    const ids = model.stories.map((story) => story.id);
    set({
      model,
      past: [],
      future: [],
      selection: [],
      draftAnchor: null,
      draftPath: [],
      activeStoryId: ids[0] ?? DEFAULT_STORY_ID,
      visibleStoryIds: ids,
    });
  },
}));

/** Translation hook: `const t = useT(); t('tool.wall')` */
export function useT(): (key: TranslationKey) => string {
  const lang = useStore((s) => s.lang);
  return (key) => translate(lang, key);
}
