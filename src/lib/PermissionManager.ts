/**
 * Permission Manager
 *
 * 深层模块：封装 EventKit 权限管理的全部复杂度
 *
 * 接口：统一的权限请求、状态查询、变更监听
 * 实现：Tauri invoke、状态缓存、回调管理
 *
 * 调用方无需理解：
 * - Tauri invoke 细节
 * - integrationStatus vs eventkitPermissions 重复
 * - 权限状态在哪里存储
 */

export type AuthorizationStatus = 'granted' | 'denied' | 'not_determined' | 'restricted' | 'error'
export type PermissionType = 'calendar' | 'reminders'

export interface PermissionState {
  calendar: AuthorizationStatus
  reminders: AuthorizationStatus
}

type PermissionChangeCallback = (state: PermissionState) => void

/**
 * 权限管理服务
 *
 * 单一真相源：所有权限状态集中管理
 * 支持请求去重和竞态保护
 */
export class PermissionManager {
  private state: PermissionState = {
    calendar: 'not_determined',
    reminders: 'not_determined',
  }

  private callbacks: Set<PermissionChangeCallback> = new Set()
  private apiRequest: (type: PermissionType) => Promise<AuthorizationStatus>
  
  // 请求去重和竞态保护
  private pendingRequests: Map<PermissionType, Promise<AuthorizationStatus>> = new Map()

  constructor(apiRequest: (type: PermissionType) => Promise<AuthorizationStatus>) {
    this.apiRequest = apiRequest
  }

  /**
   * 请求权限
   * 
   * 支持去重：相同类型的并发请求会共享同一个 Promise
   * 支持竞态保护：如果已有请求进行中，新请求会等待并返回相同结果
   */
  async request(type: PermissionType): Promise<AuthorizationStatus> {
    // 如果已有相同类型的请求进行中，返回现有 Promise
    const existingRequest = this.pendingRequests.get(type)
    if (existingRequest) {
      return existingRequest
    }

    // 创建新请求
    const requestPromise = this.executeRequest(type)
    this.pendingRequests.set(type, requestPromise)

    try {
      return await requestPromise
    } finally {
      // 请求完成后移除
      this.pendingRequests.delete(type)
    }
  }

  /**
   * 执行实际的权限请求
   */
  private async executeRequest(type: PermissionType): Promise<AuthorizationStatus> {
    try {
      const status = await this.apiRequest(type)
      this.updateStatus(type, status)
      return status
    } catch (error) {
      // 请求失败时设置错误状态
      this.updateStatus(type, 'error')
      throw error
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(type: PermissionType): AuthorizationStatus {
    return this.state[type]
  }

  /**
   * 获取完整状态
   */
  getState(): PermissionState {
    return { ...this.state }
  }

  /**
   * 更新状态（从外部数据源同步）
   */
  updateState(newState: PermissionState): void {
    const changed =
      this.state.calendar !== newState.calendar ||
      this.state.reminders !== newState.reminders

    if (changed) {
      this.state = { ...newState }
      this.notifyListeners()
    }
  }

  /**
   * 监听状态变更
   */
  onChange(callback: PermissionChangeCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  // 内部实现
  private updateStatus(type: PermissionType, status: AuthorizationStatus): void {
    if (this.state[type] !== status) {
      this.state[type] = status
      this.notifyListeners()
    }
  }

  private notifyListeners(): void {
    const state = this.getState()
    this.callbacks.forEach((callback) => callback(state))
  }
}
