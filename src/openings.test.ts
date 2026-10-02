import { describe, expect, it } from 'vitest'
import { clampOpeningT, findWallNear, openingCenter, openingRect, placeOpening } from './openings'
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

describe('findWallNear', () => {
  it('should find the closest wall within tolerance', () => {
    const w2: Wall = { ...wall, id: 'w2', a: { x: 0, y: 300 }, b: { x: 400, y: 300 } }
    expect(findWallNear([wall, w2], { x: 200, y: 290 }, 20)?.id).toBe('w2')
    expect(findWallNear([wall, w2], { x: 200, y: 150 }, 20)).toBeNull()
  })
})
