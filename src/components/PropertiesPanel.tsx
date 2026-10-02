import {
  formatArea,
  formatLength,
  normalize,
  scale as vScale,
  sub,
  add,
  wallLength,
} from "../geometry";
import { clampOpeningT } from "../openings";
import { useStore, useT } from "../store";
import { useRooms } from "../useRooms";
import type { Opening, Room, Wall } from "../types";
import { HvacProps } from "./panels/HvacProps";
import { NumField } from "./panels/NumField";
import { ProjectProps } from "./panels/ProjectProps";

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

function OpeningProps({ opening }: { opening: Opening }) {
  const t = useT();
  const commit = useStore((s) => s.commit);
  const walls = useStore((s) => s.model.walls);
  const wall = walls.find((w) => w.id === opening.wallId);

  const setOpening = (fn: (o: Opening) => void) =>
    commit((m) => {
      const o = m.openings.find((x) => x.id === opening.id);
      if (o) {
        fn(o);
        const w = m.walls.find((x) => x.id === o.wallId);
        if (w) o.t = clampOpeningT(w, o.width, o.t);
      }
    });

  return (
    <div className="prop-section">
      <h3>{opening.type === "door" ? t("props.door") : t("props.window")}</h3>
      <NumField
        label={t("props.width")}
        value={opening.width}
        min={20}
        onCommit={(v) =>
          setOpening((o) => {
            o.width = v;
          })
        }
      />
      <NumField
        label={t("props.height")}
        value={opening.height}
        min={20}
        onCommit={(v) =>
          setOpening((o) => {
            o.height = v;
          })
        }
      />
      {opening.type === "window" && (
        <NumField
          label={t("props.sill")}
          value={opening.sill}
          min={0}
          onCommit={(v) =>
            setOpening((o) => {
              o.sill = v;
            })
          }
        />
      )}
      {wall && (
        <div className="prop-readout">
          {t("props.wall")}: {formatLength(wallLength(wall))}
        </div>
      )}
    </div>
  );
}

function RoomProps({ room }: { room: Room }) {
  const t = useT();
  const commit = useStore((s) => s.commit);

  return (
    <div className="prop-section">
      <h3>{t("props.room")}</h3>
      <label className="field">
        <span>{t("props.roomName")}</span>
        <input
          type="text"
          value={room.name}
          onChange={(e) =>
            commit((m) => {
              m.roomNames[room.key] = e.target.value;
            })
          }
        />
      </label>
      <div className="prop-readout">
        {t("props.area")}: {formatArea(room.area)}
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const t = useT();
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const walls = useStore((s) => s.model.walls);
  const openings = useStore((s) => s.model.openings);
  const hvac = useStore((s) => s.model.hvac);
  const rooms = useRooms();

  const selectedWall =
    selection?.type === "wall"
      ? walls.find((w) => w.id === selection.id)
      : undefined;
  const selectedOpening =
    selection?.type === "opening"
      ? openings.find((o) => o.id === selection.id)
      : undefined;
  const selectedRoom =
    selection?.type === "room"
      ? rooms.find((r) => r.key === selection.id)
      : undefined;
  const selectedHvac =
    selection?.type === "hvac"
      ? hvac.find((h) => h.id === selection.id)
      : undefined;

  const hasSelection =
    selectedWall || selectedOpening || selectedRoom || selectedHvac;

  return (
    <aside className="props-panel" data-testid="props-panel">
      <h2>{t("props.title")}</h2>
      {tool === "wall" && <WallToolProps />}
      {selectedWall && <WallProps wall={selectedWall} />}
      {selectedOpening && <OpeningProps opening={selectedOpening} />}
      {selectedRoom && <RoomProps room={selectedRoom} />}
      {selectedHvac && <HvacProps el={selectedHvac} />}
      {!hasSelection && tool !== "wall" && (
        <p className="muted">{t("props.noSelection")}</p>
      )}
      <ProjectProps />
    </aside>
  );
}
