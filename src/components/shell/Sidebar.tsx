import { Calendar, CheckSquare, Inbox, KanbanSquare, Link, PauseCircle, Plus, Sun, Target, Workflow } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { useAppStore } from '../../store/appStore'
import type { ViewKey } from '../../types/app'

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Inbox }> = [
  { key: 'inbox', label: '收集箱 / 待办', icon: Inbox },
  { key: 'today', label: '今日焦点', icon: Sun },
  { key: 'board', label: '目标看板', icon: KanbanSquare },
  { key: 'goals', label: '目标', icon: Target },
  { key: 'calendar', label: '📅 日历看板', icon: Calendar },
  { key: 'reminders', label: '⏰ 提醒看板', icon: CheckSquare },
]

export function Sidebar() {
  const currentView = useAppStore((state) => state.currentView)
  const activeArea = useAppStore((state) => state.activeArea)
  const allAreas = useAppStore((state) => state.allAreas)
  const setView = useAppStore((state) => state.setView)
  const setActiveArea = useAppStore((state) => state.setActiveArea)
  const openQuickCapture = useAppStore((state) => state.openQuickCapture)
  const goals = useAppStore((state) => state.baseGoals)
  const inboxCount = useAppStore((state) => state.tasks.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS').length)
  const pausedCount = useAppStore((state) => state.tasks.filter((task) => task.status === 'PAUSED').length)
  const areaSummary = allAreas.slice(0, 3)

  // EventKit 集成状态
  const eventkitPermissions = useAppStore((state) => state.eventkitPermissions)
  const eventkitData = useAppStore((state) => state.eventkitData)
  const requestCalendarAccess = useAppStore((state) => state.requestCalendarAccess)
  const requestRemindersAccess = useAppStore((state) => state.requestRemindersAccess)

  return (
    <aside className="glass-panel relative z-20 flex h-full w-[260px] shrink-0 flex-col justify-between border-r border-white/50">
      <div className="px-6 pb-4 pt-8">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 shadow-lg">
            <Workflow className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Goal Desk</h1>
        </div>
      </div>

      <nav className="nav-container flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
        <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Tasks</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = currentView === item.key
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                'nav-btn flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                active
                  ? 'border border-slate-100 bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-800',
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.key === 'inbox' && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">{inboxCount}</span>
              )}
            </button>
          )
        })}

        <p className="mb-3 mt-8 flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <span>Areas 领域</span>
          <button
            onClick={() => setView('areas')}
            className="rounded px-2 py-0.5 text-[10px] font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            管理
          </button>
        </p>
        <motion.button
          whileHover={{ x: 2 }}
          onClick={() => {
            setActiveArea('ALL')
            setView('goals')
          }}
          className={cn(
            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all hover:bg-white/60',
            activeArea === 'ALL' ? 'bg-white/70 text-indigo-600 shadow-sm ring-1 ring-indigo-200' : 'text-slate-600',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-slate-400" /> 全部领域
          </div>
          <span className="text-xs text-slate-400">{goals.length}</span>
        </motion.button>
        {allAreas.map((area, index) => {
          const swatch = index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-amber-500' : 'bg-emerald-500'
          const active = activeArea === area.title
          return (
            <motion.button
              key={area.id}
              whileHover={{ x: 2 }}
              onClick={() => {
                setActiveArea(area.title)
                setView('goals')
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all hover:bg-white/60',
                active ? 'bg-white/70 text-indigo-600 shadow-sm ring-1 ring-indigo-200' : 'text-slate-600',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${swatch}`} /> {area.title}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>{area.goalCount}</span>
                <span>·</span>
                <span>{area.activeGoalCount}</span>
              </div>
            </motion.button>
          )
        })}

        <div className="mt-8 rounded-2xl border border-amber-100 bg-white/50 p-4 shadow-sm backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-500">
            <PauseCircle className="h-4 w-4" />
            Paused
          </div>
          <p className="text-sm font-semibold text-slate-700">{pausedCount} 项等待恢复</p>
        </div>

        {/* EventKit 系统集成状态卡片 */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/50 p-4 shadow-sm backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Link className="h-4 w-4" />
            System Integration
          </div>

          {/* 日历集成状态 */}
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span>日历</span>
            </div>
            {eventkitPermissions.calendar === 'granted' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-green-600">✓ 已授权</span>
                <span className="text-xs text-slate-400">{eventkitData.calendarEventCount} 个</span>
              </div>
            ) : eventkitPermissions.calendar === 'denied' ? (
              <span className="text-xs font-bold text-red-600">✗ 已拒绝</span>
            ) : eventkitPermissions.calendar === 'restricted' ? (
              <span className="text-xs font-bold text-amber-600">🔒 限制</span>
            ) : eventkitPermissions.calendar === 'error' ? (
              <span className="text-xs font-bold text-red-600">⚠️ 错误</span>
            ) : (
              <button
                onClick={requestCalendarAccess}
                className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-bold text-purple-600 transition-colors hover:bg-purple-100"
              >
                授权
              </button>
            )}
          </div>

          {/* 提醒集成状态 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <CheckSquare className="h-4 w-4 text-orange-500" />
              <span>提醒</span>
            </div>
            {eventkitPermissions.reminders === 'granted' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-green-600">✓ 已授权</span>
                <span className="text-xs text-slate-400">{eventkitData.reminderCount} 个</span>
              </div>
            ) : eventkitPermissions.reminders === 'denied' ? (
              <span className="text-xs font-bold text-red-600">✗ 已拒绝</span>
            ) : eventkitPermissions.reminders === 'restricted' ? (
              <span className="text-xs font-bold text-amber-600">🔒 限制</span>
            ) : eventkitPermissions.reminders === 'error' ? (
              <span className="text-xs font-bold text-red-600">⚠️ 错误</span>
            ) : (
              <button
                onClick={requestRemindersAccess}
                className="rounded-lg bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-100"
              >
                授权
              </button>
            )}
          </div>
        </div>
      </nav>

      <button
        onClick={openQuickCapture}
        className="mx-4 mb-6 flex items-center justify-between rounded-2xl border border-white/60 bg-white/50 p-4 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
      >
        <span>全局速记</span>
        <kbd className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">⌥ Space</kbd>
      </button>
    </aside>
  )
}
