import { Edges } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { openingCenter } from "../../openings";
import { detectRooms } from "../../rooms";
import {
  createRoomSlabGeometry,
  createRoomSurfaceGeometry,
  flatRoofLayout,
  roofLayout,
} from "../../scene-geometry";
import { modelForStory } from "../../stories";
import { useStore } from "../../store";
import type { Opening, Room, Story, Wall } from "../../types";
import { wallBoxes } from "../../walls3d";
import {
  buildingBoundsForWalls,
  useBuildingBounds,
  type Bounds,
} from "./bounds3d";
import { Hvac3D } from "./Hvac3D";

/** cm → scene meters */
const M = 1 / 100;

function Walls({
  walls,
  openings,
  wallHeight,
}: {
  walls: Wall[];
  openings: Opening[];
  wallHeight: number;
}) {
  const items = useMemo(
    () =>
      walls.flatMap((wall) => {
        const angle = Math.atan2(
          wall.b.y - wall.a.y,
          wall.b.x - wall.a.x,
        );
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return wallBoxes(wall, openings, wallHeight).map((box, index) => ({
          key: `${wall.id}-${index}`,
          position: [
            (wall.a.x + cos * box.along) * M,
            box.y * M,
            (wall.a.y + sin * box.along) * M,
          ] as [number, number, number],
          rotationY: -angle,
          size: [
            box.sizeAlong * M,
            box.sizeY * M,
            wall.thickness * M,
          ] as [number, number, number],
          exterior: wall.loadBearing,
        }));
      }),
    [walls, openings, wallHeight],
  );

  return (
    <group>
      {items.map((item) => (
        <mesh
          key={item.key}
          position={item.position}
          rotation={[0, item.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={item.size} />
          <meshStandardMaterial
            color={item.exterior ? "#e9e2d5" : "#f4efe7"}
            roughness={0.76}
            metalness={0.02}
          />
          <Edges color="#b9aea1" threshold={20} />
        </mesh>
      ))}
    </group>
  );
}

function FoundationBands({ walls }: { walls: Wall[] }) {
  const items = useMemo(
    () =>
      walls
        .filter((wall) => wall.loadBearing)
        .map((wall) => {
          const dx = wall.b.x - wall.a.x;
          const dz = wall.b.y - wall.a.y;
          return {
            id: wall.id,
            length: Math.hypot(dx, dz) * M,
            position: [
              ((wall.a.x + wall.b.x) / 2) * M,
              -0.09,
              ((wall.a.y + wall.b.y) / 2) * M,
            ] as [number, number, number],
            rotationY: -Math.atan2(dz, dx),
            depth: wall.thickness * M + 0.08,
          };
        }),
    [walls],
  );

  return (
    <group>
      {items.map((item) => (
        <mesh
          key={item.id}
          position={item.position}
          rotation={[0, item.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[item.length + 0.06, 0.18, item.depth]} />
          <meshStandardMaterial color="#8c8b84" roughness={0.9} />
          <Edges color="#74746e" threshold={20} />
        </mesh>
      ))}
    </group>
  );
}

function GarageRollerInsert({
  width,
  height,
  depth,
  frame,
}: {
  width: number;
  height: number;
  depth: number;
  frame: number;
}) {
  const panelWidth = Math.max(0.08, width - frame * 2);
  const panelHeight = Math.max(0.08, height - frame * 1.5);
  const slatCount = Math.max(5, Math.floor(panelHeight / 0.14));

  return (
    <>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[panelWidth, panelHeight, 0.055]} />
        <meshStandardMaterial
          color="#65727a"
          roughness={0.42}
          metalness={0.58}
        />
        <Edges color="#39464d" threshold={12} />
      </mesh>
      {Array.from({ length: slatCount - 1 }, (_, index) => {
        const y =
          -panelHeight / 2 + ((index + 1) * panelHeight) / slatCount;
        return (
          <mesh key={`roller-slat-${index}`} position={[0, y, 0]}>
            <boxGeometry args={[panelWidth - 0.025, 0.012, 0.075]} />
            <meshStandardMaterial
              color="#a6b0b5"
              roughness={0.38}
              metalness={0.64}
            />
          </mesh>
        );
      })}
      {[
        [-width / 2 + frame / 2, 0, frame, height],
        [width / 2 - frame / 2, 0, frame, height],
      ].map(([x, y, w, h], index) => (
        <mesh
          key={`roller-frame-${index}`}
          position={[x, y, 0]}
          castShadow
        >
          <boxGeometry args={[w, h, depth]} />
          <meshStandardMaterial
            color="#343f45"
            roughness={0.48}
            metalness={0.52}
          />
        </mesh>
      ))}
      <mesh
        position={[0, height / 2 - 0.09, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width + 0.12, 0.18, depth + 0.08]} />
        <meshStandardMaterial
          color="#404c52"
          roughness={0.46}
          metalness={0.56}
        />
        <Edges color="#273137" threshold={18} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.025, 0]} receiveShadow>
        <boxGeometry args={[width, 0.05, depth + 0.03]} />
        <meshStandardMaterial
          color="#29343a"
          roughness={0.58}
          metalness={0.44}
        />
      </mesh>
    </>
  );
}

