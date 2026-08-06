import { AlignLeft, Calendar, ChevronDown, ChevronRight, CheckCircle2, Pause, PauseCircle, PlusCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { memo } from 'react'
import { GlassPanel } from '../common/GlassPanel'
import { useUiStore } from '../../store/uiStore'
import { useTaskStore } from '../../store/taskStore'
import { useWorkspaceDerived } from '../../hooks/useWorkspaceDerived'
import { getTaskContentBadgeLabel } from '../../lib/taskPresentation'
import type { Task } from '../../types/task'

export function InboxView() {
  const { inbox: groupedTasks } = useWorkspaceDerived()
  const showCompleted = useUiStore((state) => state.showCompletedTodos)
  const openDrawer = useUiStore((state) => state.openDrawer)
  const addTask = useTaskStore((state) => state.addTask)
  const setShowCompleted = useUiStore((state) => state.setShowCompletedTodos)

  return (
    <section id="inbox" className="screen active">
      <div className="mb-8 flex items-end justify-between animate-spring">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-theme-primary transition-colors">收集箱</h1>
          <p className="mt-2 font-medium text-theme-secondary transition-colors">所有未归类、进行中、或被暂停的待办事项。</p>
        </div>
      </div>

      <GlassPanel className="rounded-3xl p-8">
        <QuickInboxInput onSubmit={addTask} />

        <div className="space-y-8">
          <div>
            <h3 className="mb-4 px-2 text-[11px] font-bold uppercase tracking-widest text-theme-secondary transition-colors">Recently Added & Todo</h3>
            <div className="space-y-2">
              {groupedTasks.activeTasks.map((task) => (
                <ActiveTaskRow key={task.id} task={task} onClick={() => openDrawer('task', task.id)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-widest text-theme-pause transition-colors">
              <PauseCircle className="h-4 w-4" />
              Paused (已暂停)
            </h3>
            <div className="space-y-2 opacity-90">
              {groupedTasks.pausedTasks.map((task) => (
                <PausedTaskRow key={task.id} task={task} onClick={() => openDrawer('task', task.id)} />
              ))}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              className="mb-4 flex w-full items-center justify-between px-2 text-left text-[11px] font-bold uppercase tracking-widest text-theme-accent transition-colors"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed (已完成)
              </span>
              <span className="flex items-center gap-2 text-theme-accent opacity-80">
                {groupedTasks.completed.totalCount}
                {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
            </button>
            {showCompleted && (
              <div className="space-y-2 opacity-90">
                {groupedTasks.completed.visibleTasks.map((task) => (
                  <CompletedTaskRow key={task.id} task={task} onClick={() => openDrawer('task', task.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    </section>
  )
}

function QuickInboxInput({ onSubmit }: { onSubmit: (title: string) => void }) {
  return (
    <div className="group relative mb-8">
      <input
        type="text"
        placeholder="输入待办事项，按 Enter 快速添加..."
        className="h-14 w-full rounded-2xl border border-white/20 bg-theme-card/35 text-theme-primary pl-12 pr-4 text-base font-medium shadow-sm transition-all focus:border-theme-accent focus:outline-none focus:ring-4 focus:ring-theme-accent/20 placeholder:text-theme-secondary/60"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            void onSubmit((event.target as HTMLInputElement).value)
            ;(event.target as HTMLInputElement).value = ''
          }
        }}
      />
      <PlusCircle className="absolute left-4 top-4 h-6 w-6 text-theme-secondary/70 transition-colors group-focus-within:text-theme-accent" />
    </div>
  )
}

const ActiveTaskRow = memo(function ActiveTaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="glass-card flex w-full items-center gap-4 rounded-xl p-4 text-left hover:border-theme-accent"
    >
      <div className="h-5 w-5 shrink-0 rounded-[6px] border-2 border-theme-secondary/35 bg-theme-card/30" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-theme-primary transition-colors">{task.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-theme-secondary transition-colors">
          <span className="inline-flex items-center gap-1 text-theme-accent transition-colors font-semibold">
            <AlignLeft className="h-3 w-3" />
            {getTaskContentBadgeLabel(task.content)}
          </span>
          {task.dueDate || task.plannedStartAt ? (
            <span className="inline-flex items-center gap-1 rounded border border-theme-accent-sec/20 bg-theme-accent-sec-light px-1.5 text-theme-accent-sec transition-colors font-medium">
              <Calendar className="h-3 w-3" />
              {(task.dueDate || task.plannedStartAt)!.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          ) : (
            <span>暂无日期</span>
          )}
        </div>
      </div>
    </motion.button>
  )
}, (prev, next) => prev.task === next.task)

const PausedTaskRow = memo(function PausedTaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="glass-card flex w-full items-center gap-4 rounded-xl border-l-4 border-l-theme-pause p-4 text-left"
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 border-theme-pause/40 bg-theme-pause-light text-theme-pause">
        <Pause className="h-3 w-3 fill-current" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold text-theme-primary transition-colors">{task.title}</div>
        <div className="mt-1 inline-block rounded border border-theme-pause/20 bg-theme-pause-light/50 px-2 py-0.5 text-xs font-medium text-theme-pause transition-colors">
          暂停原因: {task.activityLogs.find((log) => log.action === 'PAUSED')?.note || '等待恢复'}
        </div>
      </div>
    </motion.button>
  )
}, (prev, next) => prev.task === next.task)

const CompletedTaskRow = memo(function CompletedTaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="glass-card flex w-full items-center gap-4 rounded-xl border-l-4 border-l-theme-accent p-4 text-left"
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 border-theme-accent/40 bg-theme-accent-light text-theme-accent">
        <CheckCircle2 className="h-3 w-3 fill-current" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold text-theme-primary transition-colors">{task.title}</div>
        <div className="mt-1 inline-block rounded border border-theme-accent/20 bg-theme-accent-light/50 px-2 py-0.5 text-xs font-medium text-theme-accent transition-colors">
          完成记录: {task.activityLogs.find((log) => log.action === 'COMPLETED')?.note || '已完成'}
        </div>
      </div>
    </motion.button>
  )
}, (prev, next) => prev.task === next.task)
