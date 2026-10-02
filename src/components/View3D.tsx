import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, Sky } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { flatRoofLayout } from "../scene-geometry";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useStore, useT } from "../store";
import { useBuildingBounds } from "./view3d/bounds3d";
import { SceneModel } from "./view3d/SceneModel";

type Preset = "top" | "iso" | "front";

export function View3D() {
  const t = useT();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const bounds = useBuildingBounds();
  const settings = useStore((s) => s.model.settings);
  const stories = useStore((s) => s.model.stories);
  const showRoof = useStore((s) => s.showRoof);
  const showSlabs = useStore((s) => s.showSlabs);
  const setShowRoof = useStore((s) => s.setShowRoof);
  const setShowSlabs = useStore((s) => s.setShowSlabs);
  const flatLayout = flatRoofLayout(
    bounds,
    settings.roofType === "metalFlat",
  );
  const roofHeight =
    settings.roofType === "pitched"
      ? settings.atticHeight
      : settings.roofType === "flat"
        ? (flatLayout.deckThickness +
            flatLayout.parapetHeight +
            0.055) *
          100
        : (flatLayout.deckThickness + 0.16 + flatLayout.pitchRise) * 100;
  const buildingTop =
    Math.max(0, ...stories.map((story) => story.elevation)) +
    settings.wallHeight +
    roofHeight;
  const midH = (buildingTop / 2) * 0.01;
  const groundY = -settings.slabThickness * 0.01 - 0.025;
  const groundSize = Math.max(64, bounds.radius * 10);
  const shadowExtent = Math.max(18, bounds.radius * 3);

  const setPreset = (kind: Preset) => {
    const c = controlsRef.current;
    if (!c) return;
    const cam = c.object;
    const d = bounds.radius * 2.4;
    if (kind === "top") cam.position.set(bounds.cx, d * 1.2, bounds.cz + 0.01);
    if (kind === "iso")
      cam.position.set(bounds.cx + d * 0.75, d * 0.75, bounds.cz + d * 0.75);
    if (kind === "front") cam.position.set(bounds.cx, midH, bounds.cz + d);
    c.target.set(bounds.cx, kind === "top" ? 0 : midH * 0.72, bounds.cz);
    c.update();
  };

  return (
    <div className="view3d" data-testid="view3d">
      <Canvas
        shadows="variance"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.04,
        }}
        camera={{
          position: [
            bounds.cx + bounds.radius * 2.25,
            midH + bounds.radius * 1.5,
            bounds.cz + bounds.radius * 2.25,
          ],
          fov: 44,
          near: 0.05,
          far: 500,
        }}
      >
        <color attach="background" args={["#dce8ec"]} />
        <fog
          attach="fog"
          args={[
            "#dce8ec",
            Math.max(30, bounds.radius * 5),
            Math.max(105, bounds.radius * 16),
          ]}
        />
        <Sky
          distance={450000}
          sunPosition={[25, 18, 12]}
          inclination={0.52}
          azimuth={0.25}
          turbidity={7}
          rayleigh={1.3}
        />
        <hemisphereLight
          args={["#eaf7ff", "#766b5b", 1.28]}
        />
        <ambientLight intensity={0.22} />
        <directionalLight
          position={[
            bounds.cx + bounds.radius * 2.4,
            midH + bounds.radius * 4.2,
            bounds.cz + bounds.radius * 2.1,
          ]}
          intensity={2.65}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.00015}
          shadow-normalBias={0.025}
          shadow-camera-left={-shadowExtent}
          shadow-camera-right={shadowExtent}
          shadow-camera-top={shadowExtent}
          shadow-camera-bottom={-shadowExtent}
          shadow-camera-near={0.5}
          shadow-camera-far={Math.max(80, bounds.radius * 12)}
        />
        <directionalLight
          color="#b9d9e7"
          position={[
            bounds.cx - bounds.radius * 2,
            midH + bounds.radius * 1.6,
            bounds.cz - bounds.radius,
          ]}
          intensity={0.48}
        />
        <mesh
          position={[bounds.cx, groundY, bounds.cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[groundSize, groundSize]} />
          <meshStandardMaterial color="#d6ddd7" roughness={1} />
        </mesh>
        <Grid
          position={[bounds.cx, groundY + 0.003, bounds.cz]}
          args={[groundSize, groundSize]}
          cellSize={1}
          cellThickness={0.55}
          cellColor="#b7c3c2"
          sectionSize={5}
          sectionThickness={1.05}
          sectionColor="#8fa09f"
          fadeDistance={Math.max(42, bounds.radius * 7)}
          fadeStrength={1.2}
          followCamera={false}
        />
        <SceneModel />
        <OrbitControls
          ref={controlsRef}
          target={[bounds.cx, midH * 0.72, bounds.cz]}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={0.08}
          maxPolarAngle={Math.PI / 2.02}
          minDistance={1}
          maxDistance={bounds.radius * 12}
        />
      </Canvas>

      <div className="view3d-overlay">
        <div className="view3d-presets">
          <button onClick={() => setPreset("top")}>{t("view.top")}</button>
          <button onClick={() => setPreset("iso")}>{t("view.iso")}</button>
          <button onClick={() => setPreset("front")}>{t("view.front")}</button>
        </div>
        <div className="view3d-divider" />
        <button
          className={`scene-toggle ${showRoof ? "active" : ""}`}
          onClick={() => setShowRoof(!showRoof)}
          aria-pressed={showRoof}
          title={showRoof ? t("view.roofOn") : t("view.roofOff")}
          data-testid="toggle-roof"
        >
          <span aria-hidden="true">⌂</span>
          {t("view.hideRoof")}
        </button>
        <button
          className={`scene-toggle ${showSlabs ? "active" : ""}`}
          onClick={() => setShowSlabs(!showSlabs)}
          aria-pressed={showSlabs}
          title={showSlabs ? t("view.slabsOn") : t("view.slabsOff")}
          data-testid="toggle-slabs"
        >
          <span aria-hidden="true">▰</span>
          {t("view.hideSlab")}
        </button>
      </div>
    </div>
  );
}
