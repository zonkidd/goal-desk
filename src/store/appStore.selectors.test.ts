import { describe, it, expect } from 'vitest'
import { createMockTimelineState, createMockGoalState } from './appStore.test-utils'
import { selectFilteredTimeline, selectFilteredGoals } from './appStore.selectors'
import type { RawAgendaItem, GoalCard } from '../types/app'

describe('appStore selectors', () => {
  describe('selectFilteredTimeline', () => {
    it('should filter done items when showCompletedTodos=false', () => {
      const mockTimeline: RawAgendaItem[] = [
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

      const state = createMockTimelineState({
        todayTimeline: mockTimeline,
        showCompletedTodos: false,
      })

      const result = selectFilteredTimeline(state)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('event-1')
      expect(result[0].done).toBe(false)
    })

    it('should show all items when showCompletedTodos=true', () => {
      const mockTimeline: RawAgendaItem[] = [
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

      const state = createMockTimelineState({
        todayTimeline: mockTimeline,
        showCompletedTodos: true,
      })

      const result = selectFilteredTimeline(state)
      expect(result).toHaveLength(3)
    })

    it('should handle empty timeline', () => {
      const state = createMockTimelineState({
        todayTimeline: [],
        showCompletedTodos: false,
      })

      const result = selectFilteredTimeline(state)
      expect(result).toEqual([])
    })
  })

  describe('selectFilteredGoals', () => {
    it('should return all goals when activeArea=ALL', () => {
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

      const state = createMockGoalState({
        baseGoals: mockGoals,
        activeArea: 'ALL',
      })

      const result = selectFilteredGoals(state)
      expect(result).toHaveLength(2)
    })

    it('should filter goals by area', () => {
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

      const state = createMockGoalState({
        baseGoals: mockGoals,
        activeArea: 'Tech',
      })

      const result = selectFilteredGoals(state)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('goal-1')
      expect(result[0].area).toBe('Tech')
    })

    it('should handle empty goals', () => {
      const state = createMockGoalState({
        baseGoals: [],
        activeArea: 'ALL',
      })

      const result = selectFilteredGoals(state)
      expect(result).toEqual([])
    })
  })
})
