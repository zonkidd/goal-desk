/**
 * EditingSession - 通用编辑会话管理
 *
 * 职责：
 * - 管理实体的草稿状态
 * - 追踪变更（dirty state）
 * - 提供统一的保存/放弃接口
 * - 消除重复的 setter 样板代码
 *
 * @template TEntity - 实体类型
 * @template TDraft - 草稿类型（可扩展实体类型）
 */
export class EditingSession<TEntity extends Record<string, any>, TDraft extends TEntity = TEntity> {
  private original: TEntity
  private draft: TDraft
  private saveFunction: (draft: TDraft) => Promise<void>

  constructor(entity: TEntity, saveFunction: (draft: TDraft) => Promise<void>) {
    this.original = entity
    this.draft = { ...entity } as TDraft
    this.saveFunction = saveFunction
  }

  /**
   * 更新单个字段
   */
  updateField<K extends keyof TDraft>(field: K, value: TDraft[K]): void {
    this.draft = {
      ...this.draft,
      [field]: value,
    }
  }

  /**
   * 批量更新多个字段
   */
  updateFields(updates: Partial<TDraft>): void {
    this.draft = {
      ...this.draft,
      ...updates,
    }
  }

  /**
   * 获取当前草稿
   */
  getDraft(): TDraft {
    return this.draft
  }

  /**
   * 检查是否有未保存的变更
   */
  isDirty(): boolean {
    return JSON.stringify(this.original) !== JSON.stringify(this.draft)
  }

  /**
   * 保存变更
   */
  async saveChanges(): Promise<void> {
    if (!this.isDirty()) {
      return // 无变更，跳过保存
    }

    await this.saveFunction(this.draft)

    // 更新 original 为当前草稿
    this.original = { ...this.draft }
  }

  /**
   * 放弃变更
   */
  discardChanges(): void {
    this.draft = { ...this.original } as TDraft
  }

  /**
   * 重置为新的实体
   */
  reset(entity: TEntity): void {
    this.original = entity
    this.draft = { ...entity } as TDraft
  }
}
