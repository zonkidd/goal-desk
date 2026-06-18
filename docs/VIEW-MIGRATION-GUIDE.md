# 视图迁移指南 - Inbox 和 Today

本文档提供 Inbox 和 Today 视图从旧架构迁移到新响应式 Command 架构的完整指南。

---

## 🎯 迁移目标

将视图从依赖旧的 `appStore` 单体架构迁移到新的响应式架构：
- ✅ 使用 Commands 处理操作
- ✅ 使用 Signals 订阅派生数据
- ✅ 零手动 recompute
- ✅ 零循环依赖

---

## 📋 Inbox 视图迁移

### 当前实现（旧架构）

```typescript
// src/components/views/InboxView.tsx (旧版)
import { useAppStore } from '@/store/appStore'

function InboxView() {
  // 旧方式：从单体 store 读取
  const inbox = useAppStore(s => s.inbox)
  const addTask = useAppStore(s => s.addTask)
  const updateTaskStatus = useAppStore(s => s.updateTaskStatus)
  
  const handleCreate = async () => {
    await addTask('新任务')
    // 手动触发重算（在 addTask 内部）
  }
  
  return (
    <div>
      {inbox.activeTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
```

### 新实现（响应式架构）

```typescript
// src/components/views/InboxView.new.tsx (新版)
import { useSignal } from '@/reactive'
import { useTaskCommands } from '@/hooks/useCommands'
import { inbox$ } from '@/app/signals'

function InboxView() {
  // 新方式：订阅响应式 Signal
  const inbox = useSignal(inbox$)
  const taskCommands = useTaskCommands()
  
  const handleCreate = async () => {
    await taskCommands.createTask({ title: '新任务' })
    // 自动重算，无需手动触发
  }
  
  return (
    <div>
      {inbox.activeTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
```

### 迁移步骤

**1. 创建全局 Signals 实例**

```typescript
// src/app/signals.ts (新建)
import { signal } from '@preact/signals-react'
import { DerivationEngine } from '@/reactive'
import { createReactivDerivations } from '@/reactive/derivations'
import { EventBus } from '@/events/EventBus'
import { createTaskStore } from '@/store/taskStore.refactored'
import { createGoalStore } from '@/store/goalStore.refactored'

// 创建全局实例
export const eventBus = new EventBus()
export const engine = new DerivationEngine()

// 创建 Stores
export const useTaskStore = createTaskStore(eventBus)
export const useGoalStore = createGoalStore(eventBus)

// 创建 Signals（连接 Store 和 Reactive Engine）
export const tasksSignal = signal<Task[]>([])
export const goalsSignal = signal<GoalCard[]>([])
export const areaSignal = signal<AreaFilter>('ALL')
export const showCompletedSignal = signal<boolean>(false)

// 同步 Store 到 Signal
useTaskStore.subscribe(state => {
  tasksSignal.value = state.tasks
})

useGoalStore.subscribe(state => {
  goalsSignal.value = state.baseGoals
})

// 注册派生状态
const derivations = createReactivDerivations(
  engine,
  tasksSignal,
  goalsSignal,
  areaSignal,
  showCompletedSignal
)

export const { todayFocusTasks$, inbox$, todayAttentionGroups$ } = derivations
```

**2. 创建 Commands Hooks**

```typescript
// src/hooks/useCommands.ts (新建)
import { useMemo } from 'react'
import { TaskCommands } from '@/commands/TaskCommands'
import { GoalCommands } from '@/commands/GoalCommands'
import { eventBus } from '@/app/signals'
import { createWorkspaceMutationAdapter } from '@/lib/workspaceMutations'

export function useTaskCommands() {
  return useMemo(() => {
    const adapter = createWorkspaceMutationAdapter()
    return new TaskCommands(adapter, eventBus)
  }, [])
}

export function useGoalCommands() {
  return useMemo(() => {
    const adapter = createWorkspaceMutationAdapter()
    return new GoalCommands(adapter, eventBus)
  }, [])
}
```

