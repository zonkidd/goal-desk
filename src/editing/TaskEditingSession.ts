import { EditingSession } from './EditingSession'
import type { Task } from '../types/task'

/**
 * Task 编辑会话
 *
 * 使用通用 EditingSession，无需 14 个重复的 setter 方法
 */
export class TaskEditingSession extends EditingSession<Task, Task> {
  constructor(task: Task, saveFunction: (draft: Task) => Promise<void>) {
    super(task, saveFunction)
  }

  // 如果需要 Task 特定的业务逻辑，可以在这里添加
  // 例如：验证、格式化、自动填充等
}
