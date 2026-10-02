import { useMemo, useState } from "react";
import { airflowBalance } from "../airflow";
import {
  penetrationSchedule,
  proximityWarnings,
  scheduleToCsv,
} from "../schedule";
import { useStore, useT } from "../store";
import { useRooms } from "../useRooms";
import type { TranslationKey } from "../i18n";

const KIND_KEYS: Record<string, TranslationKey> = {
  supplyDiffuser: "tool.supplyDiffuser",
  returnGrille: "tool.returnGrille",
  extractValve: "tool.extractValve",
  freshAirValve: "tool.freshAirValve",
  jumperDuct: "tool.jumperDuct",
  facadePenetration: "tool.facadePenetration",
};

export function SchedulePanel() {
  const t = useT();
  const model = useStore((s) => s.model);
  const setShowSchedule = useStore((s) => s.setShowSchedule);
  const rooms = useRooms();
  const [tab, setTab] = useState<"penetrations" | "airflow">("penetrations");

  const rows = useMemo(() => penetrationSchedule(model, rooms), [model, rooms]);
  const warnings = useMemo(() => proximityWarnings(rows), [rows]);
  const balance = useMemo(() => airflowBalance(model, rooms), [model, rooms]);

  const exportCsv = () => {
    const csv = scheduleToCsv(rows, [
      t("schedule.id"),
      t("schedule.room"),
      t("schedule.purpose"),
      t("schedule.surface"),
      t("hvac.connDiameter"),
      t("hvac.drillDiameter"),
      t("schedule.x"),
      t("schedule.y"),
    ]);
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prodori.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="schedule-panel" data-testid="schedule-panel">
      <div className="schedule-header">
        <button
          className={tab === "penetrations" ? "active" : ""}
          onClick={() => setTab("penetrations")}
        >
          {t("schedule.title")} ({rows.length})
        </button>
        <button
          className={tab === "airflow" ? "active" : ""}
          onClick={() => setTab("airflow")}
        >
          {t("schedule.airflow")}
        </button>
        <span className="spacer" />
        {tab === "penetrations" && (
          <button onClick={exportCsv} data-testid="export-csv">
            ⤓ {t("action.exportCsv")}
          </button>
        )}
        <button onClick={() => setShowSchedule(false)} title="Zatvori">
          ✕
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="schedule-warnings" data-testid="proximity-warnings">
          ⚠{" "}
          {warnings
            .map(
              (w) =>
                `${w.a.id}–${w.b.id}: ${w.distance} cm < ${Math.round(w.minAllowed)} cm`,
            )
            .join(" · ")}
        </div>
      )}

      {tab === "penetrations" ? (
        <div className="schedule-scroll">
          <table data-testid="penetration-table">
            <thead>
              <tr>
                <th>{t("schedule.id")}</th>
                <th>{t("schedule.room")}</th>
                <th>{t("schedule.purpose")}</th>
                <th>{t("schedule.surface")}</th>
                <th>{t("hvac.connDiameter")}</th>
                <th>{t("hvac.drillDiameter")}</th>
                <th>{t("schedule.x")}</th>
                <th>{t("schedule.y")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.elementId}>
                  <td>{r.id}</td>
                  <td>{r.roomName}</td>
                  <td>{t(KIND_KEYS[r.kind])}</td>
                  <td>
                    {r.surface === "slab"
                      ? t("schedule.slab")
                      : t("schedule.wall")}
                  </td>
                  <td>Ø{r.connDiameter}</td>
                  <td>Ø{r.drillDiameter}</td>
                  <td>{r.x ?? "—"}</td>
                  <td>{r.y ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="schedule-scroll">
          <table data-testid="airflow-table">
            <thead>
              <tr>
                <th>{t("schedule.room")}</th>
                <th>{t("schedule.supply")} (m³/h)</th>
                <th>{t("schedule.extract")} (m³/h)</th>
                <th>{t("schedule.imbalance")}</th>
              </tr>
            </thead>
            <tbody>
              {balance.map((b) => (
                <tr key={b.roomKey} className={b.warning ? "warn" : ""}>
                  <td>{b.roomName}</td>
                  <td>{b.supply}</td>
                  <td>{b.extract}</td>
                  <td>
                    {Math.round(b.imbalance * 100)}% {b.warning && "⚠"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
