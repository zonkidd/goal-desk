import { describe, it, expect, beforeEach } from 'vitest'
import { DerivationEngine } from './DerivationEngine'
import { signal } from '@preact/signals-react'

describe('DerivationEngine', () => {
  let engine: DerivationEngine

  beforeEach(() => {
    engine = new DerivationEngine()
  })

  it('should register and compute a derived value', () => {
    // Arrange
    const source = signal(5)

    // Act
    const doubled = engine.register('doubled', () => source.value * 2)

    // Assert
    expect(doubled.value).toBe(10)
  })

  it('should auto-recompute when dependency changes', () => {
    // Arrange
    const source = signal(5)
    const doubled = engine.register('doubled', () => source.value * 2)

    expect(doubled.value).toBe(10)

    // Act - change source
    source.value = 10

    // Assert - derived value updates automatically
    expect(doubled.value).toBe(20)
  })

  it('should track multiple dependencies', () => {
    // Arrange
    const a = signal(2)
    const b = signal(3)
    const sum = engine.register('sum', () => a.value + b.value)

    expect(sum.value).toBe(5)

    // Act - change first dependency
    a.value = 10
    expect(sum.value).toBe(13)

    // Act - change second dependency
    b.value = 5
    expect(sum.value).toBe(15)
  })

  it('should retrieve registered derivation by name', () => {
    // Arrange
    const source = signal(100)
    engine.register('hundred', () => source.value)

    // Act
    const value = engine.get('hundred')

    // Assert
    expect(value).toBe(100)
  })

  it('should throw when getting unregistered derivation', () => {
    // Act & Assert
    expect(() => engine.get('nonexistent')).toThrow('Derivation "nonexistent" not registered')
  })

  it('should check if derivation exists', () => {
    // Arrange
    engine.register('exists', () => 42)

    // Act & Assert
    expect(engine.has('exists')).toBe(true)
    expect(engine.has('nonexistent')).toBe(false)
  })
})
