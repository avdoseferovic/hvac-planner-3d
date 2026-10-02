import { DEFAULT_SETTINGS, emptyModel, type Model } from "./types";

const FILE_VERSION = 1;

export interface ProjectFile {
  app: "hvac-planner-3d";
  version: number;
  model: Model;
}

/** Serialize the model to a pretty JSON string. */
export function serializeProject(model: Model): string {
  const file: ProjectFile = {
    app: "hvac-planner-3d",
    version: FILE_VERSION,
    model,
  };
  return JSON.stringify(file, null, 2);
}

/** Parse and validate a project file; throws on invalid input. */
export function deserializeProject(json: string): Model {
  const raw: unknown = JSON.parse(json);
  if (typeof raw !== "object" || raw === null)
    throw new Error("Invalid project file");
  const file = raw as Partial<ProjectFile>;
  if (
    file.app !== "hvac-planner-3d" ||
    typeof file.version !== "number" ||
    !file.model
  ) {
    throw new Error("Invalid project file");
  }
  const m = file.model as Partial<Model>;
  const base = emptyModel();
  return {
    walls: Array.isArray(m.walls) ? m.walls : base.walls,
    openings: Array.isArray(m.openings) ? m.openings : base.openings,
    hvac: Array.isArray(m.hvac) ? m.hvac : base.hvac,
    roomNames:
      m.roomNames && typeof m.roomNames === "object"
        ? m.roomNames
        : base.roomNames,
    settings: { ...DEFAULT_SETTINGS, ...(m.settings ?? {}) },
  };
}

/** Trigger a browser download of the current project. */
export function downloadProject(
  model: Model,
  filename = "hvac-projekat.json",
): void {
  const blob = new Blob([serializeProject(model)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open a file picker and load a project; resolves to null if cancelled. */
export function pickAndLoadProject(): Promise<Model | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      try {
        resolve(deserializeProject(await f.text()));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    input.click();
  });
}
