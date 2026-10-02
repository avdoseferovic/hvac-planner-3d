import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useStore, useT } from "../store";
import { SceneModel, useBuildingBounds } from "./view3d/SceneModel";

type Preset = "top" | "iso" | "front";

export function View3D() {
  const t = useT();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const bounds = useBuildingBounds();
  const settings = useStore((s) => s.model.settings);
  const hideRoof = useStore((s) => s.hideRoof);
  const hideSlab = useStore((s) => s.hideSlab);
  const setHideRoof = useStore((s) => s.setHideRoof);
  const setHideSlab = useStore((s) => s.setHideSlab);

  const setPreset = (kind: Preset) => {
    const c = controlsRef.current;
    if (!c) return;
    const cam = c.object;
    const d = bounds.radius * 2.4;
    const midH =
      ((settings.wallHeight + settings.slabThickness + settings.atticHeight) /
        2) *
      0.01;
    if (kind === "top") cam.position.set(bounds.cx, d * 1.2, bounds.cz + 0.01);
    if (kind === "iso")
      cam.position.set(bounds.cx + d * 0.75, d * 0.75, bounds.cz + d * 0.75);
    if (kind === "front") cam.position.set(bounds.cx, midH, bounds.cz + d);
    c.target.set(bounds.cx, kind === "front" ? midH : 0, bounds.cz);
    c.update();
  };

  return (
    <div className="view3d" data-testid="view3d">
      <Canvas
        shadows
        camera={{
          position: [
            bounds.cx + bounds.radius * 1.8,
            bounds.radius * 1.8,
            bounds.cz + bounds.radius * 1.8,
          ],
          fov: 50,
        }}
      >
        <color attach="background" args={["#eef1f4"]} />
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[15, 25, 10]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <Grid
          position={[0, -0.002, 0]}
          args={[200, 200]}
          cellSize={1}
          cellColor="#c9ced4"
          sectionSize={5}
          sectionColor="#aab2bb"
          fadeDistance={80}
          followCamera={false}
        />
        <SceneModel />
        <OrbitControls
          ref={controlsRef}
          target={[bounds.cx, 0, bounds.cz]}
          makeDefault
        />
      </Canvas>

      <div className="view3d-overlay">
        <button onClick={() => setPreset("top")}>{t("view.top")}</button>
        <button onClick={() => setPreset("iso")}>{t("view.iso")}</button>
        <button onClick={() => setPreset("front")}>{t("view.front")}</button>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={hideRoof}
            onChange={(e) => setHideRoof(e.target.checked)}
          />
          <span>{t("view.hideRoof")}</span>
        </label>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={hideSlab}
            onChange={(e) => setHideSlab(e.target.checked)}
          />
          <span>{t("view.hideSlab")}</span>
        </label>
      </div>
    </div>
  );
}