**3. 更新 InboxView 组件**

```typescript
// src/components/views/InboxView.tsx (更新)
import { useSignal } from '@/reactive'
import { useTaskCommands } from '@/hooks/useCommands'
import { inbox$, showCompletedSignal } from '@/app/signals'

export function InboxView() {
  const inbox = useSignal(inbox$)
  const taskCommands = useTaskCommands()
  
  const toggleShowCompleted = () => {
    showCompletedSignal.value = !showCompletedSignal.value
  }
  
  return (
    <div className="inbox-view">
      <section>
        <h2>活动任务</h2>
        {inbox.activeTasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task}
            onStatusChange={(status) => 
              taskCommands.updateTaskStatus(task.id, status)
            }
          />
        ))}
      </section>
      
      <section>
        <h2>已完成</h2>
        <button onClick={toggleShowCompleted}>
          {showCompletedSignal.value ? '隐藏' : '显示'}已完成
        </button>
        {inbox.completed.visibleTasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </section>
    </div>
  )
}
```

**4. 测试迁移后的组件**

```bash
# 启动应用
npm run tauri:dev

# 验证 Inbox 视图
# 1. 创建任务 - 应该自动出现在列表中
# 2. 更新状态 - 应该自动移动到对应分组
# 3. 切换显示已完成 - 应该立即响应
```

---

## 📋 Today 视图迁移

### 当前实现（旧架构）

```typescript
// src/components/views/TodayView.tsx (旧版)
import { useAppStore } from '@/store/appStore'

function TodayView() {
  const todayFocusTasks = useAppStore(s => s.todayFocusTasks)
  const todayAttentionGroups = useAppStore(s => s.todayAttentionGroups)
  const updateTaskStatus = useAppStore(s => s.updateTaskStatus)
  
  return (
    <div>
      <section>
        <h2>进行中</h2>
        {todayFocusTasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </section>
      
      <section>
        <h2>需要关注</h2>
        {todayAttentionGroups.overdue.map(task => (
          <TaskCard key={task.id} task={task} priority="high" />
        ))}
      </section>
    </div>
  )
}
```

### 新实现（响应式架构）

```typescript
// src/components/views/TodayView.new.tsx (新版)
import { useSignal } from '@/reactive'
import { useTaskCommands } from '@/hooks/useCommands'
import { todayFocusTasks$, todayAttentionGroups$ } from '@/app/signals'

function TodayView() {
  const todayTasks = useSignal(todayFocusTasks$)
  const attentionGroups = useSignal(todayAttentionGroups$)
  const taskCommands = useTaskCommands()
  
  return (
    <div>
      <section>
        <h2>进行中 ({todayTasks.length})</h2>
        {todayTasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task}
            onStatusChange={(status) =>
              taskCommands.updateTaskStatus(task.id, status)
            }
          />
        ))}
      </section>
      
      <section>
        <h2>需要关注</h2>
        
        {attentionGroups.overdue.length > 0 && (
          <div className="attention-group">
            <h3>已逾期 ({attentionGroups.overdue.length})</h3>
            {attentionGroups.overdue.map(task => (
              <TaskCard key={task.id} task={task} priority="high" />
            ))}
          </div>
        )}
        
        {attentionGroups.dueToday.length > 0 && (
          <div className="attention-group">
            <h3>今日到期 ({attentionGroups.dueToday.length})</h3>
            {attentionGroups.dueToday.map(task => (
              <TaskCard key={task.id} task={task} priority="medium" />
            ))}
          </div>
        )}
        
        {attentionGroups.ongoing.length > 0 && (
          <div className="attention-group">
            <h3>进行中 ({attentionGroups.ongoing.length})</h3>
            {attentionGroups.ongoing.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

### 迁移步骤

**1. 使用已创建的全局 Signals**

```typescript
// 复用 src/app/signals.ts 中的
// todayFocusTasks$, todayAttentionGroups$
```

**2. 更新 TodayView 组件**

```typescript
// src/components/views/TodayView.tsx (更新)
import { useSignal } from '@/reactive'
import { useTaskCommands } from '@/hooks/useCommands'
import { 
  todayFocusTasks$, 
  todayAttentionGroups$,
  areaSignal 
} from '@/app/signals'

