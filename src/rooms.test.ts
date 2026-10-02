import { describe, expect, it } from 'vitest'
import { detectRooms } from './rooms'
import type { Wall } from './types'

let n = 0
const wall = (ax: number, ay: number, bx: number, by: number, thickness = 25): Wall => ({
  id: `w${++n}`,
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  thickness,
  loadBearing: false,
})

/** 4m × 3m square room, centerline coords */
const square = () => [
  wall(0, 0, 400, 0),
  wall(400, 0, 400, 300),
  wall(400, 300, 0, 300),
  wall(0, 300, 0, 0),
]

describe('detectRooms', () => {
  it('should detect a single closed rectangle as one room', () => {
    const rooms = detectRooms(square(), {})
    expect(rooms).toHaveLength(1)
    // inner area for 25cm walls: (400-25) × (300-25) = 10.3125 m²
    expect(rooms[0].area / 10_000).toBeCloseTo(10.3125, 2)
    expect(rooms[0].centroid.x).toBeCloseTo(200)
    expect(rooms[0].centroid.y).toBeCloseTo(150)
  })

  it('should detect nothing for an open polyline', () => {
    const walls = square().slice(0, 3)
    expect(detectRooms(walls, {})).toHaveLength(0)
  })

  it('should detect two rooms when a divider splits the rectangle (T-junctions)', () => {
    const walls = [...square(), wall(150, 0, 150, 300, 14)]
    const rooms = detectRooms(walls, {})
    expect(rooms).toHaveLength(2)
    const areas = rooms.map((r) => r.area / 10_000).sort((a, b) => a - b)
    // left: (150-12.5-7)×(300-25)=3.59, right: (250-12.5-7)×(300-25)=6.34 (approx)
    expect(areas[0]).toBeGreaterThan(3)
    expect(areas[0]).toBeLessThan(4.2)
    expect(areas[1]).toBeGreaterThan(5.8)
    expect(areas[1]).toBeLessThan(7)
    expect(areas[0] + areas[1]).toBeLessThan(10.4)
  })

  it('should assign stable keys and honor custom names', () => {
    const walls = square()
    const [room] = detectRooms(walls, {})
    const named = detectRooms(walls, { [room.key]: 'Kupatilo 1' })
    expect(named[0].name).toBe('Kupatilo 1')
    // key survives moving a wall (ids unchanged)
    walls[0].a.y += 50
    walls[0].b.y += 50
    walls[1].a.y += 50
    walls[3].b.y += 50
    const moved = detectRooms(walls, {})
    expect(moved[0]?.key).toBe(room.key)
  })

  it('should auto-name rooms sequentially', () => {
    const rooms = detectRooms([...square(), wall(150, 0, 150, 300, 14)], {})
    const names = rooms.map((r) => r.name).sort()
    expect(names).toEqual(['Prostorija 1', 'Prostorija 2'])
  })

  it('should tolerate slightly imprecise endpoints', () => {
    const walls = [
      wall(0, 0, 400, 0),
      wall(400.5, 0.4, 400, 300),
      wall(400, 300.5, 0, 300),
      wall(0.4, 300, 0, 0.5),
    ]
    expect(detectRooms(walls, {})).toHaveLength(1)
  })

  it('should ignore dangling walls', () => {
    const walls = [...square(), wall(400, 150, 600, 150)]
    const rooms = detectRooms(walls, {})
    expect(rooms).toHaveLength(1)
  })
})
