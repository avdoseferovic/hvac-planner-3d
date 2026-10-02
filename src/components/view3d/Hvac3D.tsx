import { useMemo } from "react";
import * as THREE from "three";
import { facadePos, mm } from "../../hvac";
import { buildDuctRoute3D } from "../../hvac-routing";
import { normalize, perp, sub } from "../../geometry";
import { useStore } from "../../store";
import { HVAC_COLORS } from "../editor2d/HvacLayer";
import type {
  Duct,
  HvacElement,
  JumperDuct,
  Point,
  ProjectSettings,
  Wall,
} from "../../types";

/** cm → scene meters */
const M = 1 / 100;

function DuctTube({
  duct,
  hvac,
  walls,
  settings,
}: {
  duct: Duct;
  hvac: HvacElement[];
  walls: Wall[];
  settings: ProjectSettings;
}) {
  const route = useMemo(() => {
    const routePoints = buildDuctRoute3D(duct, hvac, walls, settings);
    if (routePoints.length < 2) return null;
    const pts = routePoints.map(
      (point) => new THREE.Vector3(point.x, point.y, point.z),
    );
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < pts.length - 1; i++) {
      path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    }
    return {
      geometry: new THREE.TubeGeometry(
        path,
        Math.max(8, pts.length * 6),
        (mm(duct.diameter) / 2) * M,
        12,
        false,
      ),
      start: pts[0],
      end: pts[pts.length - 1],
    };
  }, [duct, hvac, walls, settings]);
  if (!route) return null;
  const collarRadius = (mm(duct.diameter) / 2) * M * 1.16;
  return (
    <group>
      <mesh geometry={route.geometry} castShadow>
        <meshStandardMaterial
          color={duct.insulated ? "#94a3b8" : HVAC_COLORS.duct}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      {duct.startConnection && (
        <mesh position={route.start}>
          <sphereGeometry args={[collarRadius, 16, 12]} />
          <meshStandardMaterial color="#0f766e" metalness={0.35} roughness={0.35} />
        </mesh>
      )}
      {duct.endConnection && (
        <mesh position={route.end}>
          <sphereGeometry args={[collarRadius, 16, 12]} />
          <meshStandardMaterial color="#0f766e" metalness={0.35} roughness={0.35} />
        </mesh>
      )}
    </group>
  );
}

function JumperTube({
  el,
  slabTopY,
  ceilingY,
}: {
  el: JumperDuct;
  slabTopY: number;
  ceilingY: number;
}) {
  const geometry = useMemo(() => {
    const a = new THREE.Vector3(el.posA.x * M, ceilingY, el.posA.y * M);
    const b = new THREE.Vector3(el.posB.x * M, ceilingY, el.posB.y * M);
    const aUp = a.clone().setY(slabTopY + 0.25);
    const bUp = b.clone().setY(slabTopY + 0.25);
    const mid = aUp
      .clone()
      .lerp(bUp, 0.5)
      .setY(slabTopY + 0.35);
    const curve = new THREE.CatmullRomCurve3(
      [a, aUp, mid, bUp, b],
      false,
      "catmullrom",
      0.6,
    );
    return new THREE.TubeGeometry(
      curve,
      32,
      (mm(el.diameter) / 2) * M,
      12,
      false,
    );
  }, [
    el.posA.x,
    el.posA.y,
    el.posB.x,
    el.posB.y,
    el.diameter,
    slabTopY,
    ceilingY,
  ]);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={HVAC_COLORS.jumperDuct} roughness={0.5} />
    </mesh>
  );
}

