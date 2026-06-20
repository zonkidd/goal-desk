import { ArrowRight, Layers3, Plus, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { GlassCard } from '../common/GlassCard'
import { GlassPanel } from '../common/GlassPanel'
import { AreaSelectWithCreate } from '../shared/AreaSelectWithCreate'
import { useAreaStore } from '../../store/areaStore'
import { useUiStore } from '../../store/uiStore'
import { useGoalStore } from '../../store/goalStore'
import type { GoalCard, GoalStatus } from '../../types/app'

const goalStatuses: GoalStatus[] = ['ACTIVE', 'PAUSED', 'READY_TO_COMPLETE', 'COMPLETED', 'ARCHIVED']

const statusColumns: Array<{ title: string; statuses: GoalStatus[]; bg: string; accent: string }> = [
  { title: '推进中', statuses: ['ACTIVE', 'READY_TO_COMPLETE'], bg: 'bg-[#F4E8CA]', accent: 'bg-amber-500' },
  { title: '等待中', statuses: ['PAUSED'], bg: 'bg-[#DDEEE8]', accent: 'bg-emerald-500' },
  { title: '已收束', statuses: ['COMPLETED', 'ARCHIVED'], bg: 'bg-[#DAE7F3]', accent: 'bg-blue-500' },
]

export function GoalsView() {
  const baseGoals = useGoalStore((state) => state.baseGoals)
  const activeArea = useUiStore((state) => state.activeArea)
  const goals = activeArea === 'ALL' ? baseGoals : baseGoals.filter(goal => goal.area === activeArea)
  const allAreas = useAreaStore((state) => state.allAreas)
  const setActiveArea = useUiStore((state) => state.setActiveArea)
  const createGoal = useGoalStore((state) => state.createGoal)
  const createArea = useAreaStore((state) => state.createArea)
  const openGoalDrawer = useUiStore((state) => state.openGoalDrawer)
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('')
  const [description, setDescription] = useState('')
  const [activeStatus, setActiveStatus] = useState<GoalStatus | 'ALL'>('ALL')

  const isAreaBoard = activeArea !== 'ALL'
  const visibleGoals = activeStatus === 'ALL' ? goals : goals.filter((goal) => goal.status === activeStatus)
  const activeAreaStats = allAreas.find((item) => item.title === activeArea)
  const boardStats = useMemo(() => {
    const activeCount = goals.filter((goal) => goal.status === 'ACTIVE' || goal.status === 'READY_TO_COMPLETE').length
    const pausedCount = goals.filter((goal) => goal.status === 'PAUSED').length
    const averageProgress = goals.length === 0 ? 0 : Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
    return { activeCount, pausedCount, averageProgress }
  }, [goals])

  useEffect(() => {
    // 当切换到具体领域看板时，自动将新建目标的领域设置为当前领域
    if (activeArea !== 'ALL') {
      setArea(activeArea)
    }
  }, [activeArea])

  const handleCreateGoal = () => {
    void createGoal({ title, area, description }).then((result) => {
      if (!result?.goal) return
      setTitle('')
      setArea(activeArea === 'ALL' ? '' : activeArea)
      setDescription('')
      if (result.openGoalWorkspace) {
        openGoalDrawer(result.goal.id)
      }
      void useAreaStore.getState().loadAreas()
    })
  }

  return (
    <section id="goals" className="screen active">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-400 shadow-sm backdrop-blur-md">
            <Layers3 className="h-3.5 w-3.5" />
            {isAreaBoard ? 'Area Board' : 'Goal Workspace'}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{isAreaBoard ? `${activeArea} 领域看板` : '目标'}</h1>
          <p className="mt-2 font-medium text-slate-500">
            {isAreaBoard ? `展示「${activeArea}」领域下关联的所有目标，像看板一样查看推进、等待和收束状态。` : '把目标作为任务容器、结果对象和进度看板来管理。'}
          </p>
        </div>
        {isAreaBoard && (
          <button
            type="button"
            onClick={() => setActiveArea('ALL')}
            className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
          >
            查看全部目标
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <MetricCard label="当前领域" value={isAreaBoard ? activeArea : '全部'} />
        <MetricCard label="关联目标" value={activeAreaStats?.goalCount ?? goals.length} />
        <MetricCard label="活跃推进" value={activeAreaStats?.activeGoalCount ?? boardStats.activeCount} />
        <MetricCard label="平均进度" value={`${boardStats.averageProgress}%`} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-3xl border border-white/70 bg-white/55 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-md">
        <span className="font-black text-slate-400">当前筛选</span>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">{isAreaBoard ? activeArea : '全部领域'}</span>
        <span className="text-slate-400">·</span>
        <span>{visibleGoals.length} 个目标</span>
        {isAreaBoard && (
          <button
            type="button"
            onClick={() => setActiveArea('ALL')}
            className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 transition-colors hover:border-indigo-200 hover:text-indigo-600"
          >
            清除领域过滤
          </button>
        )}
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
            <AreaSelectWithCreate
              value={area}
              areas={allAreas}
              onChange={setArea}
              onCreateArea={async (title) => {
                await createArea(title)
              }}
              placeholder="选择或创建领域"
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
              onClick={handleCreateGoal}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-base font-bold text-white transition-colors hover:bg-slate-800"
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

          {isAreaBoard ? (
            <AreaGoalBoard goals={visibleGoals} onOpenGoal={openGoalDrawer} />
          ) : (
            <div className="grid grid-cols-2 items-start gap-4">
              {visibleGoals.map((goal) => (
                <GoalTile key={goal.id} goal={goal} onOpenGoal={openGoalDrawer} />
              ))}
            </div>
          )}

          {visibleGoals.length === 0 && (
            <GlassPanel className="rounded-3xl p-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black text-slate-800">{isAreaBoard ? '这个领域还没有目标' : '还没有匹配的目标'}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">
                {isAreaBoard ? '在左侧创建第一个目标，领域会自动填入当前领域；也可以切换到全部目标查看其它目标。' : '调整状态筛选，或创建一个新的目标。'}
              </p>
            </GlassPanel>
          )}
        </div>
      </div>
    </section>
  )
}

function AreaGoalBoard({ goals, onOpenGoal }: { goals: GoalCard[]; onOpenGoal: (goalId: string) => void }) {
  return (
    <div className="grid grid-cols-3 items-start gap-5">
      {statusColumns.map((column) => {
        const columnGoals = goals.filter((goal) => column.statuses.includes(goal.status))
        return (
          <GlassPanel key={column.title} className={`min-h-[420px] rounded-3xl p-4 ${column.bg}`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-700">
                <span className={`h-2 w-2 rounded-full ${column.accent}`} />
                {column.title}
              </h2>
              <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs font-black text-slate-500">{columnGoals.length}</span>
            </div>
            <div className="space-y-3">
              {columnGoals.map((goal) => (
                <GoalBoardCard key={goal.id} goal={goal} onOpenGoal={onOpenGoal} />
              ))}
              {columnGoals.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/80 bg-white/35 p-5 text-center text-xs font-bold text-slate-400">
                  暂无目标
                </div>
              )}
            </div>
          </GlassPanel>
        )
      })}
    </div>
  )
}

function GoalBoardCard({ goal, onOpenGoal }: { goal: GoalCard; onOpenGoal: (goalId: string) => void }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      type="button"
      onClick={() => onOpenGoal(goal.id)}
      className="block w-full text-left"
    >
      <GlassCard className="rounded-2xl p-4 transition-all hover:shadow-lg">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="mb-2 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-600">{goal.area}</div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{goal.progress}%</span>
        </div>
        <div className="text-sm font-black text-slate-800">{goal.title}</div>
        {goal.nextTodo && (
          <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600">
            <span className="font-bold text-slate-400">Next: </span>{goal.nextTodo}
          </div>
        )}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${goal.progress}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-400">
          <span>{goal.taskCount} 个任务</span>
          <span className="inline-flex items-center gap-1 text-indigo-500">
            打开 <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </GlassCard>
    </motion.button>
  )
}

function GoalTile({ goal, onOpenGoal }: { goal: GoalCard; onOpenGoal: (goalId: string) => void }) {
  return (
    <button type="button" onClick={() => onOpenGoal(goal.id)} className="block text-left transition-transform hover:-translate-y-1 active:scale-98">
      <GlassCard className="rounded-3xl p-6 transition-all hover:shadow-lg">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-purple-50 px-3 py-1.5 text-xs font-black uppercase text-purple-600">{goal.area}</div>
            <h2 className="text-xl font-bold text-slate-900">{goal.title}</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500">{goal.status}</span>
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
  )
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <GlassCard className="rounded-3xl p-4">
      <div className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
    </GlassCard>
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
