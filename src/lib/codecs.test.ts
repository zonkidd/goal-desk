import { describe, it, expect } from 'vitest'
import { GoalCodec, type RustGoalCard } from './codecs'

describe('GoalCodec', () => {
  it('converts Rust GoalCard to TypeScript GoalCard', () => {
    const rust: RustGoalCard = {
      id: 'goal-1',
      title: 'Test Goal',
      area: 'Work',
      description: 'Description',
      status: 'ACTIVE',
      progress: 50,
      nextTodo: 'Next task',
      taskCount: 4,
    }

    const result = GoalCodec.fromRust(rust)

    expect(result.id).toBe('goal-1')
    expect(result.title).toBe('Test Goal')
    expect(result.area).toBe('Work')
    expect(result.description).toBe('Description')
    expect(result.status).toBe('ACTIVE')
    expect(result.progress).toBe(50)
    expect(result.nextTodo).toBe('Next task')
    expect(result.taskCount).toBe(4)
  })

  it('does not set fake createdAt/updatedAt timestamps', () => {
    const before = new Date()
    const rust: RustGoalCard = {
      id: 'goal-1',
      title: 'Test',
      area: 'Work',
      description: '',
      status: 'ACTIVE',
      progress: 0,
      nextTodo: '',
      taskCount: 0,
    }

    const result = GoalCodec.fromRust(rust)
    const after = new Date()

    // createdAt/updatedAt should NOT be set to current time
    // They should be undefined since Rust doesn't provide them
    expect(result.createdAt).toBeUndefined()
    expect(result.updatedAt).toBeUndefined()
  })

  it('handles batch conversion', () => {
    const rustArray: RustGoalCard[] = [
      { id: '1', title: 'A', area: 'Work', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0 },
      { id: '2', title: 'B', area: 'Personal', description: '', status: 'PAUSED', progress: 100, nextTodo: '', taskCount: 1 },
    ]

    const result = GoalCodec.fromRustArray(rustArray)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })
})
