import {
  CONNECTION_DIAMETERS,
  autoDrill,
  updateConnDiameter,
} from "../../hvac";
import { useStore, useT } from "../../store";
import type { HvacElement } from "../../types";
import { NumField } from "./NumField";

const KIND_LABEL_KEYS = {
  acUnit: "tool.acUnit",
  hrvUnit: "tool.hrvUnit",
  supplyDiffuser: "tool.supplyDiffuser",
  returnGrille: "tool.returnGrille",
  extractValve: "tool.extractValve",
  freshAirValve: "tool.freshAirValve",
  duct: "tool.duct",
  jumperDuct: "tool.jumperDuct",
  facadePenetration: "tool.facadePenetration",
} as const;

/** Properties editor for any HVAC element. */
export function HvacProps({ el }: { el: HvacElement }) {
  const t = useT();
  const commit = useStore((s) => s.commit);

  const edit = (fn: (e: HvacElement) => void) =>
    commit((m) => {
      const target = m.hvac.find((h) => h.id === el.id);
      if (target) fn(target);
    });

  const connSelect = (
    current: number,
    onChange: (v: number) => void,
  ): React.ReactNode => (
    <label className="field">
      <span>{t("hvac.connDiameter")}</span>
      <select
        value={current}
        onChange={(e) => {
          onChange(Number(e.target.value));
          e.currentTarget.blur();
        }}
      >
        {CONNECTION_DIAMETERS.map((d) => (
          <option key={d} value={d}>
            Ø{d}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="prop-section">
      <h3>{t(KIND_LABEL_KEYS[el.kind])}</h3>

      {(el.kind === "acUnit" || el.kind === "hrvUnit") && (
        <>
          <label className="field">
            <span>{t("hvac.label")}</span>
            <input
              type="text"
              value={el.label}
              onChange={(e) =>
                edit((h) => {
                  if (h.kind === el.kind)
                    (h as typeof el).label = e.target.value;
                })
              }
            />
          </label>
          <NumField
            label={t("props.width")}
            value={el.width}
            min={10}
            onCommit={(v) =>
              edit((h) => {
                if (h.kind === el.kind) (h as typeof el).width = v;
              })
            }
          />
          <NumField
            label={t("hvac.depth")}
            value={el.depth}
            min={10}
            onCommit={(v) =>
              edit((h) => {
                if (h.kind === el.kind) (h as typeof el).depth = v;
              })
            }
          />
          <NumField
            label={t("props.height")}
            value={el.height}
            min={5}
            onCommit={(v) =>
              edit((h) => {
                if (h.kind === el.kind) (h as typeof el).height = v;
              })
            }
          />
          <NumField
            label={t("hvac.rotation")}
            value={el.rotation}
            min={0}
            step={15}
            onCommit={(v) =>
              edit((h) => {
                if (h.kind === el.kind) (h as typeof el).rotation = v % 360;
              })
            }
          />
          {el.kind === "acUnit" ? (
            <NumField
              label={t("hvac.airflow")}
              value={el.airflow}
              min={0}
              onCommit={(v) =>
                edit((h) => {
                  if (h.kind === "acUnit") h.airflow = v;
                })
              }
            />
          ) : (
            <NumField
              label={t("hvac.nominalFlow")}
              value={el.nominalFlow}
              min={0}
              onCommit={(v) =>
                edit((h) => {
                  if (h.kind === "hrvUnit") h.nominalFlow = v;
                })
              }
            />
          )}
        </>
      )}

      {(el.kind === "supplyDiffuser" ||
        el.kind === "returnGrille" ||
        el.kind === "extractValve" ||
        el.kind === "freshAirValve") && (
        <>
          {connSelect(el.connDiameter, (v) =>
            edit((h) => {
              if (h.kind === el.kind) updateConnDiameter(h as typeof el, v);
            }),
          )}
          <NumField
            label={t("hvac.drillDiameter")}
            value={el.drillDiameter}
            min={20}
            onCommit={(v) =>
              edit((h) => {
                if (h.kind === el.kind) {
                  const p = h as typeof el;
                  p.drillDiameter = v;
                  p.drillAuto = v === autoDrill(p.connDiameter);
                }
              })
            }
          />
          <NumField
            label={t("hvac.airflow")}
            value={el.airflow}
            min={0}
            onCommit={(v) =>
              edit((h) => {
                if (h.kind === el.kind) (h as typeof el).airflow = v;
              })
            }
          />
        </>
      )}

      {el.kind === "duct" && (
        <>
          {connSelect(el.diameter, (v) =>
            edit((h) => {
              if (h.kind === "duct") h.diameter = v;
            }),
          )}
          <label className="field checkbox">
            <input
              type="checkbox"
              checked={el.insulated}
              onChange={(e) =>
                edit((h) => {
                  if (h.kind === "duct") h.insulated = e.target.checked;
                })
              }
            />
            <span>{t("hvac.insulated")}</span>
          </label>
        </>
      )}

      {el.kind === "jumperDuct" && (
        <>
          {connSelect(el.diameter, (v) =>
            edit((h) => {
              if (h.kind === "jumperDuct") {
                h.diameter = v;
                if (h.drillAuto) h.drillDiameter = autoDrill(v);
              }
            }),
          )}
          <NumField
            label={t("hvac.drillDiameter")}
            value={el.drillDiameter}
            min={20}
            onCommit={(v) =>
              edit((h) => {
                if (h.kind === "jumperDuct") {
                  h.drillDiameter = v;
                  h.drillAuto = v === autoDrill(h.diameter);
                }
              })
            }
          />
        </>
      )}

      {el.kind === "facadePenetration" && (
        <>
          {connSelect(el.diameter, (v) =>
            edit((h) => {
              if (h.kind === "facadePenetration") {
                h.diameter = v;
                if (h.drillAuto) h.drillDiameter = autoDrill(v);
              }
            }),
          )}
          <NumField
            label={t("hvac.drillDiameter")}
            value={el.drillDiameter}
            min={20}
            onCommit={(v) =>
              edit((h) => {
                if (h.kind === "facadePenetration") {
                  h.drillDiameter = v;
                  h.drillAuto = v === autoDrill(h.diameter);
                }
              })
            }
          />
          <NumField
            label={t("hvac.heightAboveFloor")}
            value={el.heightAboveFloor}
            min={0}
            onCommit={(v) =>
              edit((h) => {
                if (h.kind === "facadePenetration") h.heightAboveFloor = v;
              })
            }
          />
        </>
      )}
    </div>
  );
}
