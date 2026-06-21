import { motion } from 'framer-motion'
import { GlassCard } from '../common/GlassCard'
import { GlassPanel } from '../common/GlassPanel'
import { useUiStore } from '../../store/uiStore'
import { useTaskStore } from '../../store/taskStore'
import { useGoalStore } from '../../store/goalStore'
import { filterTasksByArea } from '../../lib/areaFilter'
import type { TaskStatus } from '../../types/task'

const columns: Array<{ title: string; statuses: TaskStatus[]; bg: string }> = [
  { title: '计划中', statuses: ['TODO'], bg: 'bg-[#F4E8CA]' },
  { title: '进行中', statuses: ['IN_PROGRESS', 'PAUSED'], bg: 'bg-[#DDEEE8]' },
  { title: '完成', statuses: ['DONE'], bg: 'bg-[#DAE7F3]' },
]

export function BoardView() {
  const tasks = useTaskStore((state) => state.tasks)
  const goals = useGoalStore((state) => state.baseGoals)
  const activeArea = useUiStore((state) => state.activeArea)
  const openTaskDrawer = useUiStore((state) => state.openTaskDrawer)
  const visibleTasks = filterTasksByArea(tasks, goals, activeArea)

  return (
    <section id="board" className="screen active">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">目标看板</h1>
          <p className="mt-2 font-medium text-slate-500">把 Inbox 中的深度任务推进到具体状态。</p>
        </div>
      </div>

      <div className="grid grid-cols-3 items-start gap-5">
        {columns.map((column) => (
          <GlassPanel key={column.title} className={`rounded-3xl p-4 ${column.bg}`}>
            <h2 className="mb-4 text-sm font-black text-slate-700">{column.title}</h2>
            <div className="space-y-3">
              {visibleTasks.filter((task) => column.statuses.includes(task.status)).map((task) => (
                <motion.button
                  key={task.id}
                  whileHover={{ y: -2 }}
                  onClick={() => openTaskDrawer(task.id)}
                  className="block w-full text-left"
                >
                  <GlassCard className="rounded-2xl p-4">
                    <div className="mb-1 text-[10px] font-black uppercase text-slate-400">{task.status}</div>
                    <div className="text-sm font-bold text-slate-800">{task.title}</div>
                    <div className="mt-2 text-xs text-slate-500">{task.linkedGoalLabel || 'Unlinked task'}</div>
                  </GlassCard>
                </motion.button>
              ))}
            </div>
          </GlassPanel>
        ))}
      </div>
    </section>
  )
}
