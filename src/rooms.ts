import {
  cross,
  dist,
  polygonCentroid,
  polygonSignedArea,
  sub,
} from "./geometry";
import type { Point, Room, Wall } from "./types";

/** endpoint merge tolerance (cm) */
const EPS = 2;
/** minimum room area (cm²) — filters out slivers */
const MIN_AREA = 5_000; // 0.5 m²

interface Node {
  p: Point;
  /** outgoing half-edges, sorted by angle */
  out: HalfEdge[];
}

interface HalfEdge {
  from: number;
  to: number;
  wallId: string;
  thickness: number;
  angle: number;
  visited: boolean;
  /** index of the opposite half-edge */
  twin: number;
}

/**
 * Detect rooms as minimal closed faces of the wall-centerline graph.
 * Handles T-junctions by splitting walls at nodes lying on their interior.
 */
export function detectRooms(
  walls: Wall[],
  roomNames: Record<string, string>,
  autoName = "Prostorija",
): Room[] {
  const usable = walls.filter((w) => dist(w.a, w.b) > EPS);
  if (usable.length < 3) return [];

  // --- merge endpoints into nodes ---
  const nodes: Node[] = [];
  const nodeAt = (p: Point): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (dist(nodes[i].p, p) <= EPS) return i;
    }
    nodes.push({ p: { ...p }, out: [] });
    return nodes.length - 1;
  };
  const ends = usable.map((w) => ({ a: nodeAt(w.a), b: nodeAt(w.b) }));

  // --- split walls at T-junctions: nodes lying on a wall's interior ---
  interface Seg {
    a: number;
    b: number;
    wallId: string;
    thickness: number;
  }
  const segs: Seg[] = [];
  usable.forEach((w, i) => {
    const { a, b } = ends[i];
    const pa = nodes[a].p;
    const pb = nodes[b].p;
    const wallLen = dist(pa, pb);
    const dir = { x: (pb.x - pa.x) / wallLen, y: (pb.y - pa.y) / wallLen };
    const cuts: { t: number; node: number }[] = [];
    nodes.forEach((n, ni) => {
      if (ni === a || ni === b) return;
      const v = sub(n.p, pa);
      const t = v.x * dir.x + v.y * dir.y;
      if (t <= EPS || t >= wallLen - EPS) return;
      const off = Math.abs(v.x * dir.y - v.y * dir.x);
      if (off <= EPS) cuts.push({ t, node: ni });
    });
    cuts.sort((x, y) => x.t - y.t);
    let prev = a;
    for (const c of cuts) {
      segs.push({ a: prev, b: c.node, wallId: w.id, thickness: w.thickness });
      prev = c.node;
    }
    segs.push({ a: prev, b, wallId: w.id, thickness: w.thickness });
  });

  // --- build half-edges ---
  const halfEdges: HalfEdge[] = [];
  for (const s of segs) {
    if (s.a === s.b) continue;
    const pa = nodes[s.a].p;
    const pb = nodes[s.b].p;
    const i = halfEdges.length;
    halfEdges.push({
      from: s.a,
      to: s.b,
      wallId: s.wallId,
      thickness: s.thickness,
      angle: Math.atan2(pb.y - pa.y, pb.x - pa.x),
      visited: false,
      twin: i + 1,
    });
    halfEdges.push({
      from: s.b,
      to: s.a,
      wallId: s.wallId,
      thickness: s.thickness,
      angle: Math.atan2(pa.y - pb.y, pa.x - pb.x),
      visited: false,
      twin: i,
    });
  }
  for (const he of halfEdges) nodes[he.from].out.push(he);
  for (const n of nodes) n.out.sort((x, y) => x.angle - y.angle);

  // --- trace faces: at each node take the next half-edge clockwise from the twin ---
  const faces: HalfEdge[][] = [];
  for (const start of halfEdges) {
    if (start.visited) continue;
    const face: HalfEdge[] = [];
    let he = start;
    let guard = 0;
    while (!he.visited && guard++ < halfEdges.length + 1) {
      he.visited = true;
      face.push(he);
      const twin = halfEdges[he.twin];
      const outs = nodes[he.to].out;
      const idx = outs.indexOf(twin);
      // continue with the next edge clockwise from the twin; with y-down
      // coordinates this traces interior faces with positive signed area
      he = outs[(idx - 1 + outs.length) % outs.length];
    }
    if (face.length >= 3 && face[face.length - 1].to === face[0].from) {
      faces.push(face);
    }
  }

  // --- convert faces to rooms ---
  const rooms: Room[] = [];
  for (const face of faces) {
    const poly = face.map((he) => nodes[he.from].p);
    const signed = polygonSignedArea(poly);
    // with the CCW-next rule above, interior faces have positive signed area
    if (signed <= 0) continue;
    const gross = signed;
    if (gross < MIN_AREA) continue;

    // net area: subtract half wall band along the perimeter, correct corners
    let area = gross;
    for (const he of face) {
      area -= dist(nodes[he.from].p, nodes[he.to].p) * (he.thickness / 2);
    }
    for (let i = 0; i < face.length; i++) {
      const prev = face[(i - 1 + face.length) % face.length];
      const cur = face[i];
      const a = nodes[prev.from].p;
      const b = nodes[cur.from].p;
      const c = nodes[cur.to].p;
      const turn = cross(sub(b, a), sub(c, b));
      const corner = (prev.thickness / 2) * (cur.thickness / 2);
      // convex corner (positive turn for a positively-oriented face) over-subtracts → add back
      area += turn > 0 ? corner : -corner;
    }

    const wallIds = [...new Set(face.map((he) => he.wallId))].sort();
    const key = wallIds.join("|");
    if (rooms.some((r) => r.key === key)) continue;
    rooms.push({
      id: key,
      key,
      name: "",
      polygon: poly,
      area: Math.max(0, area),
      centroid: polygonCentroid(poly),
      wallIds,
      boundaries: face.map((he) => ({
        wallId: he.wallId,
        a: { ...nodes[he.from].p },
        b: { ...nodes[he.to].p },
        thickness: he.thickness,
      })),
    });
  }

  // stable auto-naming: order by centroid (top→bottom, left→right)
  rooms.sort(
    (r1, r2) => r1.centroid.y - r2.centroid.y || r1.centroid.x - r2.centroid.x,
  );
  let counter = 0;
  for (const r of rooms) {
    counter += 1;
    r.name = roomNames[r.key] ?? `${autoName} ${counter}`;
  }
  return rooms;
}
