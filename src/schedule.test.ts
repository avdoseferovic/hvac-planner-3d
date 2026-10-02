import { describe, expect, it } from 'vitest'
import { airflowBalance } from './airflow'
import {
  makeExtractValve,
  makeFacadePenetration,
  makeJumperDuct,
  makeReturnGrille,
  makeSupplyDiffuser,
} from './hvac-factories'
import { updateConnDiameter } from './hvac'
import { detectRooms } from './rooms'
import { penetrationSchedule, proximityWarnings, scheduleToCsv } from './schedule'
import { emptyModel, type Wall } from './types'

let n = 0
const wall = (ax: number, ay: number, bx: number, by: number, thickness = 25): Wall => ({
  id: `w${++n}`,
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  thickness,
  loadBearing: false,
})

/** 6 m × 4 m room */
function makeTestModel() {
  const model = emptyModel()
  model.walls = [
    wall(0, 0, 600, 0),
    wall(600, 0, 600, 400),
    wall(600, 400, 0, 400),
    wall(0, 400, 0, 0),
  ]
  return model
}

describe('penetrationSchedule', () => {
  it('should list every slab penetration with room and wall offsets', () => {
    const model = makeTestModel()
    const supply = makeSupplyDiffuser({ x: 100, y: 100 })
    updateConnDiameter(supply, 250)
    model.hvac.push(supply)
    model.hvac.push(makeReturnGrille({ x: 500, y: 300 }))
    model.hvac.push(makeJumperDuct({ x: 200, y: 200 }, { x: 260, y: 200 }))
    model.hvac.push(makeFacadePenetration(model.walls[0], 0.5))
    model.roomNames = {}

    const rooms = detectRooms(model.walls, {})
    const rows = penetrationSchedule(model, rooms)

    expect(rows).toHaveLength(5) // supply + return + 2 jumper holes + facade
    expect(rows.filter((r) => r.surface === 'slab')).toHaveLength(4)
    expect(rows[0].id).toBe('P01')

    const supplyRow = rows.find((r) => r.kind === 'supplyDiffuser')!
    expect(supplyRow.drillDiameter).toBe(270)
    expect(supplyRow.roomName).toBe('Prostorija 1')
    // 100 cm from the left wall centerline, 100 from the top
    expect(supplyRow.x).toBeCloseTo(100)
    expect(supplyRow.y).toBeCloseTo(100)
  })

  it('should order rows top→bottom, left→right', () => {
    const model = makeTestModel()
    model.hvac.push(makeSupplyDiffuser({ x: 500, y: 300 }))
    model.hvac.push(makeSupplyDiffuser({ x: 100, y: 100 }))
    const rows = penetrationSchedule(model, detectRooms(model.walls, {}))
    expect(rows[0].pos).toEqual({ x: 100, y: 100 })
  })
})

describe('proximityWarnings', () => {
  it('should warn when two penetrations are closer than 3× the larger drill Ø', () => {
    const model = makeTestModel()
    // drill 145 mm = 14.5 cm → min distance 43.5 cm
    model.hvac.push(makeSupplyDiffuser({ x: 100, y: 100 }))
    model.hvac.push(makeReturnGrille({ x: 140, y: 100 })) // 40 cm apart → warn
    model.hvac.push(makeExtractValve({ x: 300, y: 100 })) // far → ok
    const rows = penetrationSchedule(model, detectRooms(model.walls, {}))
    const warnings = proximityWarnings(rows)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].distance).toBe(40)
    expect(warnings[0].minAllowed).toBeCloseTo(43.5)
  })
})

describe('scheduleToCsv', () => {
  it('should produce a csv with header and one line per row', () => {
    const model = makeTestModel()
    model.hvac.push(makeSupplyDiffuser({ x: 100, y: 100 }))
    const rows = penetrationSchedule(model, detectRooms(model.walls, {}))
    const csv = scheduleToCsv(rows, ['ID', 'Room', 'Purpose', 'Surface', 'Conn', 'Drill', 'X', 'Y'])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('ID,Room,Purpose,Surface,Conn,Drill,X,Y')
    expect(lines[1]).toContain('P01')
    expect(lines[1]).toContain('145')
  })

  it('should quote fields containing commas', () => {
    const model = makeTestModel()
    model.hvac.push(makeSupplyDiffuser({ x: 100, y: 100 }))
    model.roomNames = {}
    const rooms = detectRooms(model.walls, { }) // default name
    const rows = penetrationSchedule(model, rooms)
    rows[0].roomName = 'Soba, velika'
    const csv = scheduleToCsv(rows, ['ID', 'Room', 'Purpose', 'Surface', 'Conn', 'Drill', 'X', 'Y'])
    expect(csv).toContain('"Soba, velika"')
  })
})

describe('airflowBalance', () => {
  it('should sum supply vs extract per room and flag >15% imbalance', () => {
    const model = makeTestModel()
    const rooms = detectRooms(model.walls, {})
    const s = makeSupplyDiffuser({ x: 100, y: 100 })
    s.airflow = 100
    const r = makeReturnGrille({ x: 500, y: 300 })
    r.airflow = 100
    model.hvac.push(s, r)
    let balance = airflowBalance(model, rooms)
    expect(balance[0].supply).toBe(100)
    expect(balance[0].extract).toBe(100)
    expect(balance[0].warning).toBe(false)

    r.airflow = 60 // 40% imbalance
    balance = airflowBalance(model, rooms)
    expect(balance[0].warning).toBe(true)
    expect(balance[0].imbalance).toBeCloseTo(0.4)
  })

  it('should not warn for empty rooms', () => {
    const model = makeTestModel()
    const balance = airflowBalance(model, detectRooms(model.walls, {}))
    expect(balance[0].warning).toBe(false)
  })
})
