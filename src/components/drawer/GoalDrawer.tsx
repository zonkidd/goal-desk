import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, CheckCircle2, Archive, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { GlassCard } from '../common/GlassCard'
import { AreaSelectWithCreate } from '../shared/AreaSelectWithCreate'
import { useSelectedGoal } from '../../store/appStore'
import { useGoalStore } from '../../store/goalStore'
import { useTaskStore } from '../../store/taskStore'
import { useAreaStore } from '../../store/areaStore'
import { useUiStore } from '../../store/uiStore'
import type { GoalStatus } from '../../types/app'

const drawerTransition = { type: 'spring', stiffness: 240, damping: 28 } as const

const statusActions: Array<{ status: GoalStatus; label: string; icon: typeof Play }> = [
  { status: 'ACTIVE', label: '开启', icon: Play },
  { status: 'PAUSED', label: '暂停', icon: Pause },
  { status: 'COMPLETED', label: '完成', icon: CheckCircle2 },
  { status: 'ARCHIVED', label: '归档', icon: Archive },
]

export function GoalDrawer() {
  const goal = useSelectedGoal()
  const isOpen = useUiStore((state) => state.activeDrawer?.type === 'goal')
  const closeDrawer = useUiStore((state) => state.closeDrawer)
  const updateGoalFields = useGoalStore((state) => state.updateGoalFields)
  const updateGoalStatus = useGoalStore((state) => state.updateGoalStatus)
  const createTaskForGoal = useTaskStore((state) => state.createTaskForGoal)
  const openDrawer = useUiStore((state) => state.openDrawer)
  const allAreas = useAreaStore((state) => state.allAreas)
  const createArea = useAreaStore((state) => state.createArea)
  const tasks = useTaskStore((state) => state.tasks)
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('')
  const [description, setDescription] = useState('')
  const [taskTitle, setTaskTitle] = useState('')

  useEffect(() => {
    if (!goal) return
    setTitle(goal.title)
    setArea(goal.area)
    setDescription(goal.description)
  }, [goal?.id])

  const linkedTasks = useMemo(() => tasks.filter((task) => task.linkedGoalId === goal?.id), [goal?.id, tasks])

  return (
    <AnimatePresence>
      {isOpen && goal && (
        <>
          <motion.button
            type="button"
            aria-label="Close goal drawer backdrop"
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
          />
          <motion.aside
            className="glass-panel fixed bottom-4 right-4 top-4 z-50 flex w-[560px] flex-col rounded-3xl border border-white bg-white/95 shadow-2xl outline-none"
            initial={{ x: '120%' }}
            animate={{ x: 0 }}
            exit={{ x: '120%' }}
            transition={drawerTransition}
          >
            <header className="flex items-start justify-between gap-4 rounded-t-3xl border-b border-slate-100 bg-slate-50/50 p-6">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2.5">
                  {statusActions.map((item) => {
                    const Icon = item.icon
                    const isActive = goal.status === item.status
                    return (
                      <button
                        key={item.status}
                        type="button"
                        onClick={() => void updateGoalStatus(goal.id, item.status)}
                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition-all duration-200 ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-lg scale-105'
                            : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:scale-102'
                        }`}
                      >
                        <Icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{goal.taskCount} 个关联任务</div>
              </div>
              <button
                onClick={closeDrawer}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:border-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto p-8">
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => void updateGoalFields(goal.id, { title, area, description })}
                  className="w-full border-none bg-transparent p-0 text-2xl font-black text-slate-900 outline-none focus:ring-0 placeholder-slate-300"
                  placeholder="目标标题"
                />
                <div className="space-y-1">
                  <label className="px-1 text-xs font-bold text-slate-500">领域分类</label>
                  <AreaSelectWithCreate
                    value={area}
                    areas={allAreas}
                    onChange={(value) => {
                      setArea(value)
                      void updateGoalFields(goal.id, { title, area: value, description })
                    }}
                    onCreateArea={async (title) => {
                      await createArea(title)
                    }}
                    placeholder="选择或创建领域"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none focus:border-indigo-500"
                  />
                  <p className="px-1 text-xs text-slate-400">用于组织和筛选相关目标</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                  <span>进度</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                  <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${goal.progress}%` }} />
                </div>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onBlur={() => void updateGoalFields(goal.id, { title, area, description })}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                />
              </div>

              <GlassCard className="rounded-3xl p-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">快速添加任务</div>
                <div className="flex gap-3">
                  <input
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="把这个目标拆出一个待办..."
                    className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const task = await createTaskForGoal(goal, taskTitle)
                      if (task) {
                        closeDrawer()
                        openDrawer('task', task.id)
                      }
                      setTaskTitle('')
                    }}
                    className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    新建
                  </button>
                </div>
              </GlassCard>

              <div>
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">关联任务</div>
                <div className="space-y-2">
                  {linkedTasks.map((task) => (
                    <GlassCard key={task.id} className="rounded-2xl p-4">
                      <div className="mb-1 text-[10px] font-black uppercase text-slate-400">{task.status}</div>
                      <div className="text-sm font-bold text-slate-800">{task.title}</div>
                    </GlassCard>
                  ))}
                  {linkedTasks.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-medium text-slate-400">
                      还没有关联任务
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
