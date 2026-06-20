import { describe, it, expect } from 'vitest'
import { validateRequiredString, validateTaskTitle, validateGoalInput, validateAreaTitle } from './validation'

describe('validateRequiredString', () => {
  it('returns trimmed value for valid input', () => {
    expect(validateRequiredString('  hello  ')).toBe('hello')
  })

  it('returns null for empty string', () => {
    expect(validateRequiredString('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(validateRequiredString('   ')).toBeNull()
  })

  it('returns null for null/undefined', () => {
    expect(validateRequiredString(null as any)).toBeNull()
    expect(validateRequiredString(undefined as any)).toBeNull()
  })
})

describe('validateTaskTitle', () => {
  it('returns trimmed title for valid input', () => {
    expect(validateTaskTitle('  Buy milk  ')).toBe('Buy milk')
  })

  it('returns null for empty title', () => {
    expect(validateTaskTitle('')).toBeNull()
  })
})

describe('validateGoalInput', () => {
  it('returns normalized input for valid data', () => {
    const result = validateGoalInput({ title: '  Goal  ', area: '  Work  ', description: '  Desc  ' })
    expect(result).toEqual({ title: 'Goal', area: 'Work', description: 'Desc' })
  })

  it('defaults area to 未分类 when empty', () => {
    const result = validateGoalInput({ title: 'Goal', area: '', description: '' })
    expect(result?.area).toBe('未分类')
  })

  it('returns null when title is empty', () => {
    expect(validateGoalInput({ title: '', area: 'Work', description: '' })).toBeNull()
  })
})

describe('validateAreaTitle', () => {
  it('returns trimmed title for valid input', () => {
    expect(validateAreaTitle('  Personal  ')).toBe('Personal')
  })

  it('returns null for empty title', () => {
    expect(validateAreaTitle('')).toBeNull()
  })
})
