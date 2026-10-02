import { describe, expect, it } from 'vitest'
import { deserializeProject, serializeProject } from './persistence'
import { emptyModel } from './types'

describe('project persistence', () => {
  it('should round-trip a model through JSON', () => {
    const model = emptyModel()
    model.walls.push({
      id: 'w1',
      a: { x: 0, y: 0 },
      b: { x: 400, y: 0 },
      thickness: 25,
      loadBearing: true,
    })
    model.roomNames['w1|w2'] = 'Soba 1'
    model.settings.gridSize = 10

    const restored = deserializeProject(serializeProject(model))
    expect(restored).toEqual(model)
  })

  it('should round-trip door hinge/swing settings', () => {
    const model = emptyModel()
    model.openings.push({
      id: 'o1',
      wallId: 'w1',
      type: 'door',
      t: 0.5,
      width: 90,
      height: 205,
      sill: 0,
      hinge: 'right',
      swing: 'out',
    })
    const restored = deserializeProject(serializeProject(model))
    expect(restored.openings[0].hinge).toBe('right')
    expect(restored.openings[0].swing).toBe('out')
  })

  it('should round-trip persistent duct endpoint bindings', () => {
    const model = emptyModel()
    model.hvac.push({
      kind: 'duct',
      id: 'duct-1',
      points: [
        { x: 10, y: 20 },
        { x: 100, y: 200 },
      ],
      diameter: 160,
      insulated: true,
      startConnection: { elementId: 'hrv-1', portId: 'left' },
      endConnection: { elementId: 'vent-1', portId: 'center' },
    })

    const restored = deserializeProject(serializeProject(model))
    const route = restored.hvac[0]
    expect(route.kind === 'duct' && route.startConnection).toEqual({
      elementId: 'hrv-1',
      portId: 'left',
    })
    expect(route.kind === 'duct' && route.endConnection).toEqual({
      elementId: 'vent-1',
      portId: 'center',
    })
  })

  it('should reject foreign or corrupt JSON', () => {
    expect(() => deserializeProject('{"foo": 1}')).toThrow('Invalid project file')
    expect(() => deserializeProject('not json')).toThrow()
  })

  it('should fill missing settings with defaults', () => {
    const file = JSON.parse(serializeProject(emptyModel())) as {
      model: { settings: Record<string, number> }
    }
    delete file.model.settings.atticHeight
    const restored = deserializeProject(JSON.stringify(file))
    expect(restored.settings.atticHeight).toBe(250)
  })
})
