import { useStore, useT } from "../store";
import type { Tool } from "../types";
import type { TranslationKey } from "../i18n";

interface ToolDef {
  tool: Tool;
  labelKey: TranslationKey;
  shortcut: string;
  icon: React.ReactNode;
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const icons = {
  select: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M6 3l12 9-5.5 1L15 19l-2.5 1-2.5-6L6 16z" />
    </svg>
  ),
  wall: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="9" width="18" height="6" />
      <line x1="9" y1="9" x2="9" y2="15" />
      <line x1="15" y1="9" x2="15" y2="15" />
    </svg>
  ),
  door: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M4 20h16" />
      <path d="M7 20V6h7" />
      <path d="M14 6a12 12 0 0 1-7 14" />
    </svg>
  ),
  window: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="6" width="16" height="12" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  measure: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="2.5" y="9" width="19" height="6" rx="1" />
      <path d="M7 9v3M12 9v3M17 9v3" />
    </svg>
  ),
  acUnit: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="7" width="18" height="10" rx="1" />
      <path d="M7 17v2M17 17v2M6 11h12M6 14h8" />
    </svg>
  ),
  supplyDiffuser: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 4v-2M12 22v-2M4 12H2M22 12h-2" />
    </svg>
  ),
  returnGrille: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M7 9h10M7 12h10M7 15h10" />
    </svg>
  ),
  duct: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M3 17V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2h4" />
      <path d="M3 13V9M21 21v-4" />
    </svg>
  ),
  hrvUnit: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="M7 9l4 6M11 9l-4 6M13 9h5M13 15h5M13 12h5" />
    </svg>
  ),
  extractValve: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 8v-2M12 18v-2" />
    </svg>
  ),
  freshAirValve: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
  jumperDuct: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="6" cy="16" r="2.5" />
      <circle cx="18" cy="16" r="2.5" />
      <path d="M6 13v-3a6 6 0 0 1 12 0v3" />
    </svg>
  ),
  facadePenetration: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M9 3v18M15 3v18" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  hvacToggle: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  ),
};

const DRAWING_TOOLS: ToolDef[] = [
  {
    tool: "select",
    labelKey: "tool.select",
    shortcut: "Esc",
    icon: icons.select,
  },
  { tool: "wall", labelKey: "tool.wall", shortcut: "W", icon: icons.wall },
  { tool: "door", labelKey: "tool.door", shortcut: "D", icon: icons.door },
  {
    tool: "window",
    labelKey: "tool.window",
    shortcut: "N",
    icon: icons.window,
  },
  {
    tool: "measure",
    labelKey: "tool.measure",
    shortcut: "M",
    icon: icons.measure,
  },
];

const HVAC_TOOLS: ToolDef[] = [
  {
    tool: "acUnit",
    labelKey: "tool.acUnit",
    shortcut: "U",
    icon: icons.acUnit,
  },
  {
    tool: "supplyDiffuser",
    labelKey: "tool.supplyDiffuser",
    shortcut: "S",
    icon: icons.supplyDiffuser,
  },
  {
    tool: "returnGrille",
    labelKey: "tool.returnGrille",
    shortcut: "R",
    icon: icons.returnGrille,
  },
  { tool: "duct", labelKey: "tool.duct", shortcut: "T", icon: icons.duct },
  {
    tool: "hrvUnit",
    labelKey: "tool.hrvUnit",
    shortcut: "",
    icon: icons.hrvUnit,
  },
  {
    tool: "extractValve",
    labelKey: "tool.extractValve",
    shortcut: "",
    icon: icons.extractValve,
  },
  {
    tool: "freshAirValve",
    labelKey: "tool.freshAirValve",
    shortcut: "",
    icon: icons.freshAirValve,
  },
  {
    tool: "jumperDuct",
    labelKey: "tool.jumperDuct",
    shortcut: "J",
    icon: icons.jumperDuct,
  },
  {
    tool: "facadePenetration",
    labelKey: "tool.facadePenetration",
    shortcut: "",
    icon: icons.facadePenetration,
  },
];

function ToolButton({ def }: { def: ToolDef }) {
  const t = useT();
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  return (
    <button
      className={`toolbtn ${tool === def.tool ? "active" : ""}`}
      title={
        def.shortcut ? `${t(def.labelKey)} (${def.shortcut})` : t(def.labelKey)
      }
      onClick={() => setTool(def.tool)}
      data-testid={`tool-${def.tool}`}
    >
      {def.icon}
      {def.shortcut && <span className="shortcut">{def.shortcut}</span>}
    </button>
  );
}

export function Toolbar() {
  const t = useT();
  const showHvac = useStore((s) => s.showHvac);
  const setShowHvac = useStore((s) => s.setShowHvac);

  return (
    <div className="toolbar" data-testid="toolbar">
      {DRAWING_TOOLS.map((d) => (
        <ToolButton key={d.tool} def={d} />
      ))}
      <div className="toolbar-divider" />
      {HVAC_TOOLS.map((d) => (
        <ToolButton key={d.tool} def={d} />
      ))}
      <div className="toolbar-divider" />
      <button
        className={`toolbtn ${showHvac ? "active" : ""}`}
        title={t("view.hvacLayer")}
        onClick={() => setShowHvac(!showHvac)}
        data-testid="toggle-hvac"
      >
        {icons.hvacToggle}
      </button>
    </div>
  );
}
