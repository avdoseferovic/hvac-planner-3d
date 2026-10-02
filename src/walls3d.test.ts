import { describe, expect, it } from 'vitest'
import { wallBoxes } from './walls3d'
import type { Opening, Wall } from './types'

const wall: Wall = {
  id: 'w1',
  a: { x: 0, y: 0 },
  b: { x: 400, y: 0 },
  thickness: 25,
  loadBearing: false,
}

const door: Opening = {
  id: 'd1',
  wallId: 'w1',
  type: 'door',
  t: 0.5,
  width: 90,
  height: 205,
  sill: 0,
}

const window_: Opening = {
  id: 'n1',
  wallId: 'w1',
  type: 'window',
  t: 0.25,
  width: 100,
  height: 130,
  sill: 90,
}

const totalVolume = (boxes: { sizeAlong: number; sizeY: number }[]) =>
  boxes.reduce((s, b) => s + b.sizeAlong * b.sizeY, 0)

describe('wallBoxes', () => {
  it('should return a single full box for a wall without openings', () => {
    const boxes = wallBoxes(wall, [], 280)
    expect(boxes).toEqual([{ along: 200, y: 140, sizeAlong: 400, sizeY: 280 }])
  })

  it('should cut a door hole with a lintel above', () => {
    const boxes = wallBoxes(wall, [door], 280)
    // left piece, lintel, right piece
    expect(boxes).toHaveLength(3)
    const area = totalVolume(boxes)
    expect(area).toBeCloseTo(400 * 280 - 90 * 205)
    const lintel = boxes.find((b) => b.y > 205)
    expect(lintel).toBeDefined()
    expect(lintel!.sizeY).toBeCloseTo(75)
  })

  it('should cut a window hole with sill and lintel', () => {
    const boxes = wallBoxes(wall, [window_], 280)
    expect(boxes).toHaveLength(4)
    expect(totalVolume(boxes)).toBeCloseTo(400 * 280 - 100 * 130)
    const sill = boxes.find((b) => b.sizeY === 90 && b.y === 45)
    expect(sill).toBeDefined()
  })

  it('should handle multiple openings sorted by position', () => {
    const boxes = wallBoxes(wall, [door, window_], 280)
    expect(totalVolume(boxes)).toBeCloseTo(400 * 280 - 90 * 205 - 100 * 130)
  })

  it('should ignore openings belonging to other walls', () => {
    const other = { ...door, wallId: 'w2' }
    expect(wallBoxes(wall, [other], 280)).toHaveLength(1)
  })

  it('should clamp an opening taller than the wall', () => {
    const tall = { ...door, height: 500 }
    const boxes = wallBoxes(wall, [tall], 280)
    expect(boxes).toHaveLength(2) // no lintel
    expect(totalVolume(boxes)).toBeCloseTo(400 * 280 - 90 * 280)
  })
})
