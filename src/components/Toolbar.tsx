import { useStore, useT } from "../store";
import type { Tool } from "../types";
import type { TranslationKey } from "../i18n";

interface ToolDef {
  tool: Tool;
  labelKey: TranslationKey;
  shortcut: string;
  icon: React.ReactNode;
  /** milestone gating: tools not yet implemented are hidden */
  enabled: boolean;
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
      <rect
        x="2"
        y="9"
        width="20"
        height="6"
        rx="1"
        transform="rotate(-25 12 12)"
      />
      <path d="M8 8.5l1 2M12 6.6l1 2M16 4.8l1 2" transform="rotate(0)" />
    </svg>
  ),
};

export function Toolbar() {
  const t = useT();
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);

  const tools: ToolDef[] = [
    {
      tool: "select",
      labelKey: "tool.select",
      shortcut: "Esc",
      icon: icons.select,
      enabled: true,
    },
    {
      tool: "wall",
      labelKey: "tool.wall",
      shortcut: "W",
      icon: icons.wall,
      enabled: true,
    },
    {
      tool: "door",
      labelKey: "tool.door",
      shortcut: "D",
      icon: icons.door,
      enabled: false,
    },
    {
      tool: "window",
      labelKey: "tool.window",
      shortcut: "N",
      icon: icons.window,
      enabled: false,
    },
    {
      tool: "measure",
      labelKey: "tool.measure",
      shortcut: "M",
      icon: icons.measure,
      enabled: false,
    },
  ];

  return (
    <div className="toolbar" data-testid="toolbar">
      {tools
        .filter((d) => d.enabled)
        .map((d) => (
          <button
            key={d.tool}
            className={`toolbtn ${tool === d.tool ? "active" : ""}`}
            title={`${t(d.labelKey)} (${d.shortcut})`}
            onClick={() => setTool(d.tool)}
            data-testid={`tool-${d.tool}`}
          >
            {d.icon}
            <span className="shortcut">{d.shortcut}</span>
          </button>
        ))}
    </div>
  );
}