export function TodayView() {
  const todayTasks = useSignal(todayFocusTasks$)
  const attentionGroups = useSignal(todayAttentionGroups$)
  const taskCommands = useTaskCommands()
  
  // 领域筛选也是响应式的
  const currentArea = useSignal(areaSignal)
  
  const setArea = (area: AreaFilter) => {
    areaSignal.value = area
    // 所有派生状态自动重算
  }
  
  return (
    <div className="today-view">
      {/* 领域筛选 */}
      <div className="area-filter">
        <button onClick={() => setArea('ALL')}>全部</button>
        <button onClick={() => setArea('Work')}>工作</button>
        <button onClick={() => setArea('Personal')}>个人</button>
      </div>
      
      {/* 进行中任务 */}
      <section>
        <h2>进行中 ({todayTasks.length})</h2>
        {todayTasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </section>
      
      {/* 需要关注的任务 */}
      <section>
        <h2>需要关注</h2>
        {/* 已逾期、今日到期、进行中 */}
      </section>
    </div>
  )
}
```

**3. 测试迁移后的组件**

```bash
# 验证 Today 视图
# 1. 切换领域筛选 - 应该立即更新任务列表
# 2. 更新任务状态 - 应该自动从 todayFocusTasks 移除
# 3. 创建进行中任务 - 应该自动出现在列表中
```

---

## ✅ 迁移检查清单

### Inbox 视图
- [ ] 创建全局 Signals 实例（`src/app/signals.ts`）
- [ ] 创建 Commands Hooks（`src/hooks/useCommands.ts`）
- [ ] 更新 InboxView 使用 `useSignal(inbox$)`
- [ ] 更新操作使用 `taskCommands.xxx()`
- [ ] 测试创建任务功能
- [ ] 测试状态更新功能
- [ ] 测试显示/隐藏已完成功能
- [ ] 验证无手动 recompute 调用

### Today 视图
- [ ] 更新 TodayView 使用 `useSignal(todayFocusTasks$)`
- [ ] 更新 TodayView 使用 `useSignal(todayAttentionGroups$)`
- [ ] 更新操作使用 `taskCommands.xxx()`
- [ ] 添加领域筛选功能
- [ ] 测试进行中任务显示
- [ ] 测试关注分组显示
- [ ] 测试领域筛选响应
- [ ] 验证无手动 recompute 调用

### 清理工作
- [ ] 确认所有视图已迁移
- [ ] 删除 `src/hooks/useStoreComposition.ts`
- [ ] 删除 `src/lib/DerivedStateManager.ts`
- [ ] 保留 `src/store/appStore.old.ts` 作为备份
- [ ] 更新所有 import 引用
- [ ] 运行测试验证无破坏
- [ ] 更新 README 文档

---

## 🎯 迁移收益

### 性能
- ✅ 按需重算（只在依赖变化时）
- ✅ 自动缓存
- ✅ 跳过 Virtual DOM diff（Signals 编译优化）

### 代码质量
- ✅ 零循环依赖
- ✅ 零手动同步
- ✅ 类型安全
- ✅ 易于测试

### 开发体验
- ✅ 简洁的 API
- ✅ 自动响应式
- ✅ 清晰的数据流
- ✅ 易于调试

---

## 📚 参考文档

- [新架构使用指南](./new-architecture-guide.md)
- [TDD 实施报告](./tdd-refactor-report.md)
- [完成总结](./REFACTOR-COMPLETE.md)
