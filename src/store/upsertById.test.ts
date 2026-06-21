import { describe, it, expect } from 'vitest'
import { upsertById } from './upsertById'

describe('upsertById', () => {
  it('replaces existing item by id', () => {
    const items = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ]
    const result = upsertById(items, { id: '2', name: 'updated' })
    expect(result).toEqual([
      { id: '1', name: 'a' },
      { id: '2', name: 'updated' },
    ])
  })

  it('inserts at head when id not found', () => {
    const items = [
      { id: '1', name: 'a' },
    ]
    const result = upsertById(items, { id: '2', name: 'new' })
    expect(result).toEqual([
      { id: '2', name: 'new' },
      { id: '1', name: 'a' },
    ])
  })

  it('handles empty array', () => {
    const result = upsertById([], { id: '1', name: 'only' })
    expect(result).toEqual([{ id: '1', name: 'only' }])
  })
})
