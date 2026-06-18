import type { EventBus } from '../events/EventBus'
import type { GoalCard, GoalStatus } from '../types/app'

interface GoalAdapter {
  createGoal(
    input: { title: string; area: string; description: string },
    options?: any
  ): Promise<{ goal: GoalCard | null; statusMessage: string; openGoalWorkspace: boolean }>

  updateGoalStatus(
    goal: GoalCard,
    status: GoalStatus
  ): Promise<{ goal: GoalCard | null; statusMessage: string }>

  updateGoalFields(
    goal: GoalCard,
    input: { title: string; description: string }
  ): Promise<{ goal: GoalCard | null; statusMessage: string }>
}

/**
 * Goal Commands - 目标相关业务操作
 *
 * 职责：
 * - 封装完整的目标业务流程
 * - 验证输入
 * - 调用 adapter 持久化
 * - 发射领域事件
 */
export class GoalCommands {
  constructor(
    private adapter: GoalAdapter,
    private eventBus: EventBus
  ) {}

  /**
   * 创建目标
   */
  async createGoal(input: {
    title: string
    area: string
    description: string
  }, options?: any): Promise<{ goal: GoalCard | null; openGoalWorkspace: boolean }> {
    // 验证
    const title = input.title.trim()
    if (!title) {
      throw new Error('Goal title cannot be empty')
    }

    // 确保 area 非空，默认使用"未分类"
    const normalizedInput = {
      ...input,
      title,
      area: input.area.trim() || '未分类',
    }

    // 持久化
    const { goal, statusMessage, openGoalWorkspace } = await this.adapter.createGoal(
      normalizedInput,
      options
    )

    if (!goal) {
      return { goal: null, openGoalWorkspace: false }
    }

    // 发射事件
    this.eventBus.emit({
      type: 'goal.created',
      payload: goal,
    })

    return { goal, openGoalWorkspace }
  }

  /**
   * 更新目标状态
   */
  async updateGoalStatus(goalId: string, status: GoalStatus): Promise<void> {
    // TODO: 需要先获取 goal 对象
    throw new Error('Not implemented yet')
  }

  /**
   * 更新目标字段
   */
  async updateGoalFields(
    goalId: string,
    input: { title: string; description: string }
  ): Promise<void> {
    // TODO: 需要先获取 goal 对象
    throw new Error('Not implemented yet')
  }
}
