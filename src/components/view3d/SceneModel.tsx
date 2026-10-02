import { useMemo } from "react";
import * as THREE from "three";
import { wallPolygonExtended } from "../../geometry";
import { useStore } from "../../store";
import { useRooms } from "../../useRooms";
import { wallBoxes } from "../../walls3d";

/** cm → scene meters */
const M = 1 / 100;

export interface Bounds {
  cx: number;
  cz: number;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  radius: number;
}

/** Building bounds in scene meters, derived from wall outlines. */
export function useBuildingBounds(): Bounds {
  const walls = useStore((s) => s.model.walls);
  return useMemo(() => {
    if (walls.length === 0) {
      return { cx: 0, cz: 0, minX: -5, minZ: -5, maxX: 5, maxZ: 5, radius: 6 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const w of walls) {
      for (const p of wallPolygonExtended(w)) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const cx = ((minX + maxX) / 2) * M;
    const cz = ((minY + maxY) / 2) * M;
    const radius = Math.max(2, (Math.hypot(maxX - minX, maxY - minY) / 2) * M);
    return {
      cx,
      cz,
      minX: minX * M,
      minZ: minY * M,
      maxX: maxX * M,
      maxZ: maxY * M,
      radius,
    };
  }, [walls]);
}

function Walls() {
  const walls = useStore((s) => s.model.walls);
  const openings = useStore((s) => s.model.openings);
  const wallHeight = useStore((s) => s.model.settings.wallHeight);

  const items = useMemo(
    () =>
      walls.flatMap((w) => {
        const angle = Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return wallBoxes(w, openings, wallHeight).map((b, i) => ({
          key: `${w.id}-${i}`,
          position: [
            (w.a.x + cos * b.along) * M,
            b.y * M,
            (w.a.y + sin * b.along) * M,
          ] as [number, number, number],
          rotationY: -angle,
          size: [b.sizeAlong * M, b.sizeY * M, w.thickness * M] as [
            number,
            number,
            number,
          ],
        }));
      }),
    [walls, openings, wallHeight],
  );

  return (
    <group>
      {items.map((it) => (
        <mesh
          key={it.key}
          position={it.position}
          rotation={[0, it.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={it.size} />
          <meshStandardMaterial color="#e7e2d9" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Floors() {
  const rooms = useRooms();
  const geometries = useMemo(
    () =>
      rooms.map((r) => {
        const shape = new THREE.Shape(
          r.polygon.map((p) => new THREE.Vector2(p.x * M, -p.y * M)),
        );
        return { key: r.key, geometry: new THREE.ShapeGeometry(shape) };
      }),
    [rooms],
  );
  return (
    <group>
      {geometries.map((g) => (
        <mesh
          key={g.key}
          geometry={g.geometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.005, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#d9cfc0" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function SlabAndAttic({ bounds }: { bounds: Bounds }) {
  const settings = useStore((s) => s.model.settings);
  const hideRoof = useStore((s) => s.hideRoof);
  const hideSlab = useStore((s) => s.hideSlab);

  const sx = bounds.maxX - bounds.minX;
  const sz = bounds.maxZ - bounds.minZ;
  if (sx <= 0 || sz <= 0) return null;

  const wallTop = settings.wallHeight * M;
  const slabT = settings.slabThickness * M;
  const atticH = settings.atticHeight * M;

  return (
    <group position={[bounds.cx, 0, bounds.cz]}>
      {!hideSlab && (
        <mesh position={[0, wallTop + slabT / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[sx, slabT, sz]} />
          <meshStandardMaterial color="#b6b0a6" roughness={0.85} />
        </mesh>
      )}
      {!hideRoof && (
        <mesh position={[0, wallTop + slabT + atticH / 2, 0]}>
          <boxGeometry args={[sx, atticH, sz]} />
          <meshStandardMaterial
            color="#7cb2f2"
            transparent
            opacity={0.14}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/** The whole synchronized building model. */
export function SceneModel() {
  const bounds = useBuildingBounds();
  return (
    <group>
      <Floors />
      <Walls />
      <SlabAndAttic bounds={bounds} />
    </group>
  );
}
