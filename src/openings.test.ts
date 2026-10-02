import { describe, expect, it } from 'vitest'
import {
  applyDoorKind,
  clampOpeningT,
  doorSwingGeometry,
  findWallNear,
  openingCenter,
  openingEdgePoints,
  openingRect,
  placeOpening,
  resizeOpeningEdge,
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

describe('applyDoorKind', () => {
  const door: Opening = {
    id: 'door-1',
    wallId: 'w1',
    type: 'door',
    t: 0.8,
    width: 90,
    height: 205,
    sill: 0,
  }

  it('uses practical garage roller dimensions and keeps the opening in its wall', () => {
    const converted = { ...door }

    applyDoorKind(converted, wall, 'garageRoller')

    expect(converted.doorKind).toBe('garageRoller')
    expect(converted.width).toBe(300)
    expect(converted.height).toBe(240)
    expect(converted.sill).toBe(0)
    expect(converted.t * 400 + converted.width / 2).toBeLessThanOrEqual(400)
  })

  it('limits a roller door to short walls and restores hinged defaults', () => {
    const shortWall: Wall = { ...wall, b: { x: 220, y: 0 } }
    const converted = { ...door }

    applyDoorKind(converted, shortWall, 'garageRoller')
    expect(converted.width).toBe(220)
    expect(converted.t).toBe(0.5)

    applyDoorKind(converted, shortWall, 'swing')
    expect(converted.doorKind).toBe('swing')
    expect(converted.width).toBe(90)
    expect(converted.height).toBe(205)
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

describe('resizeOpeningEdge', () => {
  const opening: Opening = {
    id: 'window-1',
    wallId: 'w1',
    type: 'window',
    t: 0.5,
    width: 120,
    height: 130,
    sill: 90,
  }

  it('moves one jamb while keeping the opposite jamb fixed', () => {
    const resized = resizeOpeningEdge(
      wall,
      opening,
      'b',
      { x: 340, y: 20 },
      5,
    )

    expect(resized.width).toBe(200)
    expect(resized.t).toBeCloseTo(0.6)
    expect(openingEdgePoints(wall, { ...opening, ...resized })).toEqual({
      a: { x: 140, y: 0 },
      b: { x: 340, y: 0 },
    })
  })

  it('clamps resize handles to the wall and enforces a minimum width', () => {
    const atWallEnd = resizeOpeningEdge(
      wall,
      opening,
      'b',
      { x: 500, y: 0 },
      1,
    )
    expect(atWallEnd.width).toBe(260)
    expect(
      openingEdgePoints(wall, { ...opening, ...atWallEnd }).b.x,
    ).toBe(400)

    const minimum = resizeOpeningEdge(
      wall,
      opening,
      'a',
      { x: 300, y: 0 },
      1,
    )
    expect(minimum.width).toBe(20)
    expect(openingEdgePoints(wall, { ...opening, ...minimum }).b.x).toBe(260)
  })

  it('projects and snaps a resize cursor along slanted walls', () => {
    const slanted: Wall = { ...wall, b: { x: 300, y: 400 } }
    const resized = resizeOpeningEdge(
      slanted,
      opening,
      'b',
      { x: 205, y: 260 },
      5,
    )
    const edges = openingEdgePoints(slanted, { ...opening, ...resized })

    expect(resized.width % 5).toBe(0)
    expect(edges.a.x).toBeCloseTo(114)
    expect(edges.a.y).toBeCloseTo(152)
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
