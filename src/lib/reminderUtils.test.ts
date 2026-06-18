import { describe, it, expect } from 'vitest'
import { groupRemindersByList, isToday, isWithinDays, groupRemindersByTime } from './reminderUtils'
import type { ReminderItem } from '../types/app'

describe('reminderUtils', () => {
  describe('groupRemindersByList', () => {
    it('空数组返回空 Map', () => {
      const reminders: ReminderItem[] = []
      const result = groupRemindersByList(reminders)
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it('单个提醒按 listTitle 分组', () => {
      const reminders: ReminderItem[] = [
        {
          id: '1',
          title: '买牛奶',
          done: false,
          listTitle: '购物清单'
        }
      ]
      const result = groupRemindersByList(reminders)
      expect(result.size).toBe(1)
      expect(result.has('购物清单')).toBe(true)
      expect(result.get('购物清单')).toEqual([reminders[0]])
    })

    it('同一清单的多个提醒归入同一组', () => {
      const reminders: ReminderItem[] = [
        { id: '1', title: '写报告', done: false, listTitle: '工作' },
        { id: '2', title: '开会', done: false, listTitle: '工作' },
        { id: '3', title: '发邮件', done: true, listTitle: '工作' }
      ]
      const result = groupRemindersByList(reminders)
      expect(result.size).toBe(1)
      expect(result.has('工作')).toBe(true)
      expect(result.get('工作')).toHaveLength(3)
      expect(result.get('工作')).toEqual(reminders)
    })

    it('不同清单分别分组', () => {
      const reminders: ReminderItem[] = [
        { id: '1', title: '写报告', done: false, listTitle: '工作' },
        { id: '2', title: '开会', done: false, listTitle: '工作' },
        { id: '3', title: '买牛奶', done: false, listTitle: '购物清单' },
        { id: '4', title: '健身', done: false, listTitle: '个人' },
        { id: '5', title: '买面包', done: false, listTitle: '购物清单' }
      ]
      const result = groupRemindersByList(reminders)
      expect(result.size).toBe(3)
      expect(result.get('工作')).toEqual([reminders[0], reminders[1]])
      expect(result.get('购物清单')).toEqual([reminders[2], reminders[4]])
      expect(result.get('个人')).toEqual([reminders[3]])
    })

    it('无 listTitle 归入"未分类"', () => {
      const reminders: ReminderItem[] = [
        { id: '1', title: '写报告', done: false, listTitle: '工作' },
        { id: '2', title: '随便记点东西', done: false }
      ]
      const result = groupRemindersByList(reminders)
      expect(result.size).toBe(2)
      expect(result.has('工作')).toBe(true)
      expect(result.has('未分类')).toBe(true)
      expect(result.get('未分类')).toEqual([reminders[1]])
    })
  })

  describe('isToday', () => {
    it('判断今天返回 true', () => {
      const now = new Date()
      expect(isToday(now)).toBe(true)
    })

    it('判断昨天返回 false', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })
  })

  describe('isWithinDays', () => {
    it('判断未来7天内返回 true', () => {
      const threeDaysLater = new Date()
      threeDaysLater.setDate(threeDaysLater.getDate() + 3)
      expect(isWithinDays(threeDaysLater, 7)).toBe(true)
    })

    it('判断超出范围返回 false', () => {
      const tenDaysLater = new Date()
      tenDaysLater.setDate(tenDaysLater.getDate() + 10)
      expect(isWithinDays(tenDaysLater, 7)).toBe(false)
    })
  })

  describe('groupRemindersByTime', () => {
    it('空数组返回所有分组为空数组', () => {
      const result = groupRemindersByTime([])
      expect(result.overdue).toEqual([])
      expect(result.today).toEqual([])
      expect(result.next7days).toEqual([])
      expect(result.later).toEqual([])
      expect(result.nodate).toEqual([])
    })

    it('已过期的提醒归入 overdue', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const reminders: ReminderItem[] = [
        { id: '1', title: '过期任务', done: false, dueAt: yesterday }
      ]
      const result = groupRemindersByTime(reminders)
      expect(result.overdue).toEqual([reminders[0]])
      expect(result.today).toEqual([])
      expect(result.next7days).toEqual([])
      expect(result.later).toEqual([])
      expect(result.nodate).toEqual([])
    })

    it('今天的提醒归入 today', () => {
      const today = new Date()
      const reminders: ReminderItem[] = [
        { id: '1', title: '今天的任务', done: false, dueAt: today }
      ]
      const result = groupRemindersByTime(reminders)
      expect(result.overdue).toEqual([])
      expect(result.today).toEqual([reminders[0]])
      expect(result.next7days).toEqual([])
      expect(result.later).toEqual([])
      expect(result.nodate).toEqual([])
    })

    it('未来7天的提醒归入 next7days', () => {
      const threeDaysLater = new Date()
      threeDaysLater.setDate(threeDaysLater.getDate() + 3)
      const reminders: ReminderItem[] = [
        { id: '1', title: '3天后的任务', done: false, dueAt: threeDaysLater }
      ]
      const result = groupRemindersByTime(reminders)
      expect(result.overdue).toEqual([])
      expect(result.today).toEqual([])
      expect(result.next7days).toEqual([reminders[0]])
      expect(result.later).toEqual([])
      expect(result.nodate).toEqual([])
    })

    it('更晚的提醒归入 later', () => {
      const tenDaysLater = new Date()
      tenDaysLater.setDate(tenDaysLater.getDate() + 10)
      const reminders: ReminderItem[] = [
        { id: '1', title: '10天后的任务', done: false, dueAt: tenDaysLater }
      ]
      const result = groupRemindersByTime(reminders)
      expect(result.overdue).toEqual([])
      expect(result.today).toEqual([])
      expect(result.next7days).toEqual([])
      expect(result.later).toEqual([reminders[0]])
      expect(result.nodate).toEqual([])
    })

    it('无日期的提醒归入 nodate', () => {
      const reminders: ReminderItem[] = [
        { id: '1', title: '无日期任务', done: false }
      ]
      const result = groupRemindersByTime(reminders)
      expect(result.overdue).toEqual([])
      expect(result.today).toEqual([])
      expect(result.next7days).toEqual([])
      expect(result.later).toEqual([])
      expect(result.nodate).toEqual([reminders[0]])
    })

    it('混合多个提醒正确分类', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const today = new Date()
      const threeDaysLater = new Date()
      threeDaysLater.setDate(threeDaysLater.getDate() + 3)
      const tenDaysLater = new Date()
      tenDaysLater.setDate(tenDaysLater.getDate() + 10)

      const reminders: ReminderItem[] = [
        { id: '1', title: '过期', done: false, dueAt: yesterday },
        { id: '2', title: '今天1', done: false, dueAt: today },
        { id: '3', title: '今天2', done: false, dueAt: today },
        { id: '4', title: '3天后', done: false, dueAt: threeDaysLater },
        { id: '5', title: '10天后', done: false, dueAt: tenDaysLater },
        { id: '6', title: '无日期', done: false }
      ]
      const result = groupRemindersByTime(reminders)
      expect(result.overdue).toEqual([reminders[0]])
      expect(result.today).toEqual([reminders[1], reminders[2]])
      expect(result.next7days).toEqual([reminders[3]])
      expect(result.later).toEqual([reminders[4]])
      expect(result.nodate).toEqual([reminders[5]])
    })
  })
})
