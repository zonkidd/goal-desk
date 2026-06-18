import { describe, it, expect } from 'vitest';
import { formatDateKey, parseTimeLabel, groupTimelineByDate } from './calendarUtils';

describe('calendarUtils', () => {
  describe('formatDateKey', () => {
    it('should format Date to YYYY-MM-DD string', () => {
      const date = new Date('2026-06-16T10:30:00');
      expect(formatDateKey(date)).toBe('2026-06-16');
    });
  });

  describe('parseTimeLabel', () => {
    it('should parse time label with base date', () => {
      const baseDate = new Date('2026-06-16');
      const result = parseTimeLabel('09:00', baseDate);

      expect(result).not.toBeNull();
      expect(result?.getHours()).toBe(9);
      expect(result?.getMinutes()).toBe(0);
    });

    it('should return null for invalid time label', () => {
      const baseDate = new Date('2026-06-16');
      const result = parseTimeLabel('invalid', baseDate);

      expect(result).toBeNull();
    });
  });

  describe('groupTimelineByDate', () => {
    it('should return empty Map for empty array', () => {
      const result = groupTimelineByDate([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should group single event by date', () => {
      const today = new Date('2026-06-16');
      const timeline = [
        {
          id: '1',
          title: '团队站会',
          timeLabel: '09:00',
          startsAt: new Date('2026-06-16T09:00:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        }
      ];

      const result = groupTimelineByDate(timeline);

      expect(result.size).toBe(1);
      const todayKey = formatDateKey(today);
      expect(result.has(todayKey)).toBe(true);

      const todayEvents = result.get(todayKey);
      expect(todayEvents).toHaveLength(1);
      expect(todayEvents?.[0].title).toBe('团队站会');
    });

    it('should group multiple events on same day', () => {
      const timeline = [
        {
          id: '1',
          title: '团队站会',
          timeLabel: '09:00',
          startsAt: new Date('2026-06-16T09:00:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        },
        {
          id: '2',
          title: '项目评审',
          timeLabel: '14:00',
          startsAt: new Date('2026-06-16T14:00:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        },
        {
          id: '3',
          title: '客户会议',
          timeLabel: '16:30',
          startsAt: new Date('2026-06-16T16:30:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        }
      ];

      const result = groupTimelineByDate(timeline);

      expect(result.size).toBe(1);
      const todayKey = formatDateKey(new Date('2026-06-16'));
      const todayEvents = result.get(todayKey);

      expect(todayEvents).toHaveLength(3);
      expect(todayEvents?.[0].title).toBe('团队站会');
      expect(todayEvents?.[1].title).toBe('项目评审');
      expect(todayEvents?.[2].title).toBe('客户会议');
    });

    it('should group events on different days separately', () => {
      const today = new Date('2026-06-16');
      const tomorrow = new Date('2026-06-17');

      const timeline = [
        {
          id: '1',
          title: '今天会议',
          timeLabel: '09:00',
          startsAt: new Date('2026-06-16T09:00:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        },
        {
          id: '2',
          title: '今天另一个会议',
          timeLabel: '14:00',
          startsAt: new Date('2026-06-16T14:00:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        },
        {
          id: '3',
          title: '明天会议',
          timeLabel: '10:00',
          startsAt: new Date('2026-06-17T10:00:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        }
      ];

      const result = groupTimelineByDate(timeline);

      expect(result.size).toBe(2);

      const todayKey = formatDateKey(today);
      const tomorrowKey = formatDateKey(tomorrow);

      expect(result.has(todayKey)).toBe(true);
      expect(result.has(tomorrowKey)).toBe(true);

      const todayEvents = result.get(todayKey);
      expect(todayEvents).toHaveLength(2);
      expect(todayEvents?.[0].title).toBe('今天会议');
      expect(todayEvents?.[1].title).toBe('今天另一个会议');

      const tomorrowEvents = result.get(tomorrowKey);
      expect(tomorrowEvents).toHaveLength(1);
      expect(tomorrowEvents?.[0].title).toBe('明天会议');
    });

    it('should sort events by time within the same day', () => {
      const timeline = [
        {
          id: '1',
          title: '下午会议',
          timeLabel: '14:00',
          startsAt: new Date('2026-06-16T14:00:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        },
        {
          id: '2',
          title: '早上会议',
          timeLabel: '09:00',
          startsAt: new Date('2026-06-16T09:00:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        },
        {
          id: '3',
          title: '中午会议',
          timeLabel: '10:30',
          startsAt: new Date('2026-06-16T10:30:00'),
          source: 'calendar' as const,
          readonly: true,
          done: false
        }
      ];

      const result = groupTimelineByDate(timeline);

      const todayKey = formatDateKey(new Date('2026-06-16'));
      const todayEvents = result.get(todayKey);

      expect(todayEvents).toHaveLength(3);
      expect(todayEvents?.[0].timeLabel).toBe('09:00');
      expect(todayEvents?.[1].timeLabel).toBe('10:30');
      expect(todayEvents?.[2].timeLabel).toBe('14:00');
    });
  });
});
