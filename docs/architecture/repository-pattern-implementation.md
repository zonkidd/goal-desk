# Repository 模式实施进度

## 已完成：阶段 1 - 创建接口和实现 ✅

### 文件结构

```
src/repository/
├── interfaces.ts                    # Repository 接口定义 ✅
├── InMemoryTaskRepository.ts        # 内存实现（测试用）✅
├── InMemoryTaskRepository.test.ts   # 单元测试 ✅ (21 tests passed)
├── TauriTaskRepository.ts           # Tauri 实现 ✅
├── InMemoryGoalRepository.ts        # Goals 内存实现 ✅
├── TauriGoalRepository.ts           # Goals Tauri 实现 ✅
├── InMemoryAreaRepository.ts        # Areas 内存实现 ✅
├── TauriAreaRepository.ts           # Areas Tauri 实现 ✅
├── RepositoryFactory.ts             # 工厂类 ✅
└── index.ts                         # 统一导出 ✅
```

### 设计特点

1. **统一接口**：TaskRepository, GoalRepository, AreaRepository
2. **双重实现**：
   - InMemory：用于测试和浏览器预览
   - Tauri：用于桌面应用（SQLite 持久化）
3. **类型安全**：所有方法返回 Promise，使用领域类型
4. **测试覆盖**：InMemoryTaskRepository 100% 测试覆盖

### 测试结果

```
✅ Test Files  1 passed (1)
✅ Tests  21 passed (21)
✅ TypeScript 类型检查通过（repository 目录）
```

## 待实施：阶段 2 - 迁移 appStore 使用 Repository

### 迁移计划

#### 步骤 1：在 appStore 中初始化 Repository

```typescript
// src/store/appStore.ts
import { RepositoryFactory } from '@/repository'

// 在 store 创建时初始化
const taskRepo = RepositoryFactory.createTaskRepository()
const goalRepo = RepositoryFactory.createGoalRepository()
const areaRepo = RepositoryFactory.createAreaRepository()
```

#### 步骤 2：识别需要迁移的方法

运行以下命令识别所有使用 `mutationsAdapter` 的地方：

```bash
grep -n "mutationsAdapter\." src/store/appStore.ts
```

需要迁移的方法：
- `addTask` → `taskRepo.createTask`
- `createGoal` → `goalRepo.create`
- `updateGoalFields` → `goalRepo.updateFields`
- `updateGoalStatus` → `goalRepo.updateStatus`
- `createTaskForGoal` → `taskRepo.createTaskForGoal`
- `addTaskNote` → `taskRepo.addNote`
- `updateTaskStatus` → `taskRepo.updateStatus`
- `updateTaskContent` → `taskRepo.updateContent`
- `updateTaskFields` → `taskRepo.updateFields`
- `createArea` → `areaRepo.create`
- `renameArea` → `areaRepo.rename`
- `deleteArea` → `areaRepo.delete`

#### 步骤 3：逐个替换示例

**Before (使用 mutationsAdapter)**:

```typescript
addTask: async (title) => {
  set({ isLoading: true })
  const result = await mutationsAdapter.createTask(title)
  
  if (result.task) {
    set((state) => ({
      tasks: [result.task!, ...state.tasks],
      statusMessage: result.statusMessage || '',
      isLoading: false,
    }))
  }
}
```

**After (使用 repository)**:

```typescript
addTask: async (title) => {
  set({ isLoading: true })
  try {
    const task = await taskRepo.createTask(title)
    
    set((state) => ({
      tasks: [task, ...state.tasks],
      statusMessage: 'Saved to local database',
      isLoading: false,
    }))
  } catch (error) {
    set({
      statusMessage: `Failed to create task: ${error}`,
      isLoading: false,
    })
  }
}
```

### 关键差异

1. **返回值**：
   - 旧：`{ task?, statusMessage? }`
   - 新：直接返回 `task` 或抛出错误

2. **错误处理**：
   - 旧：返回空对象或 statusMessage
   - 新：抛出标准化错误，需要 try-catch

3. **状态消息**：
   - 旧：由 mutations 层提供
   - 新：由 appStore 自己决定

### 迁移注意事项

1. **渐进式迁移**：一个方法一个方法地迁移，每次迁移后运行测试
2. **保留 mutations**：迁移期间保留 `workspaceMutations.ts`，确保其他代码仍能工作
3. **错误处理**：统一添加 try-catch，提供友好的错误消息
4. **测试验证**：每次迁移后在浏览器和 Tauri 环境中测试

## 待实施：阶段 3 - 弃用 workspaceMutations

一旦所有 appStore 方法都迁移到 repository：

1. 确认没有其他文件引用 `workspaceMutations`
2. 将 `workspaceMutations.ts` 标记为 `@deprecated`
3. 或者直接删除（如果确认安全）

## 使用示例

### 在单元测试中使用 InMemory Repository

```typescript
import { RepositoryFactory } from '@/repository'

describe('Task Management', () => {
  let taskRepo: TaskRepository
  
  beforeEach(() => {
    taskRepo = RepositoryFactory.createInMemoryTaskRepository()
  })
  
  it('should create and retrieve task', async () => {
    const task = await taskRepo.createTask('Buy milk')
    const found = await taskRepo.findById(task.id)
    
    expect(found?.title).toBe('Buy milk')
  })
})
```

### 在 appStore 中使用

```typescript
import { RepositoryFactory } from '@/repository'

const taskRepo = RepositoryFactory.createTaskRepository()

const useAppStore = create<AppStoreState>((set, get) => ({
  // ... state
  
  addTask: async (title) => {
    try {
      const task = await taskRepo.createTask(title)
      set(state => ({
        tasks: [task, ...state.tasks],
        statusMessage: 'Task created successfully',
      }))
    } catch (error) {
      set({ statusMessage: `Failed: ${error}` })
    }
  },
}))
```

## 优势总结

### 测试性
- InMemoryRepository 让单元测试快速运行
- 无需 mock Tauri invoke
- 测试数据隔离，每次测试都是干净状态

### 可扩展性
- 未来可添加 CloudRepository 支持同步
- 可添加 CachedRepository 装饰器
- 可添加事件通知机制

### 隔离性
- 调用方无需知道数据来源
- Tauri/Browser 实现完全隔离
- 类型转换集中在 Repository 层

### 一致性
- 统一的接口
- 统一的错误处理
- 统一的验证逻辑

## 下一步

准备好开始阶段 2 时，请告知，我会：
1. 读取 `appStore.ts` 的完整实现
2. 识别所有需要迁移的方法
3. 逐个方法进行迁移
4. 运行测试验证
5. 在浏览器和 Tauri 环境中手动测试
