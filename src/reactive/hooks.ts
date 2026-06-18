import { useSignal as usePreactSignal, type Signal } from '@preact/signals-react'

/**
 * React hook to subscribe to a Signal
 *
 * 当 signal 值变化时，组件自动重渲染
 */
export function useSignal<T>(signal: Signal<T>): T {
  return usePreactSignal(signal).value
}
