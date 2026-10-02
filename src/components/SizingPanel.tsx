import { useMemo } from "react";
import {
  calculateHeatLoads,
  envelopeForPreset,
} from "../thermal-load";
import { useStore, useT } from "../store";
import type { InsulationPreset } from "../types";
import { DEFAULT_STORY_ID } from "../types";
import { NumField } from "./panels/NumField";

const PRESETS: Array<{
  id: InsulationPreset;
  label: "sizing.basic" | "sizing.standard" | "sizing.highPerformance";
  help:
    | "sizing.basicHelp"
    | "sizing.standardHelp"
    | "sizing.highPerformanceHelp";
}> = [
  { id: "basic", label: "sizing.basic", help: "sizing.basicHelp" },
  { id: "standard", label: "sizing.standard", help: "sizing.standardHelp" },
  {
    id: "highPerformance",
    label: "sizing.highPerformance",
    help: "sizing.highPerformanceHelp",
  },
];

const GLAZING = {
  single: { uValue: 5.7, shgc: 0.75 },
  double: { uValue: 1.4, shgc: 0.5 },
  triple: { uValue: 0.9, shgc: 0.42 },
} as const;

function kw(value: number): string {
  return `${value.toFixed(1)} kW`;
}

export function SizingPanel() {
  const t = useT();
  const model = useStore((state) => state.model);
  const commit = useStore((state) => state.commit);
  const setShowSizing = useStore((state) => state.setShowSizing);
  const result = useMemo(() => calculateHeatLoads(model), [model]);
  const envelope = model.thermal.envelope;
  const glazing =
    envelope.windowUValue <= 1
      ? "triple"
      : envelope.windowUValue >= 4
        ? "single"
        : "double";

  const setThermal = (
    key: Exclude<keyof typeof model.thermal, "envelope">,
    value: number,
  ) =>
    commit((next) => {
      next.thermal[key] = value;
    });
  const setEnvelope = (
    key: Exclude<keyof typeof envelope, "preset">,
    value: number,
  ) =>
    commit((next) => {
      next.thermal.envelope[key] = value;
    });
  const setRoomConditioned = (roomKey: string, conditioned: boolean) =>
    commit((next) => {
      next.roomConditioning ??= {};
      if (conditioned) {
        delete next.roomConditioning[roomKey];
      } else {
        next.roomConditioning[roomKey] = false;
      }
    });

  return (
    <aside className="sizing-panel" data-testid="sizing-panel">
      <header className="sizing-header">
        <div>
          <span className="eyebrow">HVAC</span>
          <h2>{t("sizing.title")}</h2>
        </div>
        <button
          className="sizing-close"
          onClick={() => setShowSizing(false)}
          aria-label={t("sizing.close")}
        >
          ×
        </button>
      </header>

      <section className="sizing-result">
        <span>{t("sizing.recommended")}</span>
        <strong>{kw(result.recommendedCapacityKw)}</strong>
        <small>
          {Math.round(result.recommendedCapacityKw * 3412).toLocaleString()} BTU/h
        </small>
        <div className="load-pills">
          <span>
            {t("sizing.heating")} <b>{kw(result.heatingKw)}</b>
          </span>
          <span>
            {t("sizing.cooling")} <b>{kw(result.coolingKw)}</b>
          </span>
        </div>
      </section>

      <section className="sizing-section">
        <h3>1. {t("sizing.insulation")}</h3>
        <div className="insulation-options">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={envelope.preset === preset.id ? "active" : ""}
              onClick={() =>
                commit((next) => {
                  next.thermal.envelope = envelopeForPreset(preset.id);
                })
              }
              aria-pressed={envelope.preset === preset.id}
              data-testid={`insulation-${preset.id}`}
            >
              <strong>{t(preset.label)}</strong>
              <small>{t(preset.help)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="sizing-section">
        <h3>2. {t("sizing.windows")}</h3>
        <div className="segmented-control glazing-control">
          {(["single", "double", "triple"] as const).map((type) => (
            <button
              key={type}
              className={glazing === type ? "active" : ""}
              onClick={() =>
                commit((next) => {
                  next.thermal.envelope.windowUValue = GLAZING[type].uValue;
                  next.thermal.envelope.windowShgc = GLAZING[type].shgc;
                })
              }
              aria-pressed={glazing === type}
            >
              {t(`sizing.${type}`)}
            </button>
          ))}
        </div>
      </section>

      <details className="sizing-details">
        <summary>{t("sizing.designConditions")}</summary>
        <div className="details-body">
          <NumField
            label={t("sizing.insideWinter")}
            value={model.thermal.indoorHeatingC}
            onCommit={(value) => setThermal("indoorHeatingC", value)}
          />
          <NumField
            label={t("sizing.outsideWinter")}
            value={model.thermal.outdoorWinterC}
            min={-60}
            onCommit={(value) => setThermal("outdoorWinterC", value)}
          />
          <NumField
            label={t("sizing.insideSummer")}
            value={model.thermal.indoorCoolingC}
            onCommit={(value) => setThermal("indoorCoolingC", value)}
          />
          <NumField
            label={t("sizing.outsideSummer")}
            value={model.thermal.outdoorSummerC}
            onCommit={(value) => setThermal("outdoorSummerC", value)}
          />
          <NumField
            label={t("sizing.occupants")}
            value={model.thermal.occupants}
            min={0}
            onCommit={(value) => setThermal("occupants", value)}
          />
          <NumField
            label={t("sizing.northAngle")}
            value={model.thermal.northAngleDeg}
            min={-360}
            onCommit={(value) => setThermal("northAngleDeg", value)}
          />
        </div>
      </details>

      <details className="sizing-details">
        <summary>{t("sizing.envelopeDetails")}</summary>
        <div className="details-body">
          <NumField
            label={t("sizing.wallU")}
            value={envelope.wallUValue}
            min={0.05}
            step={0.05}
            onCommit={(value) => setEnvelope("wallUValue", value)}
          />
          <NumField
            label={t("sizing.roofU")}
            value={envelope.roofUValue}
            min={0.05}
            step={0.05}
            onCommit={(value) => setEnvelope("roofUValue", value)}
          />
          <NumField
            label={t("sizing.floorU")}
            value={envelope.floorUValue}
            min={0.05}
            step={0.05}
            onCommit={(value) => setEnvelope("floorUValue", value)}
          />
          <NumField
            label={t("sizing.windowU")}
            value={envelope.windowUValue}
            min={0.3}
            step={0.1}
            onCommit={(value) => setEnvelope("windowUValue", value)}
          />
          <NumField
            label={t("sizing.ach")}
            value={envelope.airChangesPerHour}
            min={0.1}
            step={0.1}
            onCommit={(value) => setEnvelope("airChangesPerHour", value)}
          />
        </div>
      </details>

      <section className="sizing-section room-loads">
        <h3>{t("sizing.roomLoads")}</h3>
        {result.rooms.length === 0 ? (
          <p className="sizing-empty">{t("sizing.noRooms")}</p>
        ) : (
          result.rooms.map((room) => (
            <div
              className={`room-load ${room.conditioned ? "" : "unconditioned"}`}
              key={`${room.storyId}-${room.roomKey}`}
              data-testid={`room-load-${room.roomKey}`}
            >
              <label className="room-condition-toggle">
                <input
                  type="checkbox"
                  checked={room.conditioned}
                  onChange={(event) =>
                    setRoomConditioned(room.roomKey, event.target.checked)
                  }
                  aria-label={`${room.roomName}: ${t("props.conditioned")}`}
                  data-testid={`room-conditioned-${room.roomKey}`}
                />
                <span>
                  <strong>{room.roomName}</strong>
                  <small>
                    {room.storyId === DEFAULT_STORY_ID
                      ? t("story.ground")
                      : room.storyName}{" "}
                    · {room.areaM2.toFixed(1)} m²
                  </small>
                </span>
              </label>
              <span className="room-load-values">
                {room.conditioned ? (
                  <>
                    <b>
                      {kw(
                        Math.max(room.heatingWatts, room.coolingWatts) / 1000,
                      )}
                    </b>
                    <small>
                      H {kw(room.heatingWatts / 1000)} · C{" "}
                      {kw(room.coolingWatts / 1000)}
                    </small>
                  </>
                ) : (
                  <>
                    <b>{t("sizing.excluded")}</b>
                    <small>{t("sizing.notConditioned")}</small>
                  </>
                )}
              </span>
            </div>
          ))
        )}
      </section>

      <p className="sizing-disclaimer">{t("sizing.disclaimer")}</p>
    </aside>
  );
}
