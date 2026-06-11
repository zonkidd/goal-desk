import { Plus, Target } from 'lucide-react'
import { useState } from 'react'
import { GlassCard } from '../common/GlassCard'
import { GlassPanel } from '../common/GlassPanel'
import { useAppStore } from '../../store/appStore'
import type { GoalStatus } from '../../types/app'

const goalStatuses: GoalStatus[] = ['ACTIVE', 'PAUSED', 'READY_TO_COMPLETE', 'COMPLETED', 'ARCHIVED']

export function GoalsView() {
  const goals = useAppStore((state) => state.goals)
  const createGoal = useAppStore((state) => state.createGoal)
  const openGoalDrawer = useAppStore((state) => state.openGoalDrawer)
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('独立开发')
  const [description, setDescription] = useState('')
  const [activeStatus, setActiveStatus] = useState<GoalStatus | 'ALL'>('ALL')

  const visibleGoals = activeStatus === 'ALL' ? goals : goals.filter((goal) => goal.status === activeStatus)

  return (
    <section id="goals" className="screen active">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">目标</h1>
          <p className="mt-2 font-medium text-slate-500">把目标作为任务容器、结果对象和进度看板来管理。</p>
        </div>
      </div>

      <div className="grid grid-cols-[360px_1fr] gap-6">
        <GlassPanel className="rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-black text-slate-800">
            <Target className="h-4 w-4 text-indigo-500" />
            新建目标
          </div>
          <div className="space-y-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="目标标题"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
            />
            <input
              value={area}
              onChange={(event) => setArea(event.target.value)}
              placeholder="所属领域"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="目标描述"
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={() => {
                void createGoal({ title, area, description }).then((goalId) => {
                  if (!goalId) return
                  setTitle('')
                  setArea('独立开发')
                  setDescription('')
                })
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-base font-bold text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              创建目标
            </button>
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <FilterButton active={activeStatus === 'ALL'} label="全部" onClick={() => setActiveStatus('ALL')} />
            {goalStatuses.map((status) => (
              <FilterButton key={status} active={activeStatus === status} label={status} onClick={() => setActiveStatus(status)} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {visibleGoals.map((goal) => (
              <button key={goal.id} type="button" onClick={() => openGoalDrawer(goal.id)} className="block text-left transition-transform hover:-translate-y-1 active:scale-98">
                <GlassCard className="rounded-3xl p-6 hover:shadow-lg transition-all">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 inline-flex rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black uppercase text-indigo-600">
                        {goal.area}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">{goal.title}</h2>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500">
                      {goal.status}
                    </span>
                  </div>
                  <p className="mb-4 line-clamp-2 min-h-10 text-sm font-medium text-slate-500">{goal.description || '暂无描述'}</p>
                  <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${goal.progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>{goal.taskCount} 个任务</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="mt-3 text-xs font-bold text-slate-400">Next: {goal.nextTodo}</div>
                </GlassCard>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-black transition-colors ${active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300'}`}
    >
      {label}
    </button>
  )
}
