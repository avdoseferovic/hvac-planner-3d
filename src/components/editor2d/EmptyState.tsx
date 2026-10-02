import { useT } from "../../store";

/** Onboarding hint shown when the plan is completely empty. */
export function EmptyState() {
  const t = useT();
  return (
    <div className="editor-empty" data-testid="editor-empty">
      <div className="editor-empty-card">
        <h2>{t("empty.title")}</h2>
        <p>{t("empty.body")}</p>
        <p className="editor-empty-keys">
          <kbd>W</kbd> {t("tool.wall")} · <kbd>Space</kbd> {t("hint.panShort")}{" "}
          · <kbd>F</kbd> {t("view.zoomFit")}
        </p>
      </div>
    </div>
  );
}
