import type { DomainEvent } from './DomainEvents'

type EventHandler = (event: DomainEvent) => void
type Unsubscribe = () => void

/**
 * Event Bus - 解耦 stores 的事件总线
 *
 * 职责：
 * - 发射领域事件
 * - 管理订阅者
 * - 同步分发事件
 */
export class EventBus {
  private handlers: Set<EventHandler> = new Set()

  /**
   * 发射事件到所有订阅者
   */
  emit(event: DomainEvent): void {
    this.handlers.forEach((handler) => {
      handler(event)
    })
  }

  /**
   * 订阅事件
   * @returns 取消订阅函数
   */
  subscribe(handler: EventHandler): Unsubscribe {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }
}
