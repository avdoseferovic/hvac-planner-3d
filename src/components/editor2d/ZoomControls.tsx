import { useCallback, useEffect } from "react";
import { fitCamera, rotateCamera, zoomAt, type Camera } from "../../camera";
import { isTextEntryTarget } from "../../dom";
import { useStore, useT } from "../../store";
import { modelForStory } from "../../stories";

interface Props {
  camera: Camera;
  setCamera: (c: Camera) => void;
  width: number;
  height: number;
}

const ZOOM_STEP = 1.25;

/** Floating toolbar (bottom-right): rotate / zoom / fit-to-plan. */
export function ZoomControls({ camera, setCamera, width, height }: Props) {
  const t = useT();

  const fit = useCallback(() => {
    const state = useStore.getState();
    const c = fitCamera(
      modelForStory(state.model, state.activeStoryId),
      width,
      height,
      undefined,
      camera.rotation,
    );
    if (c) setCamera(c);
  }, [width, height, setCamera, camera.rotation]);

  const rotate = (dir: 1 | -1) => (e: React.MouseEvent) =>
    setCamera(rotateCamera(camera, dir * (e.shiftKey ? 15 : 90)));

  // F = fit to plan (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTextEntryTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "f") fit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fit]);

  return (
    <div className="zoom-controls" data-testid="zoom-controls">
      <button
        onClick={rotate(-1)}
        title={t("view.rotateLeft")}
        aria-label={t("view.rotateLeft")}
        data-testid="rotate-left"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M4 9V4m0 5h5M4 9a8 8 0 1 1-2 5"
            transform="rotate(-15 12 12)"
          />
        </svg>
      </button>
      {camera.rotation !== 0 && (
        <button
          className="zoom-pct"
          onClick={() => setCamera({ ...camera, rotation: 0 })}
          title={t("view.rotateReset")}
          data-testid="rotation-badge"
        >
          {Math.round(camera.rotation)}°
        </button>
      )}
      <button
        onClick={rotate(1)}
        title={t("view.rotateRight")}
        aria-label={t("view.rotateRight")}
        data-testid="rotate-right"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M20 9V4m0 5h-5m5 0a8 8 0 1 0 2 5"
            transform="rotate(15 12 12)"
          />
        </svg>
      </button>
      <span className="zoom-sep" />
      <button
        onClick={() => setCamera(zoomAt(camera, 1 / ZOOM_STEP))}
        title={t("view.zoomOut")}
        aria-label={t("view.zoomOut")}
      >
        −
      </button>
      <button
        className="zoom-pct"
        onClick={() => setCamera({ ...camera, scale: 1 })}
        title={t("view.zoomReset")}
        data-testid="zoom-pct"
      >
        {Math.round(camera.scale * 100)}%
      </button>
      <button
        onClick={() => setCamera(zoomAt(camera, ZOOM_STEP))}
        title={t("view.zoomIn")}
        aria-label={t("view.zoomIn")}
      >
        +
      </button>
      <button
        onClick={fit}
        title={`${t("view.zoomFit")} (F)`}
        aria-label={t("view.zoomFit")}
        data-testid="zoom-fit"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
        </svg>
      </button>
    </div>
  );
}
