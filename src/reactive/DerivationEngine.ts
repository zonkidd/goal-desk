import { computed, type Signal } from '@preact/signals-react'

type ComputeFunction<T> = () => T

/**
 * Derivation Engine - 响应式派生状态计算引擎
 *
 * 职责：
 * - 注册派生计算函数
 * - 自动追踪依赖
 * - 按需重算派生值
 * - 缓存计算结果
 */
export class DerivationEngine {
  private registry: Map<string, Signal<any>> = new Map()

  /**
   * 注册派生计算
   * @param name 唯一标识符
   * @param compute 计算函数
   * @returns 响应式 Signal
   */
  register<T>(name: string, compute: ComputeFunction<T>): Signal<T> {
    const derivedSignal = computed(compute)
    this.registry.set(name, derivedSignal)
    return derivedSignal
  }

  /**
   * 获取已注册的派生值
   */
  get<T>(name: string): T {
    const signal = this.registry.get(name)
    if (!signal) {
      throw new Error(`Derivation "${name}" not registered`)
    }
    return signal.value
  }

  /**
   * 检查是否已注册
   */
  has(name: string): boolean {
    return this.registry.has(name)
  }
}
