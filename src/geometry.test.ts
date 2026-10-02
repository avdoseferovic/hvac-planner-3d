import { describe, expect, it } from 'vitest'
import {
  closestT,
  distToSegment,
  formatArea,
  formatLength,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  snapToAxis,
  snapToEndpoints,
  snapToGrid,
  wallPolygon,
} from './geometry'
import type { Wall } from './types'

const wall = (ax: number, ay: number, bx: number, by: number, thickness = 25): Wall => ({
  id: 'w',
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  thickness,
  loadBearing: false,
})

describe('snapToGrid', () => {
  it('should round to the nearest grid multiple', () => {
    expect(snapToGrid({ x: 12, y: 13 }, 5)).toEqual({ x: 10, y: 15 })
    expect(snapToGrid({ x: -12, y: 2.4 }, 5)).toEqual({ x: -10, y: 0 })
  })
})

describe('snapToAxis', () => {
  it('should flatten onto the horizontal axis when dx dominates', () => {
    expect(snapToAxis({ x: 0, y: 0 }, { x: 100, y: 30 })).toEqual({ x: 100, y: 0 })
  })
  it('should flatten onto the vertical axis when dy dominates', () => {
    expect(snapToAxis({ x: 0, y: 0 }, { x: 30, y: 100 })).toEqual({ x: 0, y: 100 })
  })
})

describe('snapToEndpoints', () => {
  it('should return the nearest endpoint within radius', () => {
    const walls = [wall(0, 0, 100, 0), wall(100, 0, 100, 100)]
    expect(snapToEndpoints({ x: 98, y: 3 }, walls, 10)).toEqual({ x: 100, y: 0 })
  })
  it('should return null when nothing is in range', () => {
    expect(snapToEndpoints({ x: 50, y: 50 }, [wall(0, 0, 10, 0)], 5)).toBeNull()
  })
})

describe('closestT / distToSegment', () => {
  it('should clamp t to segment ends', () => {
    expect(closestT({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: -50, y: 0 })).toBe(0)
    expect(closestT({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 150, y: 0 })).toBe(1)
    expect(closestT({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 30, y: 40 })).toBeCloseTo(0.3)
  })
  it('should measure perpendicular distance inside the segment', () => {
    expect(distToSegment({ x: 50, y: 30 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(30)
  })
})

describe('wallPolygon', () => {
  it('should produce a rectangle of wall length × thickness', () => {
    const poly = wallPolygon(wall(0, 0, 100, 0, 20))
    expect(polygonArea(poly)).toBeCloseTo(100 * 20)
  })
})

describe('polygon helpers', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 400, y: 0 },
    { x: 400, y: 300 },
    { x: 0, y: 300 },
  ]
  it('should compute area', () => {
    expect(polygonArea(square)).toBe(120_000) // 12 m²
  })
  it('should compute the centroid', () => {
    expect(polygonCentroid(square)).toEqual({ x: 200, y: 150 })
  })
  it('should detect points inside and outside', () => {
    expect(pointInPolygon({ x: 200, y: 150 }, square)).toBe(true)
    expect(pointInPolygon({ x: 500, y: 150 }, square)).toBe(false)
  })
})

describe('formatting', () => {
  it('should format short lengths in cm and long ones in m', () => {
    expect(formatLength(83)).toBe('83 cm')
    expect(formatLength(245)).toBe('2.45 m')
  })
  it('should format areas in m²', () => {
    expect(formatArea(120_000)).toBe('12 m²')
  })
})
