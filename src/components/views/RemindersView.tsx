import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, Clock, ChevronDown } from 'lucide-react'
import { GlassCard } from '../common/GlassCard'
import { GlassPanel } from '../common/GlassPanel'
import { useUiStore } from '../../store/uiStore'
import { useEventkitStore } from '../../store/eventkitStore'
import { useToggleSystemReminder } from '../../store/appStore'
import { groupRemindersByList, groupRemindersByTime } from '../../lib/reminderUtils'
import { UNCATEGORIZED_AREA_TITLE } from '../../lib/constants'
import type { ReminderItem } from '../../types/app'

type ViewMode = 'byList' | 'byTime'

interface ReminderList {
  id: string
  title: string
  icon: string
  color: string
  reminders: ReminderItem[]
}

interface TimeGroup {
  id: string
  title: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  reminders: ReminderItem[]
}

export function RemindersView() {
  const [viewMode, setViewMode] = useState<ViewMode>('byList')
  const [hideCompleted, setHideCompleted] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['overdue', 'today']))

  const systemReminders = useEventkitStore((state) => state.systemReminders)
  const toggleSystemReminderDone = useToggleSystemReminder()
  const openDrawer = useUiStore((state) => state.openDrawer)

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  // 按清单分组（使用真实数据）
  const remindersByListMap = groupRemindersByList(systemReminders)
  const reminderLists: ReminderList[] = Array.from(remindersByListMap.entries()).map(([title, reminders]) => {
    // 为不同清单分配颜色和图标
    const listConfig: Record<string, { icon: string; color: string }> = {
      '工作': { icon: '💼', color: 'text-orange-600' },
      '个人': { icon: '🏠', color: 'text-blue-600' },
      '购物清单': { icon: '🛒', color: 'text-green-600' },
      '阅读清单': { icon: '📚', color: 'text-purple-600' },
      [UNCATEGORIZED_AREA_TITLE]: { icon: '📋', color: 'text-slate-600' },
    }
    const config = listConfig[title] || listConfig[UNCATEGORIZED_AREA_TITLE]

    return {
      id: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      icon: config.icon,
      color: config.color,
      reminders,
    }
  })

  // 按时间分组（使用真实数据）
  const remindersByTimeGrouped = groupRemindersByTime(systemReminders)
  const timeGroups: TimeGroup[] = [
    {
      id: 'overdue',
      title: '已过期',
      icon: '⚠️',
      color: 'text-red-600',
      bgColor: 'bg-red-50/30',
      borderColor: 'border-l-red-500',
      reminders: remindersByTimeGrouped.overdue,
    },
    {
      id: 'today',
      title: '今天',
      icon: '⚡️',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50/30',
      borderColor: 'border-l-orange-500',
      reminders: remindersByTimeGrouped.today,
    },
    {
      id: 'next7days',
      title: '未来7天',
      icon: '📆',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50/30',
      borderColor: 'border-l-indigo-500',
      reminders: remindersByTimeGrouped.next7days,
    },
    {
      id: 'later',
      title: '更晚',
      icon: '⏳',
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-l-slate-500',
      reminders: remindersByTimeGrouped.later,
    },
    {
      id: 'nodate',
      title: '无日期',
      icon: '🗂️',
      color: 'text-slate-500',
      bgColor: 'bg-slate-50',
      borderColor: 'border-l-slate-400',
      reminders: remindersByTimeGrouped.nodate,
    },
  ]

  const handleToggleReminder = async (reminderId: string, done: boolean) => {
    await toggleSystemReminderDone(reminderId, done)
  }

  return (
    <section id="reminders" className="screen active">
      <div className="mb-8 flex items-end justify-between animate-spring">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">提醒看板</h1>
          <p className="mt-2 font-medium text-slate-500">按清单或时间维度管理系统提醒事项。</p>
        </div>
      </div>

      {/* View Controls */}
      <div className="mb-6 flex items-center gap-4">
        <GlassPanel className="inline-flex rounded-2xl p-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('byList')}
            className={`flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-bold transition-all ${
              viewMode === 'byList'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            按清单
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('byTime')}
            className={`flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-bold transition-all ${
              viewMode === 'byTime'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            按时间
          </motion.button>
        </GlassPanel>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="rounded"
          />
          隐藏已完成
        </label>
      </div>

      {/* View Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'byList' ? (
          <motion.div
            key="byList"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <ByListView
              lists={reminderLists}
              hideCompleted={hideCompleted}
              onToggle={handleToggleReminder}
              onReminderClick={(id) => openDrawer('reminder', id)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="byTime"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <ByTimeView
              groups={timeGroups}
              hideCompleted={hideCompleted}
              expandedGroups={expandedGroups}
              onToggleGroup={toggleGroup}
              onToggle={handleToggleReminder}
              onReminderClick={(id) => openDrawer('reminder', id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// By List View Component
function ByListView({
  lists,
  hideCompleted,
  onToggle,
  onReminderClick,
}: {
  lists: ReminderList[]
  hideCompleted: boolean
  onToggle: (id: string, done: boolean) => void
  onReminderClick: (id: string) => void
}) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      {lists.map((list, index) => (
        <motion.div
          key={list.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <GlassPanel className="rounded-3xl p-6" data-testid="list-panel">
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`flex items-center gap-2 text-lg font-bold ${list.color}`}>
                <span>{list.icon}</span>
                {list.title}
              </h3>
              <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-black text-orange-600">
                {list.reminders.filter(r => hideCompleted ? !r.done : true).length}
              </span>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {list.reminders
                  .filter(r => hideCompleted ? !r.done : true)
                  .map((reminder, idx) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      index={idx}
                      onToggle={onToggle}
                      onClick={() => onReminderClick(reminder.id)}
                    />
                  ))}
              </AnimatePresence>

              {list.reminders.filter(r => hideCompleted ? !r.done : true).length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center"
                >
                  <div className="text-sm font-medium text-slate-400">暂无提醒事项</div>
                  <div className="mt-1 text-xs text-slate-400">去系统提醒中添加</div>
                </motion.div>
              )}
            </div>
          </GlassPanel>
        </motion.div>
      ))}
    </div>
  )
}

// By Time View Component
function ByTimeView({
  groups,
  hideCompleted,
  expandedGroups,
  onToggleGroup,
  onToggle,
  onReminderClick,
}: {
  groups: TimeGroup[]
  hideCompleted: boolean
  expandedGroups: Set<string>
  onToggleGroup: (groupId: string) => void
  onToggle: (id: string, done: boolean) => void
  onReminderClick: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      {groups.map((group, index) => {
        const filteredReminders = group.reminders.filter(r => hideCompleted ? !r.done : true)
        const isExpanded = expandedGroups.has(group.id)

        return (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <GlassPanel className="rounded-3xl p-6" data-testid="time-group">
              <motion.button
                onClick={() => onToggleGroup(group.id)}
                className="mb-4 flex w-full items-center justify-between"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <h3 className={`flex items-center gap-2 text-lg font-bold ${group.color}`}>
                  <span>{group.icon}</span>
                  {group.title}
                </h3>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-black ${group.color} bg-opacity-10`}>
                    {filteredReminders.length}
                  </span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </motion.div>
                </div>
              </motion.button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {filteredReminders.map((reminder, idx) => (
                      <TimeGroupReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        index={idx}
                        bgColor={group.bgColor}
                        borderColor={group.borderColor}
                        onToggle={onToggle}
                        onClick={() => onReminderClick(reminder.id)}
                      />
                    ))}

                    {filteredReminders.length === 0 && (
                      <div className="py-4 text-center text-sm text-slate-400">
                        无提醒事项
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassPanel>
          </motion.div>
        )
      })}
    </div>
  )
}

// Reminder Card Component
function ReminderCard({
  reminder,
  index,
  onToggle,
  onClick,
}: {
  reminder: ReminderItem
  index: number
  onToggle: (id: string, done: boolean) => void
  onClick: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard
        className={`rounded-xl p-3 ${reminder.done ? 'opacity-60' : ''}`}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={reminder.done}
            onChange={(e) => onToggle(reminder.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 rounded"
          />
          <button type="button" onClick={onClick} className="flex-1 text-left">
            <div className={`text-sm font-bold ${reminder.done ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
              {reminder.title}
            </div>
            {reminder.dueAt && (
              <div className="mt-1 text-xs text-orange-600">
                {formatDueDate(reminder.dueAt)}
              </div>
            )}
          </button>
        </label>
      </GlassCard>
    </motion.div>
  )
}

// Time Group Reminder Card Component
function TimeGroupReminderCard({
  reminder,
  index,
  bgColor,
  borderColor,
  onToggle,
  onClick,
}: {
  reminder: ReminderItem
  index: number
  bgColor: string
  borderColor: string
  onToggle: (id: string, done: boolean) => void
  onClick: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard
        className={`rounded-xl border-l-4 ${borderColor} ${bgColor} p-4 ${reminder.done ? 'opacity-60' : ''}`}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={reminder.done}
            onChange={(e) => onToggle(reminder.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 rounded"
          />
          <button type="button" onClick={onClick} className="flex-1 text-left">
            <div className={`text-sm font-bold ${reminder.done ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
              {reminder.title}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
              <span>{reminder.listTitle}</span>
              {reminder.dueAt && (
                <>
                  <span>·</span>
                  <span>{formatDueDate(reminder.dueAt)}</span>
                </>
              )}
            </div>
          </button>
        </label>
      </GlassCard>
    </motion.div>
  )
}

// Helper function
function formatDueDate(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return `过期 ${Math.abs(days)} 天`
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days < 7) return `${days} 天后`
  return date.toLocaleDateString('zh-CN')
}
