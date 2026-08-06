import { CalendarDays, Clock, Inbox, Info, PlusCircle, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { type ReactNode, useState, memo } from 'react'
import type { Task } from '../../types/task'
import type { GoalCard, TimelineItem, ReminderItem } from '../../types/app'
import type { TodayRelevantGoal } from '../../lib/workspaceDerivation'
import { GlassCard } from '../common/GlassCard'
import { GlassPanel } from '../common/GlassPanel'
import { useUiStore } from '../../store/uiStore'
import { useEventkitStore } from '../../store/eventkitStore'
import { useWorkspaceDerived } from '../../hooks/useWorkspaceDerived'
import { getTaskTimeInfo, getUrgencyColor, getUrgencyIcon } from '../../lib/taskPresentation'
import { startOfDay } from '../../lib/dateUtils'
import { cn } from '../../lib/cn'

function GuidedActionButton({
  children,
  icon,
  onClick,
  variant = 'secondary',
  ariaLabel,
}: {
  children: ReactNode
  icon: ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary'
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
        variant === 'primary'
          ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function GuidedEmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-indigo-200 bg-white/50 px-4 py-6', className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
          <div className="mt-4 flex flex-wrap gap-2">{children}</div>
        </div>
      </div>
    </div>
  )
}

// Timeline 来源视觉配置辅助函数
// PRD 颜色规范: Calendar=绿色, Reminder=靛蓝, Todo=琥珀色
function getTimelineStyles(source: 'todo' | 'reminder' | 'calendar') {
  const styles = {
    todo: {
      dot: 'bg-amber-500',
      card: 'border-l-4 border-l-amber-500 bg-amber-50/30',
      label: 'text-amber-600',
    },
    reminder: {
      dot: 'bg-indigo-500',
      card: 'border-l-4 border-l-indigo-500 bg-indigo-50/30',
      label: 'text-indigo-600',
    },
    calendar: {
      dot: 'bg-emerald-500',
      card: 'border-l-4 border-l-emerald-500 bg-emerald-50/30',
      label: 'text-emerald-600',
    },
  }
  return styles[source]
}

export function TodayView() {
  const { today } = useWorkspaceDerived()
  const showCompletedTodos = useUiStore((state) => state.showCompletedTodos)
  const rawTimeline = today.timeline
  const todayStart = startOfDay(new Date())
  const timeline = rawTimeline
    .filter(item => {
      if (!item.occurrenceDate) return true
      return startOfDay(item.occurrenceDate).getTime() === todayStart.getTime()
    })
    .filter(item => showCompletedTodos || !item.done)
  const hasOnlyPassiveCalendarItems = timeline.length > 0 && timeline.every((item) => item.source === 'calendar' && item.timeLabel === '00:00')
  const shouldShowTimelineGuidance = timeline.length === 0 || hasOnlyPassiveCalendarItems
  const timelineGuidanceTitle = timeline.length === 0 ? '今天还没有安排到具体时间的事项' : '今天的日程很轻'
  const timelineGuidanceDescription =
    timeline.length === 0
      ? '给待办补一个开始时间，或新建一个今天要处理的事项。'
      : '除了全天日历项，今天还没有锁定到具体时间的行动。'
  const ongoingTasks = today.attentionGroups.ongoing
  const systemReminders = today.attentionGroups.systemReminders
  const overdue = today.attentionGroups.overdue
  const dueToday = today.attentionGroups.dueToday
  const todayRelevantGoals = today.relevantGoals
  const openDrawer = useUiStore((state) => state.openDrawer)
  const openQuickCapture = useUiStore((state) => state.openQuickCapture)
  const setView = useUiStore((state) => state.setView)
  const eventkitPermissions = useEventkitStore((state) => state.eventkitPermissions)
  const requestCalendarAccess = useEventkitStore((state) => state.requestCalendarAccess)
  const requestRemindersAccess = useEventkitStore((state) => state.requestRemindersAccess)

  // 横幅关闭状态
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem('eventkit-banner-dismissed') === 'true'
  })

  const handleDismiss = () => {
    localStorage.setItem('eventkit-banner-dismissed', 'true')
    setBannerDismissed(true)
  }

  // 判断是否显示横幅
  const shouldShowBanner =
    !bannerDismissed &&
    (eventkitPermissions.calendar === 'not_determined' || eventkitPermissions.reminders === 'not_determined')

  return (
    <section id="today" className="screen active">
      <div className="mb-8 flex items-end justify-between animate-spring">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">今日焦点</h1>
          <p className="mt-2 font-medium text-slate-500">在时间流中推进你的顶层目标。</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_400px] gap-8">
        <div className="flex flex-col gap-6">
          {(overdue.length > 0 || dueToday.length > 0) && (
            <GlassPanel className="relative z-10 rounded-3xl p-6 border-red-100 bg-red-50/10">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-red-700">截止与逾期</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">需要立即处理的紧急待办。</p>
                </div>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-600">
                  {overdue.length + dueToday.length}
                </span>
              </div>
              <div className="space-y-3">
                {overdue.map((task) => (
                  <OngoingTaskRow key={task.id} task={task} onClick={() => openDrawer('task', task.id)} />
                ))}
                {dueToday.map((task) => (
                  <OngoingTaskRow key={task.id} task={task} onClick={() => openDrawer('task', task.id)} />
                ))}
              </div>
            </GlassPanel>
          )}

          <GlassPanel className="relative z-10 rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">今日持续推进</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">开始时间与截止时间覆盖今天，且仍在推进中的待办。</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">{ongoingTasks.length}</span>
            </div>
            <div className="space-y-3">
              {ongoingTasks.map((task) => (
                <OngoingTaskRow key={task.id} task={task} onClick={() => openDrawer('task', task.id)} />
              ))}
              {ongoingTasks.length === 0 && systemReminders.length === 0 && (
                <GuidedEmptyState
                  icon={<PlusCircle className="h-4 w-4" />}
                  title="今天还没有正在推进的待办"
                  description="从收集箱挑一个，或新建一个今天要推进的动作。"
                >
                  <GuidedActionButton icon={<PlusCircle className="h-3.5 w-3.5" />} onClick={openQuickCapture} variant="primary">
                    新建待办
                  </GuidedActionButton>
                  <GuidedActionButton icon={<Inbox className="h-3.5 w-3.5" />} onClick={() => setView('inbox')}>
                    去收集箱
                  </GuidedActionButton>
                </GuidedEmptyState>
              )}
              {systemReminders.length > 0 && (
                <>
                  {ongoingTasks.length > 0 && (
                    <div className="pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">系统提醒</div>
                  )}
                  {systemReminders.map((reminder) => (
                    <SystemReminderRow key={reminder.id} reminder={reminder} onClick={() => openDrawer('reminder', reminder.id)} />
                  ))}
                </>
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-3xl border border-indigo-100 bg-indigo-50/30 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">今日目标看点</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">仅展示由持续推进待办牵引的目标。</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-600">{todayRelevantGoals.length}</span>
            </div>

            <div className="space-y-3">
              {todayRelevantGoals.map((goal) => (
                <RelevantGoalRow key={goal.id} goal={goal} onClick={() => openDrawer('goal', goal.id)} />
              ))}

              {todayRelevantGoals.length === 0 && (
                <GuidedEmptyState
                  icon={<Target className="h-4 w-4" />}
                  title="今天还没有目标被待办牵引"
                  description="把待办关联到目标后，这里会显示目标进度和下一步。"
                  className="bg-white/60"
                >
                  <GuidedActionButton icon={<Target className="h-3.5 w-3.5" />} onClick={() => setView('goals')} variant="primary">
                    查看目标
                  </GuidedActionButton>
                  <GuidedActionButton
                    icon={<Inbox className="h-3.5 w-3.5" />}
                    onClick={() => setView('inbox')}
                    ariaLabel="去收集箱（今日目标看点）"
                  >
                    去收集箱
                  </GuidedActionButton>
                </GuidedEmptyState>
              )}
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="relative rounded-3xl p-8">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-900">
            <Clock className="h-5 w-5 text-indigo-500" />
            今日时间轴
          </h2>

          {shouldShowBanner && (
            <div className="glass-card mb-4 rounded-2xl border-l-4 border-l-indigo-500 bg-indigo-50/50 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 shrink-0 text-indigo-600" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900">集成系统日历和提醒</h3>
                  <p className="mt-1 text-xs text-slate-600">获得锁屏通知和跨应用同步能力</p>
                  <div className="mt-3 flex gap-2">
                    {eventkitPermissions.calendar === 'not_determined' && (
                      <button
                        type="button"
                        onClick={requestCalendarAccess}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                      >
                        授权日历
                      </button>
                    )}
                    {eventkitPermissions.reminders === 'not_determined' && (
                      <button
                        type="button"
                        onClick={requestRemindersAccess}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                      >
                        授权提醒
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      暂不需要
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="timeline-line relative space-y-6">
            {timeline.map((item) => (
              <TimelineItemRow
                key={item.id}
                item={item}
                onClick={() => {
                  if (item.source === 'todo') openDrawer('task', item.id)
                  if (item.source === 'reminder') openDrawer('reminder', item.id)
                  if (item.source === 'calendar') openDrawer('calendarEvent', item.id)
                }}
              />
            ))}

            {shouldShowTimelineGuidance && (
              <GuidedEmptyState
                icon={<CalendarDays className="h-4 w-4" />}
                title={timelineGuidanceTitle}
                description={timelineGuidanceDescription}
                className="bg-white/55"
              >
                <GuidedActionButton icon={<PlusCircle className="h-3.5 w-3.5" />} onClick={openQuickCapture} variant="primary">
                  添加时间事项
                </GuidedActionButton>
                <GuidedActionButton icon={<CalendarDays className="h-3.5 w-3.5" />} onClick={() => setView('calendar')}>
                  查看日历
                </GuidedActionButton>
              </GuidedEmptyState>
            )}
          </div>
        </GlassPanel>
      </div>
    </section>
  )
}

const OngoingTaskRow = memo(function OngoingTaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const timeInfo = getTaskTimeInfo(task)
  const urgencyColor = getUrgencyColor(timeInfo.urgency)
  const urgencyIcon = getUrgencyIcon(timeInfo.urgency)

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className="glass-card flex w-full items-center justify-between rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5"
      >
        <div>
          <div className="text-sm font-bold text-slate-900">{task.title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{task.linkedGoalLabel || '独立待办'}</div>
        </div>
        <div className="text-right text-xs font-bold">
          <div className="text-slate-500 mb-0.5">已推进 {timeInfo.daysElapsed}天</div>
          <div className={`flex items-center justify-end gap-1 ${urgencyColor}`}>
            {timeInfo.daysRemaining !== null ? (
              <>
                <span>还剩 {timeInfo.daysRemaining}天</span>
                <span className="text-base">{urgencyIcon}</span>
              </>
            ) : (
              <>
                <span>无截止日期</span>
                <span className="text-base">{urgencyIcon}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Tooltip */}
      <div className="pointer-events-none absolute right-0 top-full z-[9999] mt-2 hidden group-hover:block">
        <div className="rounded-xl bg-slate-900 px-4 py-3 text-white shadow-2xl" style={{ minWidth: '200px' }}>
          <div className="mb-2 text-[10px] font-bold text-slate-400">完整时间线</div>
          <div className="space-y-1 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-400">开始</span>
              <span>{timeInfo.startDate.toLocaleDateString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">今天</span>
              <span className="text-green-400">
                {timeInfo.todayDate.toLocaleDateString('zh-CN')} (第{timeInfo.daysElapsed}天)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">截止</span>
              {timeInfo.endDate ? (
                <span className={timeInfo.urgency === 'critical' ? 'text-red-400' : ''}>
                  {timeInfo.endDate.toLocaleDateString('zh-CN')}
                </span>
              ) : (
                <span className="text-slate-500">未设置</span>
              )}
            </div>
            {timeInfo.totalDays !== null && timeInfo.progressPercent !== null && (
              <div className="mt-2 border-t border-slate-700 pt-2">
                <div className="text-[10px] text-slate-400">
                  总计：{timeInfo.totalDays}天 · 完成 {timeInfo.progressPercent}%
                </div>
              </div>
            )}
            {timeInfo.totalDays === null && (
              <div className="mt-2 border-t border-slate-700 pt-2">
                <div className="text-[10px] text-slate-400">持续推进中...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}, (prev, next) => prev.task === next.task)

const SystemReminderRow = memo(function SystemReminderRow({ reminder, onClick }: { reminder: ReminderItem; onClick: () => void }) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className="glass-card flex w-full items-center justify-between rounded-2xl border-l-4 border-l-indigo-500 bg-indigo-50/30 p-4 text-left transition-transform hover:-translate-y-0.5"
      >
        <div>
          <div className="text-sm font-bold text-slate-900">{reminder.title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{reminder.listTitle || 'Apple Reminders'}</div>
        </div>
        <div className="text-right text-xs font-bold text-indigo-600">
          {reminder.dueAt?.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </button>
    </div>
  )
}, (prev, next) => prev.reminder === next.reminder)

const RelevantGoalRow = memo(function RelevantGoalRow({ goal, onClick }: { goal: TodayRelevantGoal; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <GlassCard className="rounded-2xl p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700">{goal.area}</span>
            <h3 className="mt-2 text-sm font-bold text-slate-900">{goal.title}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">{goal.todayTaskCount} 个持续推进待办覆盖今天</p>
          </div>
          <span className="text-xl font-black text-indigo-600">{goal.progress}%</span>
        </div>

        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/60">
          <div className="progress-bar h-2 rounded-full bg-indigo-500" style={{ width: `${goal.progress}%` }} />
        </div>

        <div className="rounded-xl bg-white/70 p-3">
          <div className="text-xs font-black uppercase text-slate-400">Next</div>
          <div className="mt-1 text-sm font-bold text-slate-800">{goal.nextTodo}</div>
        </div>
      </GlassCard>
    </button>
  )
}, (prev, next) => prev.goal === next.goal)

const TimelineItemRow = memo(function TimelineItemRow({ item, onClick }: { item: TimelineItem; onClick: () => void }) {
  const styles = getTimelineStyles(item.source)
  return (
    <motion.div className="relative z-10 flex gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="w-12 shrink-0 text-right">
        <span className={`text-xs font-black ${styles.label}`}>{item.timeLabel}</span>
      </div>
      <div className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white ${styles.dot}`} />
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 rounded-xl p-3 text-left glass-card ${styles.card} transition-transform hover:-translate-y-0.5`}
      >
        <div className={`mb-1 text-[10px] font-bold uppercase ${styles.label}`}>
          {item.source === 'todo'
            ? item.sourceLabel || 'Desk Task'
            : item.source === 'reminder'
              ? item.sourceLabel || 'Apple Reminders'
              : item.sourceLabel || 'Calendar Event'}
        </div>
        <div className={`text-sm font-bold ${item.done ? 'text-slate-600 line-through' : 'text-slate-800'}`}>{item.title}</div>
      </button>
    </motion.div>
  )
}, (prev, next) => prev.item === next.item)
