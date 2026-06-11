import type { GoalCard, TimelineItem } from '../types/app'
import type { Task } from '../types/task'

const now = new Date('2026-06-10T09:00:00+08:00')

export const mockTasks: Task[] = [
  {
    id: 'task-eventkit',
    title: '研究 Tauri 与 EventKit 的通信机制',
    status: 'IN_PROGRESS',
    isOngoing: true,
    linkedGoalId: 'goal-mvp',
    linkedGoalLabel: '目标管理软件 MVP 开发',
    systemReminderId: 'reminder-eventkit',
    content: [
      '# EventKit 接入路线',
      '',
      '这是一个需要在 Mac 上原生的功能。初步查阅了 Apple 的 `EventKit` 文档：',
      '',
      '- 需要向用户申请 `NSRemindersUsageDescription` 权限。',
      '- Tauri 官方没有现成插件，必须自己写 Rust FFI 或嵌入一段 Swift 代码。',
      '',
      '`let eventStore = EKEventStore()`',
      '',
      '**待验证清单：**',
      '',
      '- [x] 写一个最简单的 Swift 脚本拉取提醒',
      '- [ ] 尝试在 Rust 侧通过 `std::process::Command` 调用',
    ].join('\n'),
    dueDate: new Date('2026-06-11T15:00:00+08:00'),
    createdAt: new Date('2026-06-09T20:30:00+08:00'),
    updatedAt: new Date('2026-06-10T09:00:00+08:00'),
    activityLogs: [
      { action: 'CREATED', note: '从原型需求拆出第一条技术验证。', timestamp: new Date('2026-06-09T20:30:00+08:00') },
      { action: 'PAUSED', note: '卡在 Swift 编译阶段，先去找 Tauri 社区示例。', timestamp: new Date('2026-06-09T16:30:00+08:00') },
      { action: 'RESUMED', note: '找到一个 GitHub 参考实现，继续推进。', timestamp: new Date('2026-06-10T09:00:00+08:00') },
    ],
  },
  {
    id: 'task-mail',
    title: '给新员工发入职邮件并附加上周会议记录',
    status: 'TODO',
    dueDate: new Date('2026-06-10T18:00:00+08:00'),
    content: '把欢迎说明、账号列表和会议记录一起发出。',
    createdAt: new Date('2026-06-10T08:00:00+08:00'),
    updatedAt: new Date('2026-06-10T08:00:00+08:00'),
    activityLogs: [{ action: 'CREATED', timestamp: new Date('2026-06-10T08:00:00+08:00') }],
  },
  {
    id: 'task-bear',
    title: '集成 Bear App URL Scheme',
    status: 'PAUSED',
    bearNoteId: 'F37D308A-B4D1-4B65-9F2D-5C8BE1A12345',
    content: '等待 Bear 官方文档确认跨端参数细节。',
    createdAt: new Date('2026-06-09T10:00:00+08:00'),
    updatedAt: new Date('2026-06-10T11:00:00+08:00'),
    activityLogs: [
      { action: 'CREATED', timestamp: new Date('2026-06-09T10:00:00+08:00') },
      { action: 'PAUSED', note: '等待 Bear 官方 API 更新文档。', timestamp: new Date('2026-06-10T11:00:00+08:00') },
    ],
  },
  {
    id: 'task-run',
    title: '今晚跑步 3 公里',
    status: 'DONE',
    linkedGoalId: 'goal-fitness',
    linkedGoalLabel: '瘦十斤',
    systemReminderId: 'reminder-run',
    dueDate: new Date('2026-06-10T20:00:00+08:00'),
    content: '完成后记录配速和体感。',
    createdAt: new Date('2026-06-10T07:30:00+08:00'),
    updatedAt: new Date('2026-06-10T21:05:00+08:00'),
    activityLogs: [
      { action: 'CREATED', timestamp: new Date('2026-06-10T07:30:00+08:00') },
      { action: 'COMPLETED', note: '配速稳定，状态不错。', timestamp: new Date('2026-06-10T21:05:00+08:00') },
    ],
  },
]

export const mockGoals: GoalCard[] = [
  {
    id: 'goal-fitness',
    title: '瘦十斤',
    area: '健康与运动',
    description: '用持续训练和饮食记录推动减脂目标。',
    status: 'ACTIVE',
    progress: 30,
    nextTodo: '今晚跑步 3 公里',
    taskCount: 1,
    createdAt: new Date('2026-06-01T09:00:00+08:00'),
    updatedAt: new Date('2026-06-10T21:05:00+08:00'),
  },
  {
    id: 'goal-mvp',
    title: '目标管理软件 MVP 开发',
    area: '独立开发',
    description: '先把本地任务流、目标入口和今日焦点闭环。',
    status: 'ACTIVE',
    progress: 60,
    nextTodo: '完成全局速记 UI',
    taskCount: 1,
    createdAt: new Date('2026-06-03T09:00:00+08:00'),
    updatedAt: new Date('2026-06-10T09:00:00+08:00'),
  },
  {
    id: 'goal-learning',
    title: '系统学习 Rust 桌面开发',
    area: '个人成长',
    description: '沉淀 Tauri、SQLite 和 macOS 桥接经验。',
    status: 'ACTIVE',
    progress: 18,
    nextTodo: '整理 EventKit 桥接方案',
    taskCount: 0,
    createdAt: new Date('2026-06-02T09:00:00+08:00'),
    updatedAt: new Date('2026-06-02T09:00:00+08:00'),
  },
]

export const mockTimelineItems: TimelineItem[] = [
  { id: 'calendar-1', title: '早会同步', timeLabel: '09:00', source: 'calendar', readonly: true, done: true, sourceLabel: 'Work' },
  { id: 'todo-1', title: '开始开发 MVP 原型', timeLabel: '14:30', source: 'reminder', readonly: false, done: false, sourceLabel: 'Apple Reminders' },
  { id: 'calendar-2', title: 'Design Review · 腾讯会议', timeLabel: '16:00', source: 'calendar', readonly: true, done: false, sourceLabel: 'Work' },
  { id: 'todo-2', title: '阅读熊掌记的总结笔记', timeLabel: '20:00', source: 'todo', readonly: false, done: false },
]

export const mockStatusMessage = `Workspace seeded ${now.toLocaleDateString('zh-CN')}`
