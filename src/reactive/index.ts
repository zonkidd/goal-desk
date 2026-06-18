/**
 * Reactive Engine - 响应式派生状态计算
 *
 * 基于 @preact/signals-react 提供自动依赖追踪和按需重算
 */

export { DerivationEngine } from './DerivationEngine'
export { useSignal } from './hooks'
export { signal, computed, effect, batch } from '@preact/signals-react'
export type { Signal, ReadonlySignal } from '@preact/signals-react'
