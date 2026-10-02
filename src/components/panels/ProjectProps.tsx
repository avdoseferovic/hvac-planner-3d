import { useStore, useT } from "../../store";
import { NumField } from "./NumField";

/** Global project settings section. */
export function ProjectProps() {
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
        label={t("props.keepOutWidth")}
        value={settings.keepOutWidth}
        min={10}
        onCommit={(v) => setSetting("keepOutWidth", v)}
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
