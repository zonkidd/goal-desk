import { Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassCard } from '../common/GlassCard'
import { GlassPanel } from '../common/GlassPanel'
import { useAppStore } from '../../store/appStore'
import { getTaskTimeInfo, getUrgencyColor, getUrgencyIcon } from '../../lib/taskPresentation'
import type { Task } from '../../types/task'

export function TodayView() {
  const todayAttentionGroups = useAppStore((state) => state.todayAttentionGroups)
  const todayRelevantGoals = useAppStore((state) => state.todayRelevantGoals)
  const timeline = useAppStore((state) => state.timeline)
  const ongoingTasks = todayAttentionGroups.ongoing
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
                <p className="mt-1 text-sm font-medium text-slate-500">开始时间与截止时间覆盖今天，且仍在推进中的待办。</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">{ongoingTasks.length}</span>
            </div>
            <div className="space-y-3">
              {ongoingTasks.map((task) => {
                const timeInfo = getTaskTimeInfo(task)
                const urgencyColor = getUrgencyColor(timeInfo.urgency)
                const urgencyIcon = getUrgencyIcon(timeInfo.urgency)

                return (
                  <div key={task.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => openTaskDrawer(task.id)}
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
                    <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden group-hover:block">
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
              })}
              {ongoingTasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-400">
                  今天没有持续推进任务
                </div>
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
                <button key={goal.id} type="button" onClick={() => openGoalDrawer(goal.id)} className="block w-full text-left">
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
              ))}

              {todayRelevantGoals.length === 0 && (
                <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/50 px-4 py-8 text-center text-sm font-medium text-slate-400">
                  暂无需要放进今日看点的目标
                </div>
              )}
            </div>
          </GlassPanel>
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
                    {item.source === 'calendar' ? item.sourceLabel || 'Calendar Event' : item.source === 'reminder' ? item.sourceLabel || 'Apple Reminders' : item.sourceLabel || 'Desk Task'}
                  </div>
                  <div className={`text-sm font-bold ${item.done ? 'text-slate-600 line-through' : 'text-slate-800'}`}>{item.title}</div>
                </button>
              </motion.div>
            ))}

            {timeline.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-medium text-slate-400">
                今天没有已安排开始时间的待办或系统日程
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
    </section>
  )
}
