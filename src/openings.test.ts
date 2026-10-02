import { describe, expect, it } from 'vitest'
import {
  clampOpeningT,
  doorSwingGeometry,
  findWallNear,
  openingCenter,
  openingRect,
  placeOpening,
} from './openings'
import { polygonArea } from './geometry'
import type { Opening, Wall } from './types'

const wall: Wall = {
  id: 'w1',
  a: { x: 0, y: 0 },
  b: { x: 400, y: 0 },
  thickness: 25,
  loadBearing: false,
}

describe('placeOpening', () => {
  it('should place a door at the cursor projection with defaults', () => {
    const o = placeOpening(wall, { x: 200, y: 10 }, 'door')
    expect(o.t).toBeCloseTo(0.5)
    expect(o.width).toBe(90)
    expect(o.height).toBe(205)
  })

  it('should clamp near wall ends so the opening stays inside', () => {
    const o = placeOpening(wall, { x: 10, y: 0 }, 'door')
    expect(o.t * 400 - o.width / 2).toBeGreaterThanOrEqual(0)
  })

  it('should use window defaults with sill', () => {
    const o = placeOpening(wall, { x: 200, y: 0 }, 'window')
    expect(o.width).toBe(120)
    expect(o.sill).toBe(90)
  })
})

describe('clampOpeningT', () => {
  it('should center the opening when wider than the wall', () => {
    expect(clampOpeningT(wall, 500, 0.9)).toBe(0.5)
  })
})

describe('openingRect / openingCenter', () => {
  const opening: Opening = {
    id: 'o1',
    wallId: 'w1',
    type: 'door',
    t: 0.5,
    width: 90,
    height: 205,
    sill: 0,
  }
  it('should span width × wall thickness at the opening center', () => {
    expect(openingCenter(wall, opening)).toEqual({ x: 200, y: 0 })
    expect(polygonArea(openingRect(wall, opening))).toBeCloseTo(90 * 25)
  })
})

describe('doorSwingGeometry', () => {
  // horizontal wall a→b along +x; perp side ("in") is +y
  const door: Opening = {
    id: 'd1',
    wallId: 'w1',
    type: 'door',
    t: 0.5,
    width: 90,
    height: 205,
    sill: 0,
  }

  it('should default to hinge on the a-side jamb swinging to the perp side (legacy rendering)', () => {
    const g = doorSwingGeometry(wall, door)
    expect(g.hinge).toEqual({ x: 155, y: 0 })
    expect(g.jamb).toEqual({ x: 245, y: 0 })
    expect(g.tip).toEqual({ x: 155, y: 90 })
    expect(g.sweep).toBe(0)
  })

  it('should mirror the hinge to the b-side jamb for hinge=right', () => {
    const g = doorSwingGeometry(wall, { ...door, hinge: 'right' })
    expect(g.hinge).toEqual({ x: 245, y: 0 })
    expect(g.jamb).toEqual({ x: 155, y: 0 })
    expect(g.tip).toEqual({ x: 245, y: 90 })
    expect(g.sweep).toBe(1)
  })

  it('should open to the opposite wall side for swing=out', () => {
    const g = doorSwingGeometry(wall, { ...door, swing: 'out' })
    expect(g.tip).toEqual({ x: 155, y: -90 })
    expect(g.sweep).toBe(1)
  })

  it('should combine hinge=right and swing=out', () => {
    const g = doorSwingGeometry(wall, { ...door, hinge: 'right', swing: 'out' })
    expect(g.hinge).toEqual({ x: 245, y: 0 })
    expect(g.tip).toEqual({ x: 245, y: -90 })
    expect(g.sweep).toBe(0)
  })

  it('should keep the leaf length equal to the door width on slanted walls', () => {
    const slanted: Wall = { ...wall, b: { x: 300, y: 400 } }
    const g = doorSwingGeometry(slanted, { ...door, hinge: 'right', swing: 'out' })
    const leaf = Math.hypot(g.tip.x - g.hinge.x, g.tip.y - g.hinge.y)
    const jambSpan = Math.hypot(g.jamb.x - g.hinge.x, g.jamb.y - g.hinge.y)
    expect(leaf).toBeCloseTo(90)
    expect(jambSpan).toBeCloseTo(90)
  })
})

describe('findWallNear', () => {
  it('should find the closest wall within tolerance', () => {
    const w2: Wall = { ...wall, id: 'w2', a: { x: 0, y: 300 }, b: { x: 400, y: 300 } }
    expect(findWallNear([wall, w2], { x: 200, y: 290 }, 20)?.id).toBe('w2')
    expect(findWallNear([wall, w2], { x: 200, y: 150 }, 20)).toBeNull()
  })
})