function OpeningInserts({
  walls,
  openings,
}: {
  walls: Wall[];
  openings: Opening[];
}) {
  const wallMap = useMemo(
    () => new Map(walls.map((wall) => [wall.id, wall])),
    [walls],
  );
  return (
    <group>
      {openings.map((opening) => {
        const wall = wallMap.get(opening.wallId);
        if (!wall) return null;
        const center = openingCenter(wall, opening);
        const angle = Math.atan2(
          wall.b.y - wall.a.y,
          wall.b.x - wall.a.x,
        );
        const bottom = opening.type === "window" ? opening.sill : 0;
        const width = opening.width * M;
        const height = opening.height * M;
        const frame = 0.045;
        const depth = Math.max(0.05, wall.thickness * M * 0.72);
        return (
          <group
            key={opening.id}
            position={[
              center.x * M,
              (bottom + opening.height / 2) * M,
              center.y * M,
            ]}
            rotation={[0, -angle, 0]}
          >
            {opening.type === "window" ? (
              <>
                <mesh castShadow>
                  <boxGeometry args={[width - frame * 2, height - frame * 2, 0.025]} />
                  <meshPhysicalMaterial
                    color="#84bfd8"
                    transparent
                    opacity={0.56}
                    roughness={0.06}
                    metalness={0.05}
                    transmission={0.34}
                    clearcoat={0.35}
                    clearcoatRoughness={0.12}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                {[
                  [0, height / 2 - frame / 2, width, frame],
                  [0, -height / 2 + frame / 2, width, frame],
                  [-width / 2 + frame / 2, 0, frame, height],
                  [width / 2 - frame / 2, 0, frame, height],
                  [0, 0, frame * 0.7, height - frame * 2],
                ].map(([x, y, w, h], index) => (
                  <mesh key={index} position={[x, y, 0]} castShadow>
                    <boxGeometry args={[w, h, depth]} />
                    <meshStandardMaterial
                      color="#f8fafc"
                      roughness={0.55}
                      metalness={0.12}
                    />
                  </mesh>
                ))}
                <mesh
                  position={[0, -height / 2 - 0.025, depth / 2 + 0.025]}
                  castShadow
                >
                  <boxGeometry args={[width + 0.12, 0.06, depth + 0.1]} />
                  <meshStandardMaterial color="#eeeae2" roughness={0.7} />
                </mesh>
              </>
            ) : opening.doorKind === "garageRoller" ? (
              <GarageRollerInsert
                width={width}
                height={height}
                depth={depth}
                frame={frame}
              />
            ) : (
              <>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[width - 0.05, height - 0.04, 0.055]} />
                  <meshStandardMaterial color="#936143" roughness={0.68} />
                  <Edges color="#68432f" threshold={12} />
                </mesh>
                {[
                  [0, height / 2 - frame / 2, width + frame, frame],
                  [-width / 2 + frame / 2, 0, frame, height],
                  [width / 2 - frame / 2, 0, frame, height],
                ].map(([x, y, w, h], index) => (
                  <mesh key={`door-trim-${index}`} position={[x, y, 0]}>
                    <boxGeometry args={[w, h, depth]} />
                    <meshStandardMaterial color="#f0ece4" roughness={0.74} />
                  </mesh>
                ))}
                <mesh position={[width * 0.34, 0, depth / 2 + 0.018]}>
                  <sphereGeometry args={[0.035, 12, 8]} />
                  <meshStandardMaterial
                    color="#d8b45b"
                    metalness={0.72}
                    roughness={0.28}
                  />
                </mesh>
                <mesh position={[0, -height / 2 + 0.02, depth / 2 + 0.035]}>
                  <boxGeometry args={[width + 0.08, 0.045, depth + 0.08]} />
                  <meshStandardMaterial color="#85847e" roughness={0.82} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Floors({ rooms }: { rooms: Room[] }) {
  const geometries = useMemo(
    () =>
      rooms.map((room) => ({
        key: room.key,
        geometry: createRoomSurfaceGeometry(room.polygon),
      })),
    [rooms],
  );
  useEffect(
    () => () => geometries.forEach((item) => item.geometry.dispose()),
    [geometries],
  );

  return (
    <group>
      {geometries.map((item, index) => (
        <mesh
          key={item.key}
          geometry={item.geometry}
          position={[0, 0.006 + index * 0.0001, 0]}
          receiveShadow
        >
          <meshStandardMaterial
            color={index % 2 ? "#cbbda9" : "#d7ccbb"}
            roughness={0.92}
          />
        </mesh>
      ))}
    </group>
  );
}

function StorySlabs({ rooms }: { rooms: Room[] }) {
  const slabThickness = useStore(
    (state) => state.model.settings.slabThickness,
  );
  const geometries = useMemo(
    () =>
      rooms.map((room) => ({
        key: room.key,
        geometry: createRoomSlabGeometry(room.polygon, slabThickness * M),
      })),
    [rooms, slabThickness],
  );
  useEffect(
    () => () => geometries.forEach((item) => item.geometry.dispose()),
    [geometries],
  );

  return (
    <group>
      {geometries.map((item) => (
        <mesh
          key={item.key}
          geometry={item.geometry}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#aaa9a3" roughness={0.9} />
          <Edges color="#85847f" threshold={30} />
        </mesh>
      ))}
    </group>
  );
}

function FlatRoof({
  bounds,
  baseY,
  metal,
}: {
  bounds: Bounds;
  baseY: number;
  metal: boolean;
}) {
  const layout = flatRoofLayout(bounds, metal);
  const {
    centerX,
    centerZ,
    width,
    depth,
    deckThickness,
    parapetHeight,
    pitchAlongX,
    pitchRise,
    pitchAngle,
  } = layout;
  if (width <= 0 || depth <= 0) return null;

  const parapetThickness = 0.13;
  const capThickness = 0.055;
  const innerWidth = Math.max(0.1, width - parapetThickness * 2);
  const innerDepth = Math.max(0.1, depth - parapetThickness * 2);
  const crossSpan = pitchAlongX ? depth : width;
  const seamCount = Math.max(2, Math.ceil(crossSpan / 0.55));
  const seamOffsets = Array.from(
    { length: seamCount },
    (_, index) =>
      -crossSpan / 2 + ((index + 0.5) * crossSpan) / seamCount,
  );
  const metalRotation: [number, number, number] = pitchAlongX
    ? [0, 0, -pitchAngle]
    : [pitchAngle, 0, 0];

  return (
    <group position={[centerX, baseY, centerZ]}>
      <mesh
        position={[0, deckThickness / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, deckThickness, depth]} />
        <meshStandardMaterial color="#b8b5ae" roughness={0.88} />
        <Edges color="#858580" threshold={18} />
      </mesh>

      {metal ? (
        <>
          <group
            position={[0, deckThickness + 0.08 + pitchRise / 2, 0]}
            rotation={metalRotation}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[width, 0.075, depth]} />
              <meshStandardMaterial
                color="#53636a"
                roughness={0.36}
                metalness={0.72}
              />
              <Edges color="#303d42" threshold={12} />
            </mesh>
            {seamOffsets.map((offset, index) => (
              <mesh
                key={`seam-${index}`}
                position={
                  pitchAlongX
                    ? [0, 0.06, offset]
                    : [offset, 0.06, 0]
                }
                castShadow
              >
                <boxGeometry
                  args={
                    pitchAlongX
                      ? [width + 0.025, 0.045, 0.026]
                      : [0.026, 0.045, depth + 0.025]
                  }
                />
                <meshStandardMaterial
                  color="#72838a"
                  roughness={0.3}
                  metalness={0.78}
                />
              </mesh>
            ))}
          </group>

          {[
            [0, deckThickness + 0.08, -depth / 2, width, 0.16, 0.07],
            [0, deckThickness + 0.08, depth / 2, width, 0.16, 0.07],
            [-width / 2, deckThickness + 0.08, 0, 0.07, 0.16, depth],
            [width / 2, deckThickness + 0.08, 0, 0.07, 0.16, depth],
          ].map(([x, y, z, sizeX, sizeY, sizeZ], index) => (
            <mesh key={`metal-fascia-${index}`} position={[x, y, z]} castShadow>
              <boxGeometry args={[sizeX, sizeY, sizeZ]} />
              <meshStandardMaterial
                color="#354248"
                roughness={0.4}
                metalness={0.58}
              />
            </mesh>
          ))}

          <mesh
            position={
              pitchAlongX
                ? [width / 2 + 0.045, deckThickness + 0.015, 0]
                : [0, deckThickness + 0.015, depth / 2 + 0.045]
            }
            rotation={
              pitchAlongX
                ? [Math.PI / 2, 0, 0]
                : [0, 0, Math.PI / 2]
            }
            castShadow
          >
            <cylinderGeometry
              args={[
                0.048,
                0.048,
                pitchAlongX ? depth : width,
                12,
              ]}
            />
            <meshStandardMaterial
              color="#2f393d"
              roughness={0.45}
              metalness={0.65}
            />
          </mesh>
        </>
      ) : (
        <>
          <mesh
            position={[0, deckThickness + 0.024, 0]}
            receiveShadow
          >
            <boxGeometry args={[innerWidth, 0.048, innerDepth]} />
            <meshStandardMaterial color="#555d5b" roughness={0.94} />
          </mesh>

          {[-1, 1].map((side) => (
            <group key={`parapet-x-${side}`}>
              <mesh
                position={[
                  side * (width / 2 - parapetThickness / 2),
                  deckThickness + parapetHeight / 2,
                  0,
                ]}
                castShadow
                receiveShadow
              >
                <boxGeometry
                  args={[parapetThickness, parapetHeight, depth]}
                />
                <meshStandardMaterial color="#e1dcd2" roughness={0.82} />
                <Edges color="#aaa59d" threshold={18} />
              </mesh>
              <mesh
                position={[
                  side * (width / 2 - parapetThickness / 2),
                  deckThickness + parapetHeight + capThickness / 2,
                  0,
                ]}
                castShadow
              >
                <boxGeometry
                  args={[parapetThickness + 0.06, capThickness, depth + 0.04]}
                />
                <meshStandardMaterial color="#929793" roughness={0.72} />
              </mesh>
            </group>
          ))}

          {[-1, 1].map((side) => (
            <group key={`parapet-z-${side}`}>
              <mesh
                position={[
                  0,
                  deckThickness + parapetHeight / 2,
                  side * (depth / 2 - parapetThickness / 2),
                ]}
                castShadow
                receiveShadow
              >
                <boxGeometry
                  args={[innerWidth, parapetHeight, parapetThickness]}
                />
                <meshStandardMaterial color="#e1dcd2" roughness={0.82} />
                <Edges color="#aaa59d" threshold={18} />
              </mesh>
              <mesh
                position={[
                  0,
                  deckThickness + parapetHeight + capThickness / 2,
                  side * (depth / 2 - parapetThickness / 2),
                ]}
                castShadow
              >
                <boxGeometry
                  args={[innerWidth, capThickness, parapetThickness + 0.06]}
                />
                <meshStandardMaterial color="#929793" roughness={0.72} />
              </mesh>
            </group>
          ))}

          <mesh
            position={[
              width * 0.2,
              deckThickness + 0.06,
              depth * 0.18,
            ]}
            receiveShadow
          >
            <cylinderGeometry args={[0.105, 0.105, 0.025, 20]} />
            <meshStandardMaterial
              color="#252b2a"
              roughness={0.58}
              metalness={0.45}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

function PitchedRoof({ bounds, baseY }: { bounds: Bounds; baseY: number }) {
  const atticHeight = useStore((state) => state.model.settings.atticHeight) * M;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  if (width <= 0 || depth <= 0) return null;
  const {
    ridgeAlongX,
    halfSpan,
    roofHeight,
    slopeLength,
    slope,
    ridgeLength,
    panelCenterOffset,
  } = roofLayout(bounds, atticHeight);
  const panelThickness = 0.09;
  const panelColor = "#9b3f33";
  const trimColor = "#eee9df";
  const gutterColor = "#4d5557";
  const gableHalf = (ridgeAlongX ? depth : width) / 2;
  const gableShape = new THREE.Shape([
    new THREE.Vector2(-gableHalf, 0),
    new THREE.Vector2(gableHalf, 0),
    new THREE.Vector2(0, roofHeight),
  ]);

  return (
    <group position={[bounds.cx, baseY, bounds.cz]}>
      {ridgeAlongX ? (
        <>
          {[-1, 1].map((side) => (
            <mesh
              key={`gable-${side}`}
              position={[side * (width / 2 + 0.002), 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              castShadow
              receiveShadow
            >
              <shapeGeometry args={[gableShape]} />
              <meshStandardMaterial
                color="#ded7cc"
                roughness={0.84}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[
                0,
                roofHeight / 2,
                side * panelCenterOffset,
              ]}
              rotation={[side * slope, 0, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[ridgeLength, panelThickness, slopeLength]}
              />
              <meshStandardMaterial
                color={panelColor}
                roughness={0.7}
                metalness={0.025}
              />
              <Edges color="#712c25" threshold={12} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <group key={`eave-${side}`}>
              <mesh
                position={[0, -0.07, side * halfSpan]}
                castShadow
              >
                <boxGeometry args={[ridgeLength, 0.16, 0.075]} />
                <meshStandardMaterial color={trimColor} roughness={0.75} />
              </mesh>
              <mesh
                position={[0, -0.13, side * (halfSpan + 0.045)]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.055, 0.055, ridgeLength, 12]} />
                <meshStandardMaterial
                  color={gutterColor}
                  roughness={0.55}
                  metalness={0.35}
                />
              </mesh>
            </group>
          ))}
          {[-1, 1].flatMap((end) =>
            [-1, 1].map((side) => (
              <mesh
                key={`rake-${end}-${side}`}
                position={[
                  end * (ridgeLength / 2),
                  roofHeight / 2,
                  side * panelCenterOffset,
                ]}
                rotation={[side * slope, 0, 0]}
                castShadow
              >
                <boxGeometry args={[0.085, 0.105, slopeLength]} />
                <meshStandardMaterial color={trimColor} roughness={0.75} />
              </mesh>
            )),
          )}
          <mesh
            position={[0, roofHeight + 0.025, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.06, 0.06, ridgeLength, 16]} />
            <meshStandardMaterial color="#692922" roughness={0.62} />
          </mesh>
        </>
      ) : (
        <>
          {[-1, 1].map((side) => (
            <mesh
              key={`gable-${side}`}
              position={[0, 0, side * (depth / 2 + 0.002)]}
              castShadow
              receiveShadow
            >
              <shapeGeometry args={[gableShape]} />
              <meshStandardMaterial
                color="#ded7cc"
                roughness={0.84}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[
                side * panelCenterOffset,
                roofHeight / 2,
                0,
              ]}
              rotation={[0, 0, -side * slope]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[slopeLength, panelThickness, ridgeLength]}
              />
              <meshStandardMaterial
                color={panelColor}
                roughness={0.7}
                metalness={0.025}
              />
              <Edges color="#712c25" threshold={12} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <group key={`eave-${side}`}>
              <mesh
                position={[side * halfSpan, -0.07, 0]}
                castShadow
              >
                <boxGeometry args={[0.075, 0.16, ridgeLength]} />
                <meshStandardMaterial color={trimColor} roughness={0.75} />
              </mesh>
              <mesh
                position={[side * (halfSpan + 0.045), -0.13, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.055, 0.055, ridgeLength, 12]} />
                <meshStandardMaterial
                  color={gutterColor}
                  roughness={0.55}
                  metalness={0.35}
                />
              </mesh>
            </group>
          ))}
          {[-1, 1].flatMap((end) =>
            [-1, 1].map((side) => (
              <mesh
                key={`rake-${end}-${side}`}
                position={[
                  side * panelCenterOffset,
                  roofHeight / 2,
                  end * (ridgeLength / 2),
                ]}
                rotation={[0, 0, -side * slope]}
                castShadow
              >
                <boxGeometry args={[slopeLength, 0.105, 0.085]} />
                <meshStandardMaterial color={trimColor} roughness={0.75} />
              </mesh>
            )),
          )}
          <mesh
            position={[0, roofHeight + 0.025, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.06, 0.06, ridgeLength, 16]} />
            <meshStandardMaterial color="#692922" roughness={0.62} />
          </mesh>
        </>
      )}
    </group>
  );
}

function StoryLevel({ story }: { story: Story }) {
  const model = useStore((state) => state.model);
  const showSlabs = useStore((state) => state.showSlabs);
  const storyModel = useMemo(
    () => modelForStory(model, story.id),
    [model, story.id],
  );
  const rooms = useMemo(
    () => detectRooms(storyModel.walls, model.roomNames, "Room"),
    [storyModel.walls, model.roomNames],
  );
  const wallHeight = model.settings.wallHeight;

  return (
    <group position={[0, story.elevation * M, 0]}>
      {showSlabs && (
        <>
          <StorySlabs rooms={rooms} />
          <FoundationBands walls={storyModel.walls} />
        </>
      )}
      <Floors rooms={rooms} />
      <Walls
        walls={storyModel.walls}
        openings={storyModel.openings}
        wallHeight={wallHeight}
      />
      <OpeningInserts
        walls={storyModel.walls}
        openings={storyModel.openings}
      />
      <Hvac3D
        hvac={storyModel.hvac}
        walls={storyModel.walls}
      />
    </group>
  );
}

/** The whole synchronized, multi-story building model. */
export function SceneModel() {
  const model = useStore((state) => state.model);
  const visibleStoryIds = useStore((state) => state.visibleStoryIds);
  const showRoof = useStore((state) => state.showRoof);
  const bounds = useBuildingBounds();
  const stories = [...model.stories].sort(
    (a, b) => a.elevation - b.elevation,
  );
  const visibleStories = stories.filter((story) =>
    visibleStoryIds.includes(story.id),
  );
  const topStory = visibleStories[visibleStories.length - 1];
  const roofBase =
    ((topStory?.elevation ?? 0) + model.settings.wallHeight) * M;
  const roofBounds = topStory
    ? buildingBoundsForWalls(modelForStory(model, topStory.id).walls)
    : bounds;
  const roofType = model.settings.roofType;

  return (
    <group>
      {visibleStories.map((story) => (
        <StoryLevel key={story.id} story={story} />
      ))}
      {showRoof && topStory && roofType === "pitched" && (
        <PitchedRoof bounds={roofBounds} baseY={roofBase} />
      )}
      {showRoof && topStory && roofType !== "pitched" && (
        <FlatRoof
          bounds={roofBounds}
          baseY={roofBase}
          metal={roofType === "metalFlat"}
        />
      )}
    </group>
  );
}
