import { useStore, useT } from "../store";
import { useRooms } from "../useRooms";
import { modelForStory } from "../stories";

export function StatusBar() {
  const t = useT();
  const tool = useStore((s) => s.tool);
  const ductRoutingMode = useStore((s) => s.ductRoutingMode);
  const model = useStore((s) => s.model);
  const activeStoryId = useStore((s) => s.activeStoryId);
  const wallCount = modelForStory(model, activeStoryId).walls.length;
  const rooms = useRooms();

  const hint =
    tool === "wall"
      ? t("hint.wall")
      : tool === "cutWall"
        ? t("hint.cut")
        : tool === "door" || tool === "window"
          ? t("hint.opening")
          : tool === "measure"
            ? t("hint.measure")
            : tool === "duct"
              ? t(
                  ductRoutingMode === "orthogonal"
                    ? "hint.ductSmart"
                    : "hint.ductDirect",
                )
              : tool === "jumperDuct"
                ? t("hint.jumper")
                : tool === "facadePenetration"
                  ? t("hint.facade")
                  : tool === "select"
                    ? t("hint.select")
                    : t("hint.hvacPlace");

  return (
    <footer className="statusbar" data-testid="statusbar">
      <span className="hint">{hint}</span>
      <span className="spacer" />
      <span className="nav-hint">{t("hint.pan")}</span>
      <span>
        {wallCount} {t("status.walls")} · {rooms.length} {t("status.rooms")}
      </span>
    </footer>
  );
}
