import type { EventBus } from '../events/EventBus'
import type { Task, TaskStatus } from '../types/task'

interface TaskAdapter {
  createTask(title: string): Promise<{ task: Task | null; statusMessage: string }>
  updateTaskStatus(task: Task, status: TaskStatus, note?: string): Promise<{ task: Task | null; statusMessage: string }>
}

/**
 * Task Commands - 任务相关业务操作
 *
 * 职责：
 * - 封装完整的任务业务流程
 * - 验证输入
 * - 调用 adapter 持久化
 * - 发射领域事件
 */
export class TaskCommands {
  constructor(
    private adapter: TaskAdapter,
    private eventBus: EventBus
  ) {}

  /**
   * 创建任务
   */
  async createTask(input: { title: string }): Promise<Task | null> {
    // 验证
    const title = input.title.trim()
    if (!title) {
      throw new Error('Task title cannot be empty')
    }

    // 持久化
    const { task, statusMessage } = await this.adapter.createTask(title)

    if (!task) {
      return null
    }

    // 发射事件
    this.eventBus.emit({
      type: 'task.created',
      payload: task,
    })

    return task
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<void> {
    // TODO: 需要先获取 task 对象
    // 这里暂时简化实现
    throw new Error('Not implemented yet')
  }
}
