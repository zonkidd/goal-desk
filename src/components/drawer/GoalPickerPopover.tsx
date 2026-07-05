import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { AreaSelectWithCreate } from '../shared/AreaSelectWithCreate'

export function GoalPickerPopover({
  draft,
  goals,
  editingSession,
  createArea,
  onClose,
}: {
  draft: {
    linkedGoalIdDraft: string
    isCreatingGoalInline: boolean
    newGoalTitle: string
    newGoalArea: string
    allAreas: Array<{ id: string; title: string; goalCount: number; activeGoalCount: number; isSystem: boolean }>
  }
  goals: Array<{ id: string; title: string; area: string }>
  editingSession: {
    actions: {
      unlinkGoal: () => Promise<void>
      linkGoal: (goalId: string) => Promise<void>
      startInlineGoalCreation: () => void
      cancelInlineGoalCreation: () => void
      setNewGoalTitle: (value: string) => void
      setNewGoalArea: (value: string) => void
      createAndLinkGoal: () => Promise<string | undefined>
    }
  }
  createArea: (title: string) => Promise<void>
  onClose: () => void
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close goal picker"
        onPointerDown={onClose}
        className="fixed inset-0 z-[70] cursor-default bg-transparent"
      />
      <motion.div
        data-goal-picker-panel
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="absolute left-0 top-full z-[80] mt-3 w-[330px] rounded-3xl border border-white/80 bg-white/90 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-md"
      >
        <div className="mb-3 px-1">
          <div className="text-xs font-black text-slate-800">选择所属目标</div>
          <div className="mt-1 text-[10px] font-semibold text-slate-500 leading-normal">
            先从现有 Goal 中选择；如果没有合适的，再新建并关联。
          </div>
        </div>
        <div className="max-h-[220px] space-y-1.5 overflow-y-auto">
          <button
            type="button"
            aria-label="Unlinked task"
            onClick={() => void editingSession.actions.unlinkGoal()}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
              !draft.linkedGoalIdDraft
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span>不关联</span>
          </button>
          {goals.map((goal) => {
            const isActive = goal.id === draft.linkedGoalIdDraft
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => void editingSession.actions.linkGoal(goal.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="truncate">{goal.title}</span>
                <span className={`ml-3 shrink-0 text-[10px] font-bold ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>{goal.area}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 border-t border-white/70 pt-3">
          {draft.isCreatingGoalInline ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={draft.newGoalTitle}
                onChange={(event) => editingSession.actions.setNewGoalTitle(event.target.value)}
                placeholder="新 Goal 标题"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white/80 px-3 text-xs outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
              <AreaSelectWithCreate
                value={draft.newGoalArea}
                areas={draft.allAreas}
                onChange={(value) => editingSession.actions.setNewGoalArea(value)}
                onCreateArea={createArea}
                placeholder="Area（可选）"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white/80 px-3 text-xs outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void editingSession.actions.createAndLinkGoal()}
                  className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                >
                  创建
                </button>
                <button
                  type="button"
                  onClick={() => editingSession.actions.cancelInlineGoalCreation()}
                  className="rounded-lg border border-slate-200 bg-white/70 px-3 text-xs font-bold text-slate-500"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              aria-label="新建并关联 Goal"
              onClick={() => editingSession.actions.startInlineGoalCreation()}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              新建并关联
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}
