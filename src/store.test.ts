import { beforeEach, describe, expect, it } from 'vitest'
import { nextId, useStore } from './store'
import { emptyModel } from './types'
import { addClonedStory } from './stories'

const addWall = (x: number) =>
  useStore.getState().commit((m) => {
    m.walls.push({
      id: `w${x}`,
      a: { x: 0, y: 0 },
      b: { x, y: 0 },
      thickness: 25,
      loadBearing: false,
    })
  })

describe('store history', () => {
  beforeEach(() => {
    useStore.getState().replaceModel(emptyModel())
  })

  it('should undo and redo commits', () => {
    addWall(100)
    addWall(200)
    expect(useStore.getState().model.walls).toHaveLength(2)

    useStore.getState().undo()
    expect(useStore.getState().model.walls).toHaveLength(1)

    useStore.getState().undo()
    expect(useStore.getState().model.walls).toHaveLength(0)

    useStore.getState().redo()
    useStore.getState().redo()
    expect(useStore.getState().model.walls).toHaveLength(2)
    expect(useStore.getState().model.walls[1].b.x).toBe(200)
  })

  it('should clear the redo stack on a new commit', () => {
    addWall(100)
    useStore.getState().undo()
    addWall(300)
    useStore.getState().redo() // nothing to redo
    expect(useStore.getState().model.walls).toHaveLength(1)
    expect(useStore.getState().model.walls[0].b.x).toBe(300)
  })

  it('should treat checkpoint + updateModel bursts as one undo step', () => {
    addWall(100)
    useStore.getState().checkpoint()
    for (let i = 0; i < 5; i++) {
      useStore.getState().updateModel((m) => {
        m.walls[0].b.x += 10
      })
    }
    expect(useStore.getState().model.walls[0].b.x).toBe(150)
    useStore.getState().undo() // one undo reverts the whole drag
    expect(useStore.getState().model.walls[0].b.x).toBe(100)
  })

  it('should not mutate past snapshots via commit', () => {
    addWall(100)
    useStore.getState().commit((m) => {
      m.walls[0].thickness = 14
    })
    useStore.getState().undo()
    expect(useStore.getState().model.walls[0].thickness).toBe(25)
  })

  it('tracks story visibility independently and recovers the active story on undo', () => {
    const ground = useStore.getState().activeStoryId
    useStore.getState().commit((model) => {
      addClonedStory(model, ground, { id: 'upper', name: 'Upper floor' })
    })
    useStore.getState().setActiveStoryId('upper')
    useStore.getState().setStoryVisible('upper', true)
    expect(useStore.getState().visibleStoryIds).toContain('upper')

    useStore.getState().setStoryVisible('upper', false)
    expect(useStore.getState().visibleStoryIds).not.toContain('upper')

    useStore.getState().undo()
    expect(useStore.getState().activeStoryId).toBe(ground)
    expect(useStore.getState().model.stories).toHaveLength(1)
  })
})

describe('nextId', () => {
  it('should generate unique ids', () => {
    const a = nextId('w')
    const b = nextId('w')
    expect(a).not.toBe(b)
  })
})
