import { useStore, useT } from "../store";
import { useRooms } from "../useRooms";

export function StatusBar() {
  const t = useT();
  const tool = useStore((s) => s.tool);
  const wallCount = useStore((s) => s.model.walls.length);
  const rooms = useRooms();

  const hint =
    tool === "wall"
      ? t("hint.wall")
      : tool === "door" || tool === "window"
        ? t("hint.opening")
        : tool === "measure"
          ? t("hint.measure")
          : tool === "duct"
            ? t("hint.duct")
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
      <span>
        {wallCount} {t("status.walls")} · {rooms.length} {t("status.rooms")}
      </span>
    </footer>
  );
}
