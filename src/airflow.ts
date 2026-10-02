import { pointInPolygon, round1 } from "./geometry";
import type { Model, Room } from "./types";

export interface RoomBalance {
  roomKey: string;
  roomName: string;
  /** m³/h in: supply diffusers + fresh-air valves */
  supply: number;
  /** m³/h out: return grilles + extract valves */
  extract: number;
  /** imbalance ratio 0..1 relative to the larger side (0 = balanced) */
  imbalance: number;
  warning: boolean;
}

const IMBALANCE_THRESHOLD = 0.15;

/** Per-room airflow balance; warns when supply vs return differ by > 15 %. */
export function airflowBalance(model: Model, rooms: Room[]): RoomBalance[] {
  return rooms.map((room) => {
    let supply = 0;
    let extract = 0;
    for (const el of model.hvac) {
      if (
        el.kind !== "supplyDiffuser" &&
        el.kind !== "freshAirValve" &&
        el.kind !== "returnGrille" &&
        el.kind !== "extractValve"
      ) {
        continue;
      }
      if (!pointInPolygon(el.pos, room.polygon)) continue;
      if (el.kind === "supplyDiffuser" || el.kind === "freshAirValve")
        supply += el.airflow;
      else extract += el.airflow;
    }
    const max = Math.max(supply, extract);
    const imbalance = max === 0 ? 0 : Math.abs(supply - extract) / max;
    return {
      roomKey: room.key,
      roomName: room.name,
      supply: round1(supply),
      extract: round1(extract),
      imbalance: round1(imbalance * 100) / 100,
      warning: max > 0 && imbalance > IMBALANCE_THRESHOLD,
    };
  });
}
