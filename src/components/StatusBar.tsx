import { useStore, useT } from "../store";

export function StatusBar() {
  const t = useT();
  const tool = useStore((s) => s.tool);
  const wallCount = useStore((s) => s.model.walls.length);

  const hint = tool === "wall" ? t("hint.wall") : t("hint.select");

  return (
    <footer className="statusbar" data-testid="statusbar">
      <span className="hint">{hint}</span>
      <span className="spacer" />
      <span>
        {wallCount} {t("status.walls")}
      </span>
    </footer>
  );
}
