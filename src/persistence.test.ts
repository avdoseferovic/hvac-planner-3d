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