function Penetration({
  pos,
  drill,
  color,
  slabY,
  slabT,
}: {
  pos: Point;
  drill: number;
  color: string;
  slabY: number;
  slabT: number;
}) {
  const r = (mm(drill) / 2) * M;
  return (
    <group position={[pos.x * M, 0, pos.y * M]}>
      {/* cylinder through the slab */}
      <mesh position={[0, slabY + slabT / 2, 0]}>
        <cylinderGeometry args={[r, r, slabT + 0.02, 24]} />
        <meshStandardMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/** 3D representation of the HVAC layer. */
export function Hvac3D() {
  const hvac = useStore((s) => s.model.hvac);
  const walls = useStore((s) => s.model.walls);
  const settings = useStore((s) => s.model.settings);
  const showHvac = useStore((s) => s.showHvac);

  if (!showHvac) return null;

  const ceilingY = settings.wallHeight * M;
  const slabT = settings.slabThickness * M;
  const slabTopY = ceilingY + slabT;

  return (
    <group>
      {hvac.map((el) => {
        switch (el.kind) {
          case "acUnit":
          case "hrvUnit": {
            const color = HVAC_COLORS[el.kind];
            return (
              <group
                key={el.id}
                position={[
                  el.pos.x * M,
                  slabTopY + (el.height / 2) * M,
                  el.pos.y * M,
                ]}
                rotation={[0, (-el.rotation * Math.PI) / 180, 0]}
              >
                <mesh castShadow>
                  <boxGeometry
                    args={[el.width * M, el.height * M, el.depth * M]}
                  />
                  <meshStandardMaterial color={color} roughness={0.5} />
                </mesh>
              </group>
            );
          }

          case "supplyDiffuser":
          case "extractValve":
          case "freshAirValve": {
            const color = HVAC_COLORS[el.kind];
            const rc = (mm(el.connDiameter) / 2) * M;
            return (
              <group key={el.id}>
                <Penetration
                  pos={el.pos}
                  drill={el.drillDiameter}
                  color={color}
                  slabY={ceilingY}
                  slabT={slabT}
                />
                {/* diffuser disk under the ceiling */}
                <mesh position={[el.pos.x * M, ceilingY - 0.015, el.pos.y * M]}>
                  <cylinderGeometry args={[rc * 1.4, rc * 1.4, 0.03, 24]} />
                  <meshStandardMaterial color={color} />
                </mesh>
              </group>
            );
          }

          case "returnGrille": {
            const color = HVAC_COLORS.returnGrille;
            const s = mm(el.connDiameter) * M;
            return (
              <group key={el.id}>
                <Penetration
                  pos={el.pos}
                  drill={el.drillDiameter}
                  color={color}
                  slabY={ceilingY}
                  slabT={slabT}
                />
                <mesh position={[el.pos.x * M, ceilingY - 0.015, el.pos.y * M]}>
                  <boxGeometry args={[s * 1.4, 0.03, s * 1.4]} />
                  <meshStandardMaterial color={color} />
                </mesh>
              </group>
            );
          }

          case "duct":
            return (
              <DuctTube
                key={el.id}
                duct={el}
                hvac={hvac}
                walls={walls}
                settings={settings}
              />
            );

          case "jumperDuct":
            return (
              <group key={el.id}>
                <JumperTube el={el} slabTopY={slabTopY} ceilingY={ceilingY} />
                {[el.posA, el.posB].map((p, i) => (
                  <Penetration
                    key={i}
                    pos={p}
                    drill={el.drillDiameter}
                    color={HVAC_COLORS.jumperDuct}
                    slabY={ceilingY}
                    slabT={slabT}
                  />
                ))}
              </group>
            );

          case "facadePenetration": {
            const pos = facadePos(el, walls);
            const wall = walls.find((w) => w.id === el.wallId);
            if (!pos || !wall) return null;
            const n = perp(normalize(sub(wall.b, wall.a)));
            const angle = Math.atan2(n.y, n.x);
            const r = (mm(el.drillDiameter) / 2) * M;
            const len = (wall.thickness + 10) * M;
            return (
              <mesh
                key={el.id}
                position={[pos.x * M, el.heightAboveFloor * M, pos.y * M]}
                rotation={[0, -angle, Math.PI / 2]}
              >
                <cylinderGeometry args={[r, r, len, 24]} />
                <meshStandardMaterial
                  color={HVAC_COLORS.facadePenetration}
                  transparent
                  opacity={0.85}
                />
              </mesh>
            );
          }
        }
      })}
    </group>
  );
}
