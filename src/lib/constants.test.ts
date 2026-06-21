import { describe, it, expect } from 'vitest'
import { UNCATEGORIZED_AREA_TITLE, UNCATEGORIZED_AREA_ID } from './constants'

describe('Area constants', () => {
  it('UNCATEGORIZED_AREA_TITLE is 未分类', () => {
    expect(UNCATEGORIZED_AREA_TITLE).toBe('未分类')
  })

  it('UNCATEGORIZED_AREA_ID is the system UUID', () => {
    expect(UNCATEGORIZED_AREA_ID).toBe('00000000-0000-0000-0000-000000000000')
  })
})
