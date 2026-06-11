import { Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassCard } from '../common/GlassCard'
import { GlassPanel } from '../common/GlassPanel'
import { useAppStore } from '../../store/appStore'

export function TodayView() {
  const goals = useAppStore((state) => state.goals)
  const todayFocusTasks = useAppStore((state) => state.todayFocusTasks)
  const timeline = useAppStore((state) => state.timeline)
  const openReminderDrawer = useAppStore((state) => state.openReminderDrawer)
  const openTaskDrawer = useAppStore((state) => state.openTaskDrawer)
  const openGoalDrawer = useAppStore((state) => state.openGoalDrawer)

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
          <GlassPanel className="rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">今日持续推进</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">截止日前每天都要看见的任务。</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">{todayFocusTasks.length}</span>
            </div>
            <div className="space-y-3">
              {todayFocusTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openTaskDrawer(task.id)}
                  className="glass-card flex w-full items-center justify-between rounded-2xl p-4 text-left"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{task.title}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{task.linkedGoalLabel || '独立待办'}</div>
                  </div>
                  <div className="text-right text-xs font-bold text-slate-400">
                    <div>{task.isOngoing ? '持续推进' : '今天截止'}</div>
                    <div>{task.dueDate ? task.dueDate.toLocaleDateString('zh-CN') : '未设截止日期'}</div>
                  </div>
                </button>
              ))}
              {todayFocusTasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-400">
                  今天没有持续推进任务
                </div>
              )}
            </div>
          </GlassPanel>

          {goals.map((goal) => (
            <button key={goal.id} type="button" onClick={() => openGoalDrawer(goal.id)} className="block text-left">
              <GlassPanel className="w-full rounded-3xl border-t-4 border-t-indigo-500 p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700">{goal.area}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">目标：{goal.title}</h2>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-indigo-600">{goal.progress}%</span>
                  <p className="text-xs font-bold text-slate-400">Next: {goal.nextTodo}</p>
                </div>
              </div>

              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200/60">
                <div className="progress-bar h-2 rounded-full bg-indigo-500" style={{ width: `${goal.progress}%` }} />
              </div>

              <GlassCard className="rounded-xl p-3">
                <div className="text-sm font-bold text-slate-800">{goal.nextTodo}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Keep the next action concrete.</div>
              </GlassCard>
              </GlassPanel>
            </button>
          ))}
        </div>

        <GlassPanel className="relative rounded-3xl p-8">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-900">
            <Clock className="h-5 w-5 text-indigo-500" />
            今日时间轴
          </h2>

          <div className="timeline-line relative space-y-6">
            {timeline.map((item) => (
              <motion.div key={item.id} className="relative z-10 flex gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-12 shrink-0 text-right">
                  <span className={`text-xs font-black ${item.source === 'calendar' ? 'text-slate-500' : 'text-indigo-600'}`}>{item.timeLabel}</span>
                </div>
                <div className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white ${item.source === 'calendar' ? 'bg-emerald-400' : item.source === 'reminder' ? 'bg-indigo-500 ring-4 ring-indigo-100' : 'bg-amber-400'}`} />
                <button
                  type="button"
                  onClick={() => {
                    if (item.source === 'reminder') openReminderDrawer(item.id)
                    if (item.source === 'todo') openTaskDrawer(item.id)
                  }}
                  className={`flex-1 rounded-xl p-3 text-left ${item.source === 'reminder' ? 'glass-card border-l-4 border-l-indigo-500 shadow-md' : 'glass-card border border-slate-100'} ${item.source === 'reminder' ? 'transition-transform hover:-translate-y-0.5' : ''}`}
                >
                  <div className="mb-1 text-[10px] font-bold uppercase text-slate-500">
                    {item.source === 'calendar' ? item.sourceLabel || 'Calendar Event' : item.source === 'reminder' ? item.sourceLabel || 'Apple Reminders' : item.sourceLabel || 'Habit / Reminder'}
                  </div>
                  <div className={`text-sm font-bold ${item.done ? 'text-slate-600 line-through' : 'text-slate-800'}`}>{item.title}</div>
                </button>
              </motion.div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </section>
  )
}
