import { motion } from 'framer-motion'
import { GlassCard } from '../common/GlassCard'
import { GlassPanel } from '../common/GlassPanel'
import { useUiStore } from '../../store/uiStore'
import { useTaskStore } from '../../store/taskStore'
import { useGoalStore } from '../../store/goalStore'
import { filterTasksByArea } from '../../lib/areaFilter'
import type { TaskStatus } from '../../types/task'

const columns: Array<{ title: string; statuses: TaskStatus[]; bg: string }> = [
  { title: '计划中', statuses: ['TODO'], bg: 'bg-theme-bg border border-white/5 ring-1 ring-white/10' },
  { title: '进行中', statuses: ['IN_PROGRESS', 'PAUSED'], bg: 'bg-theme-card/30 border border-theme-accent/20 ring-1 ring-theme-accent/10' },
  { title: '完成', statuses: ['DONE'], bg: 'bg-theme-bg/50 border border-emerald-500/10 ring-1 ring-emerald-500/10 opacity-70' },
]

export function BoardView() {
  const tasks = useTaskStore((state) => state.tasks)
  const goals = useGoalStore((state) => state.baseGoals)
  const activeArea = useUiStore((state) => state.activeArea)
  const openDrawer = useUiStore((state) => state.openDrawer)
  const visibleTasks = filterTasksByArea(tasks, goals, activeArea)

  return (
    <section id="board" className="screen active">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-theme-primary">目标看板</h1>
          <p className="mt-2 font-medium text-theme-secondary">把 Inbox 中的深度任务推进到具体状态。</p>
        </div>
      </div>

      <div className="grid grid-cols-3 items-start gap-5">
        {columns.map((column) => (
          <GlassPanel key={column.title} className={`rounded-[2rem] p-5 shadow-[0_0_30px_rgba(0,0,0,0.1)] backdrop-blur-xl ${column.bg}`}>
            <h2 className="mb-5 text-sm font-black text-theme-primary tracking-wide">{column.title}</h2>
            <div className="space-y-4">
              {visibleTasks.filter((task) => column.statuses.includes(task.status)).map((task) => (
                <motion.button
                  layout
                  layoutId={`board-card-${task.id}`}
                  key={task.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => openDrawer('task',task.id)}
                  className="block w-full text-left"
                >
                  <GlassCard className="rounded-2xl p-4 shadow-md transition-shadow hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-theme-card border-white/10">
                    <div className="mb-1 text-[10px] font-black uppercase text-theme-accent tracking-wider">{task.status}</div>
                    <div className="text-sm font-bold text-theme-primary">{task.title}</div>
                    <div className="mt-2 text-xs text-theme-secondary">{task.linkedGoalLabel || 'Unlinked task'}</div>
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
