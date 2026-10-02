import { describe, expect, it } from 'vitest'
import {
  makeDuct,
  makeExtractValve,
  makeFacadePenetration,
  makeFreshAirValve,
  makeJumperDuct,
  makeSupplyDiffuser,
} from './hvac-factories'
import {
  autoDrill,
  ductSnapPoints,
  hitTestHvac,
  isCeilingPenetration,
  moveHvac,
  updateConnDiameter,
} from './hvac'
import type { Wall } from './types'

const wall: Wall = {
  id: 'w1',
  a: { x: 0, y: 0 },
  b: { x: 400, y: 0 },
  thickness: 25,
  loadBearing: true,
}

describe('autoDrill / updateConnDiameter', () => {
  it('should compute drill = connection + 20 mm', () => {
    expect(autoDrill(250)).toBe(270)
  })

  it('should track connection changes while auto', () => {
    const s = makeSupplyDiffuser({ x: 0, y: 0 })
    updateConnDiameter(s, 250)
    expect(s.drillDiameter).toBe(270)
  })

  it('should keep a manual drill override', () => {
    const s = makeSupplyDiffuser({ x: 0, y: 0 })
    s.drillDiameter = 300
    s.drillAuto = false
    updateConnDiameter(s, 250)
    expect(s.drillDiameter).toBe(300)
  })
})

describe('ductSnapPoints', () => {
  it('should collect unit, penetration, jumper and facade points', () => {
    const hvac = [
      makeSupplyDiffuser({ x: 100, y: 100 }),
      makeJumperDuct({ x: 10, y: 10 }, { x: 50, y: 10 }),
      makeFacadePenetration(wall, 0.5),
    ]
    const pts = ductSnapPoints(hvac, [wall])
    expect(pts).toHaveLength(4)
    expect(pts[3]).toEqual({ x: 200, y: 0 })
  })
})

describe('hitTestHvac / moveHvac', () => {
  it('should hit a diffuser within its drill radius and move it', () => {
    const s = makeSupplyDiffuser({ x: 100, y: 100 })
    const hit = hitTestHvac([s], [], { x: 105, y: 100 }, 2)
    expect(hit?.el.id).toBe(s.id)
    moveHvac(s, 'body', { x: 10, y: -5 }, { x: 0, y: 0 }, [])
    expect(s.pos).toEqual({ x: 110, y: 95 })
  })

  it('should hit jumper endpoints individually', () => {
    const j = makeJumperDuct({ x: 0, y: 0 }, { x: 60, y: 0 })
    expect(hitTestHvac([j], [], { x: 1, y: 1 }, 2)?.part).toBe('posA')
    expect(hitTestHvac([j], [], { x: 59, y: 1 }, 2)?.part).toBe('posB')
    expect(hitTestHvac([j], [], { x: 30, y: 2 }, 2)?.part).toBe('body')
    moveHvac(j, 'posB', { x: 0, y: 0 }, { x: 80, y: 10 }, [])
    expect(j.posB).toEqual({ x: 80, y: 10 })
  })

  it('should hit duct vertices and segments', () => {
    const d = makeDuct([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ])
    expect(hitTestHvac([d], [], { x: 100, y: 2 }, 3)?.part).toBe('vertex:1')
    expect(hitTestHvac([d], [], { x: 50, y: 3 }, 3)?.part).toBe('body')
    moveHvac(d, 'vertex:1', { x: 0, y: 0 }, { x: 120, y: 0 }, [])
    expect(d.points[1]).toEqual({ x: 120, y: 0 })
    moveHvac(d, 'body', { x: 5, y: 5 }, { x: 0, y: 0 }, [])
    expect(d.points[0]).toEqual({ x: 5, y: 5 })
  })

  it('should keep facade penetrations glued to their wall when dragged', () => {
    const f = makeFacadePenetration(wall, 0.5)
    moveHvac(f, 'body', { x: 0, y: 0 }, { x: 300, y: 40 }, [wall])
    expect(f.t).toBeCloseTo(0.75)
  })
})

describe('isCeilingPenetration', () => {
  it('should classify slab-piercing elements', () => {
    expect(isCeilingPenetration(makeExtractValve({ x: 0, y: 0 }))).toBe(true)
    expect(isCeilingPenetration(makeFreshAirValve({ x: 0, y: 0 }))).toBe(true)
    expect(isCeilingPenetration(makeJumperDuct({ x: 0, y: 0 }, { x: 1, y: 0 }))).toBe(true)
    expect(isCeilingPenetration(makeDuct([{ x: 0, y: 0 }]))).toBe(false)
    expect(isCeilingPenetration(makeFacadePenetration(wall, 0.5))).toBe(false)
  })
})
