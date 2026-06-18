import { describe, it, expect } from 'vitest'
import type { AppStoreState } from './appStore'
import { createMockAppStoreState } from './appStore.test-utils'
import {
  selectFilteredTimeline,
  selectDerivedGoals,
  selectFilteredGoals,
} from './appStore.selectors'
import type { TimelineItem, GoalCard } from '../types/app'
import type { Task } from '../types/task'

describe('appStore selectors', () => {
  describe('selectFilteredTimeline', () => {
    it('应该过滤掉已完成项当 showCompletedTodos=false', () => {
      const mockTimeline: TimelineItem[] = [
        {
          id: 'event-1',
          title: 'Meeting',
          timeLabel: '10:00',
          startsAt: new Date('2026-06-16T10:00:00'),
          source: 'calendar',
          readonly: true,
          done: false,
        },
        {
          id: 'reminder-1',
          title: 'Buy milk',
          timeLabel: '全天',
          source: 'reminder',
          readonly: true,
          done: true,
        },
      ]

      const state = createMockAppStoreState({
        baseTimeline: mockTimeline,
        showCompletedTodos: false,
      })

      const result = selectFilteredTimeline(state)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('event-1')
      expect(result[0].done).toBe(false)
    })

    it('应该显示全部项当 showCompletedTodos=true', () => {
      const mockTimeline: TimelineItem[] = [
        {
          id: 'event-1',
          title: 'Meeting',
          timeLabel: '10:00',
          startsAt: new Date('2026-06-16T10:00:00'),
          source: 'calendar',
          readonly: true,
          done: false,
        },
        {
          id: 'reminder-1',
          title: 'Buy milk',
          timeLabel: '全天',
          source: 'reminder',
          readonly: true,
          done: true,
        },
        {
          id: 'task-1',
          title: 'Write report',
          timeLabel: '全天',
          source: 'todo',
          readonly: false,
          done: true,
        },
      ]

      const state = createMockAppStoreState({
        baseTimeline: mockTimeline,
        showCompletedTodos: true,
      })

      const result = selectFilteredTimeline(state)
      expect(result).toHaveLength(3)
    })

    it('应该过滤掉已完成项当 showCompletedTodos=false', () => {
      const mockTimeline: TimelineItem[] = [
        {
          id: 'event-1',
          title: 'Meeting',
          timeLabel: '10:00',
          startsAt: new Date('2026-06-16T10:00:00'),
          source: 'calendar',
          readonly: true,
          done: false,
        },
        {
          id: 'reminder-1',
          title: 'Buy milk',
          timeLabel: '全天',
          source: 'reminder',
          readonly: true,
          done: true,
        },
        {
          id: 'task-1',
          title: 'Write report',
          timeLabel: '全天',
          source: 'todo',
          readonly: false,
          done: true,
        },
      ]

      const state = createMockAppStoreState({
        baseTimeline: mockTimeline,
        showCompletedTodos: false,
      })

      const result = selectFilteredTimeline(state)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('event-1')
      expect(result[0].done).toBe(false)
    })

    it('应该处理空 timeline', () => {
      const state = createMockAppStoreState({
        baseTimeline: [],
        showCompletedTodos: false,
      })

      const result = selectFilteredTimeline(state)
      expect(result).toEqual([])
    })
  })

  describe('selectDerivedGoals', () => {
    it('应该对 goals 应用派生逻辑', () => {
      const mockGoals: GoalCard[] = [
        {
          id: 'goal-1',
          title: 'Learn TypeScript',
          area: 'Tech',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: '',
          taskCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const mockTasks: Task[] = [
        {
          id: 'task-1',
          title: 'Read TS handbook',
          status: 'TODO',
          linkedGoalId: 'goal-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          activityLogs: [],
          showInTimeline: true,
          content: '',
        },
        {
          id: 'task-2',
          title: 'Build a TS project',
          status: 'DONE',
          linkedGoalId: 'goal-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          activityLogs: [],
          showInTimeline: true,
          content: '',
        },
      ]

      const state = createMockAppStoreState({
        baseGoals: mockGoals,
        tasks: mockTasks,
        baseTimeline: [],
        activeArea: 'ALL',
        showCompletedTodos: false,
      })

      const result = selectDerivedGoals(state)
      expect(result).toHaveLength(1)

      const goal = result[0]
      expect(goal.id).toBe('goal-1')
      // 应该包含派生字段
      expect(goal.taskCount).toBe(2)
      expect(goal.progress).toBe(50) // 1/2 完成 = 50%
      expect(goal.nextTodo).toBe('Read TS handbook') // nextTodo 是字符串
    })

    it('应该处理没有关联任务的 goal', () => {
      const mockGoals: GoalCard[] = [
        {
          id: 'goal-1',
          title: 'Learn TypeScript',
          area: 'Tech',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: '',
          taskCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const state = createMockAppStoreState({
        baseGoals: mockGoals,
        tasks: [],
        baseTimeline: [],
        activeArea: 'ALL',
        showCompletedTodos: false,
      })

      const result = selectDerivedGoals(state)
      expect(result).toHaveLength(1)

      const goal = result[0]
      expect(goal.taskCount).toBe(0)
      expect(goal.progress).toBe(0)
      expect(goal.nextTodo).toBe('Keep going') // 默认值
    })
  })

  describe('selectFilteredGoals', () => {
    it('应该返回所有 goals 当 activeArea=ALL', () => {
      const mockGoals: GoalCard[] = [
        {
          id: 'goal-1',
          title: 'Learn TypeScript',
          area: 'Tech',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: '',
          taskCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'goal-2',
          title: 'Exercise daily',
          area: 'Health',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: '',
          taskCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const state = createMockAppStoreState({
        baseGoals: mockGoals,
        tasks: [],
        activeArea: 'ALL',
        baseTimeline: [],
        showCompletedTodos: false,
      })

      const result = selectFilteredGoals(state)
      expect(result).toHaveLength(2)
    })

    it('应该按 area 过滤 goals', () => {
      const mockGoals: GoalCard[] = [
        {
          id: 'goal-1',
          title: 'Learn TypeScript',
          area: 'Tech',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: '',
          taskCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'goal-2',
          title: 'Exercise daily',
          area: 'Health',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: '',
          taskCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const state = createMockAppStoreState({
        baseGoals: mockGoals,
        tasks: [],
        activeArea: 'Tech',
        baseTimeline: [],
        showCompletedTodos: false,
      })

      const result = selectFilteredGoals(state)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('goal-1')
      expect(result[0].area).toBe('Tech')
    })

    it('应该处理空 goals', () => {
      const state = createMockAppStoreState({
        baseGoals: [],
        tasks: [],
        activeArea: 'ALL',
        baseTimeline: [],
        showCompletedTodos: false,
      })

      const result = selectFilteredGoals(state)
      expect(result).toEqual([])
    })
  })
})
