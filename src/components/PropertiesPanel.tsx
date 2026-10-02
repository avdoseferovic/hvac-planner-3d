import {
  formatLength,
  normalize,
  scale as vScale,
  sub,
  add,
  wallLength,
} from "../geometry";
import { useStore, useT } from "../store";
import type { Wall } from "../types";

/** Numeric input that commits on change; keeps the model in cm. */
function NumField({
  label,
  value,
  onCommit,
  min = 1,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= min) onCommit(v);
        }}
      />
    </label>
  );
}

function WallProps({ wall }: { wall: Wall }) {
  const t = useT();
  const commit = useStore((s) => s.commit);

  const setWall = (fn: (w: Wall) => void) =>
    commit((m) => {
      const w = m.walls.find((x) => x.id === wall.id);
      if (w) fn(w);
    });

  return (
    <div className="prop-section">
      <h3>{t("props.wall")}</h3>
      <NumField
        label={t("props.thickness")}
        value={wall.thickness}
        min={5}
        onCommit={(v) =>
          setWall((w) => {
            w.thickness = v;
          })
        }
      />
      <NumField
        label={t("props.length")}
        value={wallLength(wall)}
        min={1}
        onCommit={(v) =>
          setWall((w) => {
            // keep endpoint a fixed, move b along the wall direction
            const dir = normalize(sub(w.b, w.a));
            w.b = add(w.a, vScale(dir, v));
          })
        }
      />
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={wall.loadBearing}
          onChange={(e) =>
            setWall((w) => {
              w.loadBearing = e.target.checked;
            })
          }
        />
        <span>{t("props.loadBearing")}</span>
      </label>
      <div className="prop-readout">{formatLength(wallLength(wall))}</div>
    </div>
  );
}

function ProjectProps() {
  const t = useT();
  const settings = useStore((s) => s.model.settings);
  const commit = useStore((s) => s.commit);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);

  const setSetting = (key: keyof typeof settings, v: number) =>
    commit((m) => {
      m.settings[key] = v;
    });

  return (
    <div className="prop-section">
      <h3>{t("props.project")}</h3>
      <NumField
        label={t("props.gridSize")}
        value={settings.gridSize}
        onCommit={(v) => setSetting("gridSize", v)}
      />
      <NumField
        label={t("props.wallHeight")}
        value={settings.wallHeight}
        min={100}
        onCommit={(v) => setSetting("wallHeight", v)}
      />
      <NumField
        label={t("props.slabThickness")}
        value={settings.slabThickness}
        min={5}
        onCommit={(v) => setSetting("slabThickness", v)}
      />
      <NumField
        label={t("props.atticHeight")}
        value={settings.atticHeight}
        min={50}
        onCommit={(v) => setSetting("atticHeight", v)}
      />
      <NumField
        label={t("props.exteriorThickness")}
        value={settings.exteriorWallThickness}
        min={5}
        onCommit={(v) => setSetting("exteriorWallThickness", v)}
      />
      <NumField
        label={t("props.interiorThickness")}
        value={settings.interiorWallThickness}
        min={5}
        onCommit={(v) => setSetting("interiorWallThickness", v)}
      />
      <label className="field">
        <span>{t("props.language")}</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as "bs" | "en")}
        >
          <option value="bs">Bosanski</option>
          <option value="en">English</option>
        </select>
      </label>
    </div>
  );
}

function WallToolProps() {
  const t = useT();
  const kind = useStore((s) => s.wallDraftKind);
  const setKind = useStore((s) => s.setWallDraftKind);
  const settings = useStore((s) => s.model.settings);

  return (
    <div className="prop-section">
      <h3>{t("tool.wall")}</h3>
      <label className="field radio">
        <input
          type="radio"
          checked={kind === "exterior"}
          onChange={() => setKind("exterior")}
        />
        <span>
          {t("props.exteriorThickness")} — {settings.exteriorWallThickness} cm
        </span>
      </label>
      <label className="field radio">
        <input
          type="radio"
          checked={kind === "interior"}
          onChange={() => setKind("interior")}
        />
        <span>
          {t("props.interiorThickness")} — {settings.interiorWallThickness} cm
        </span>
      </label>
    </div>
  );
}

export function PropertiesPanel() {
  const t = useT();
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const walls = useStore((s) => s.model.walls);

  const selectedWall =
    selection?.type === "wall"
      ? walls.find((w) => w.id === selection.id)
      : undefined;

  return (
    <aside className="props-panel" data-testid="props-panel">
      <h2>{t("props.title")}</h2>
      {tool === "wall" && <WallToolProps />}
      {selectedWall ? (
        <WallProps wall={selectedWall} />
      ) : (
        tool !== "wall" && <p className="muted">{t("props.noSelection")}</p>
      )}
      <ProjectProps />
    </aside>
  );
}
