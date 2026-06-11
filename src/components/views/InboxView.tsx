import { AlignLeft, Pause, PauseCircle, PlusCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassPanel } from '../common/GlassPanel'
import { useAppStore } from '../../store/appStore'
import { getTaskContentBadgeLabel } from '../../lib/taskPresentation'
import type { Task } from '../../types/task'

function sortByRecent(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const aTime = Math.max(...a.activityLogs.map((log) => log.timestamp.getTime()), 0)
    const bTime = Math.max(...b.activityLogs.map((log) => log.timestamp.getTime()), 0)
    return bTime - aTime
  })
}

export function InboxView() {
  const tasks = useAppStore((state) => state.tasks)
  const goals = useAppStore((state) => state.baseGoals)
  const activeArea = useAppStore((state) => state.activeArea)
  const openTaskDrawer = useAppStore((state) => state.openTaskDrawer)
  const addTask = useAppStore((state) => state.addTask)
  const visibleTasks =
    activeArea === 'ALL' ? tasks : tasks.filter((task) => task.linkedGoalId && goals.some((goal) => goal.id === task.linkedGoalId && goal.area === activeArea))

  const activeTasks = sortByRecent(visibleTasks.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS'))
  const pausedTasks = sortByRecent(visibleTasks.filter((task) => task.status === 'PAUSED'))

  return (
    <section id="inbox" className="screen active">
      <div className="mb-8 flex items-end justify-between animate-spring">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">收集箱</h1>
          <p className="mt-2 font-medium text-slate-500">所有未归类、进行中、或被暂停的待办事项。</p>
        </div>
      </div>

      <GlassPanel className="rounded-3xl p-8">
        <QuickInboxInput onSubmit={addTask} />

        <div className="space-y-8">
          <div>
            <h3 className="mb-4 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Recently Added & Todo</h3>
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <motion.button
                  key={task.id}
                  whileHover={{ y: -2 }}
                  onClick={() => openTaskDrawer(task.id)}
                  className="glass-card flex w-full items-center gap-4 rounded-xl p-4 text-left hover:border-indigo-300"
                >
                  <div className="h-5 w-5 shrink-0 rounded-[6px] border-2 border-slate-300 bg-white" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800">{task.title}</div>
                    <div className="mt-1 flex gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-indigo-600">
                        <AlignLeft className="h-3 w-3" />
                        {getTaskContentBadgeLabel(task.content)}
                      </span>
                      <span>{task.dueDate ? task.dueDate.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'No date'}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-widest text-amber-500">
              <PauseCircle className="h-4 w-4" />
              Paused (已暂停)
            </h3>
            <div className="space-y-2 opacity-80">
              {pausedTasks.map((task) => (
                <motion.button
                  key={task.id}
                  whileHover={{ y: -2 }}
                  onClick={() => openTaskDrawer(task.id)}
                  className="glass-card flex w-full items-center gap-4 rounded-xl border-l-4 border-l-amber-400 p-4 text-left"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 border-amber-300 bg-amber-50 text-amber-500">
                    <Pause className="h-3 w-3 fill-current" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-700">{task.title}</div>
                    <div className="mt-1 inline-block rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                      暂停原因: {task.activityLogs.find((log) => log.action === 'PAUSED')?.note || '等待恢复'}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
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
        className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            void onSubmit((event.target as HTMLInputElement).value)
            ;(event.target as HTMLInputElement).value = ''
          }
        }}
      />
      <PlusCircle className="absolute left-4 top-4 h-6 w-6 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
    </div>
  )
}
