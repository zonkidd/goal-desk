import { Trash2, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useGoalStore } from '../../store/goalStore'
import { useUiStore } from '../../store/uiStore'
import { GlassPanel } from '../common/GlassPanel'

export function RecycleBinView() {
  const deletedTasks = useTaskStore((state) => state.deletedTasks)
  const deletedGoals = useGoalStore((state) => state.deletedGoals)
  const loadDeletedTasks = useTaskStore((state) => state.loadDeletedTasks)
  const loadDeletedGoals = useGoalStore((state) => state.loadDeletedGoals)
  const restoreTask = useTaskStore((state) => state.restoreTask)
  const restoreGoal = useGoalStore((state) => state.restoreGoal)
  const openDrawer = useUiStore((state) => state.openDrawer)

  useEffect(() => {
    void loadDeletedTasks()
    void loadDeletedGoals()
  }, [loadDeletedTasks, loadDeletedGoals])

  const formatDate = (date?: Date) => {
    if (!date) return ''
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  return (
    <section id="recycle-bin" className="screen active">
      <div className="mb-8 flex items-end justify-between animate-spring">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">回收站</h1>
          <p className="mt-2 font-medium text-slate-500">已删除的待办和目标，可以随时恢复。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <GlassPanel className="rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">已删除的待办</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">{deletedTasks.length} 个待办在回收站中</p>
            </div>
            <Trash2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {deletedTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex-1 cursor-pointer" onClick={() => openDrawer('task', task.id)}>
                  <div className="text-sm font-bold text-slate-900">{task.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {task.linkedGoalLabel || '独立待办'} · 删除于 {formatDate(task.deletedAt ?? task.activityLogs[0]?.timestamp)}
                  </div>
                </div>
                <button
                  onClick={() => void restoreTask(task.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  恢复
                </button>
              </div>
            ))}
            {deletedTasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-400">
                回收站中没有待办
              </div>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">已删除的目标</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">{deletedGoals.length} 个目标在回收站中</p>
            </div>
            <Trash2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {deletedGoals.map((goal) => (
              <div key={goal.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex-1 cursor-pointer" onClick={() => openDrawer('goal', goal.id)}>
                  <div className="text-sm font-bold text-slate-900">{goal.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {goal.area} · {goal.taskCount} 个关联任务
                  </div>
                </div>
                <button
                  onClick={() => void restoreGoal(goal.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  恢复
                </button>
              </div>
            ))}
            {deletedGoals.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-400">
                回收站中没有目标
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
    </section>
  )
}
