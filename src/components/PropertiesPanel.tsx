import {
  formatArea,
  formatLength,
  normalize,
  scale as vScale,
  sub,
  add,
  wallLength,
} from "../geometry";
import {
  applyGrouping,
  applyUngrouping,
  isGroupable,
  selectionGroupId,
} from "../grouping";
import { clampOpeningT } from "../openings";
import { nextId, useStore, useT } from "../store";
import { useRooms } from "../useRooms";
import type {
  DoorHinge,
  DoorSwing,
  Opening,
  Room,
  Selection,
  Wall,
} from "../types";
import { HvacProps } from "./panels/HvacProps";
import { NumField } from "./panels/NumField";
import { ProjectProps } from "./panels/ProjectProps";
import {
  applyWallMove,
  captureWallMove,
} from "../wall-connections";

function WallProps({ wall }: { wall: Wall }) {
  const t = useT();
  const commit = useStore((s) => s.commit);

  const setWall = (fn: (w: Wall) => void) =>
    commit((m) => {
      const w = m.walls.find((x) => x.id === wall.id);
      if (w) fn(w);
    });
  const center = {
    x: (wall.a.x + wall.b.x) / 2,
    y: (wall.a.y + wall.b.y) / 2,
  };
  const moveWall = (delta: { x: number; y: number }) =>
    commit((m) => {
      const snapshot = captureWallMove(m.walls, wall.id);
      applyWallMove(m.walls, snapshot, delta);
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
      <NumField
        label={t("props.centerX")}
        value={center.x}
        min={-100_000}
        onCommit={(value) => moveWall({ x: value - center.x, y: 0 })}
      />
      <NumField
        label={t("props.centerY")}
        value={center.y}
        min={-100_000}
        onCommit={(value) => moveWall({ x: 0, y: value - center.y })}
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
      <div className="prop-help">{t("hint.wallMovePrecision")}</div>
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

function DuctToolProps() {
  const t = useT();
  const mode = useStore((s) => s.ductRoutingMode);
  const setMode = useStore((s) => s.setDuctRoutingMode);

  return (
    <div className="prop-section" data-testid="duct-routing-props">
      <h3>{t("hvac.routingTitle")}</h3>
      <div className="segmented-control">
        <button
          className={mode === "orthogonal" ? "active" : ""}
          onClick={() => setMode("orthogonal")}
          aria-pressed={mode === "orthogonal"}
          data-testid="duct-routing-orthogonal"
        >
          {t("hvac.routingOrthogonal")}
        </button>
        <button
          className={mode === "direct" ? "active" : ""}
          onClick={() => setMode("direct")}
          aria-pressed={mode === "direct"}
          data-testid="duct-routing-direct"
        >
          {t("hvac.routingDirect")}
        </button>
      </div>
      <div className="prop-help">{t("hvac.routingHelp")}</div>
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
      {opening.type === "door" && (
        <>
          <label className="field">
            <span>{t("props.hinge")}</span>
            <select
              value={opening.hinge ?? "left"}
              onChange={(e) => {
                const v = e.target.value as DoorHinge;
                setOpening((o) => {
                  o.hinge = v;
                });
                e.currentTarget.blur();
              }}
              data-testid="door-hinge"
            >
              <option value="left">{t("props.hingeLeft")}</option>
              <option value="right">{t("props.hingeRight")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("props.swing")}</span>
            <select
              value={opening.swing ?? "in"}
              onChange={(e) => {
                const v = e.target.value as DoorSwing;
                setOpening((o) => {
                  o.swing = v;
                });
                e.currentTarget.blur();
              }}
              data-testid="door-swing"
            >
              <option value="in">{t("props.swingIn")}</option>
              <option value="out">{t("props.swingOut")}</option>
            </select>
          </label>
        </>
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

function GroupProps({ selection }: { selection: Selection[] }) {
  const t = useT();
  const model = useStore((s) => s.model);
  const commit = useStore((s) => s.commit);
  const setSelection = useStore((s) => s.setSelection);

  const groupable = selection.filter(isGroupable);
  const gid = selectionGroupId(model, selection);

  return (
    <div className="prop-section" data-testid="group-props">
      <h3>{t("props.multiSelected")}</h3>
      <div className="prop-readout">
        {groupable.length} {t("props.objects")}
      </div>
      <div className="panel-actions">
        {gid ? (
          <button
            onClick={() => commit((m) => applyUngrouping(m, gid))}
            data-testid="btn-ungroup"
          >
            {t("action.ungroup")}
          </button>
        ) : (
          <button
            onClick={() => {
              const id = nextId("group");
              commit((m) => applyGrouping(m, groupable, id));
              setSelection(groupable);
            }}
            disabled={groupable.length < 2}
            data-testid="btn-group"
          >
            {t("action.group")}
          </button>
        )}
      </div>
      <div className="prop-readout">{t("hint.groupShortcut")}</div>
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

  const single = selection.length === 1 ? selection[0] : null;
  const selectedWall =
    single?.type === "wall" ? walls.find((w) => w.id === single.id) : undefined;
  const selectedOpening =
    single?.type === "opening"
      ? openings.find((o) => o.id === single.id)
      : undefined;
  const selectedRoom =
    single?.type === "room"
      ? rooms.find((r) => r.key === single.id)
      : undefined;
  const selectedHvac =
    single?.type === "hvac" ? hvac.find((h) => h.id === single.id) : undefined;

  const hasSelection = selection.length > 0;

  return (
    <aside className="props-panel" data-testid="props-panel">
      <h2>{t("props.title")}</h2>
      {tool === "wall" && <WallToolProps />}
      {tool === "duct" && <DuctToolProps />}
      {selection.length > 1 && <GroupProps selection={selection} />}
      {selectedWall && <WallProps wall={selectedWall} />}
      {selectedOpening && <OpeningProps opening={selectedOpening} />}
      {selectedRoom && <RoomProps room={selectedRoom} />}
      {selectedHvac && <HvacProps el={selectedHvac} />}
      {!hasSelection && tool !== "wall" && tool !== "duct" && (
        <p className="muted">{t("props.noSelection")}</p>
      )}
      <ProjectProps />
    </aside>
  );
}
