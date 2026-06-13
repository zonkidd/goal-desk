import { ArrowRight, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GlassCard } from '../common/GlassCard'
import { useAppStore } from '../../store/appStore'

export function AreasView() {
  const allAreas = useAppStore((state) => state.allAreas)
  const setView = useAppStore((state) => state.setView)
  const setActiveArea = useAppStore((state) => state.setActiveArea)
  const loadAreas = useAppStore((state) => state.loadAreas)
  const createArea = useAppStore((state) => state.createArea)
  const renameArea = useAppStore((state) => state.renameArea)
  const deleteArea = useAppStore((state) => state.deleteArea)

  const [isCreating, setIsCreating] = useState(false)
  const [newAreaTitle, setNewAreaTitle] = useState('')
  const [editModal, setEditModal] = useState<{ areaId: string; currentTitle: string } | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  useEffect(() => {
    void loadAreas()
  }, [loadAreas])

  const handleCreate = async () => {
    if (!newAreaTitle.trim()) return
    const title = newAreaTitle.trim()
    await createArea(title)
    setNewAreaTitle('')
    setIsCreating(false)
    await loadAreas()
  }

  const handleRename = async (areaId: string) => {
    if (!editingTitle.trim()) return
    await renameArea(areaId, editingTitle)
    setEditModal(null)
    setEditingTitle('')
    await loadAreas()
  }

  const handleDelete = async (areaId: string, goalCount: number) => {
    if (goalCount > 0) {
      const confirmed = confirm(
        `此领域有 ${goalCount} 个关联目标。\n\n删除后这些目标将移动到"未分类"领域。\n\n确认删除？`
      )
      if (!confirmed) return
    } else {
      const confirmed = confirm('确认删除此领域？')
      if (!confirmed) return
    }

    await deleteArea(areaId, true)
    await loadAreas()
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">领域管理</h1>
          <p className="mt-1 text-sm text-slate-500">管理目标分类领域</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          新建领域
        </button>
      </header>

      {isCreating && (
        <GlassCard className="mb-4 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newAreaTitle}
              onChange={(e) => setNewAreaTitle(e.target.value)}
              placeholder="输入领域名称"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate()
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewAreaTitle('')
                }
              }}
            />
            <button
              onClick={() => void handleCreate()}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700"
            >
              <Check className="h-4 w-4" />
              创建
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setNewAreaTitle('')
              }}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              取消
            </button>
          </div>
        </GlassCard>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...allAreas].sort((a, b) => {
            if (a.isSystem && !b.isSystem) return -1
            if (!a.isSystem && b.isSystem) return 1
            return a.title.localeCompare(b.title)
          }).map((area) => (
            <div key={area.id} className="group block text-left transition-transform hover:-translate-y-1">
              <GlassCard className={`p-5 transition-all hover:shadow-lg ${area.isSystem ? 'border-2 border-indigo-200 bg-indigo-50/30' : ''}`}>
                <div className="mb-3">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    {area.title}
                    {area.isSystem && (
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        系统
                      </span>
                    )}
                  </h3>
                  <div className="mt-1 flex gap-3 text-xs text-slate-500">
                    <span>{area.goalCount} 个目标</span>
                    <span>{area.activeGoalCount} 个活跃</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                    点击打开这个领域的目标看板
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveArea(area.title)
                      setView('goals')
                    }}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
                  >
                    <ArrowRight className="h-3 w-3" />
                    打开看板
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditModal({ areaId: area.id, currentTitle: area.title })
                      setEditingTitle(area.title)
                    }}
                    disabled={area.isSystem}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      area.isSystem
                        ? 'cursor-not-allowed border-gray-200 text-gray-400 opacity-50'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Pencil className="h-3 w-3" />
                    重命名
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(area.id, area.goalCount)}
                    disabled={area.isSystem}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      area.isSystem
                        ? 'cursor-not-allowed border-gray-200 text-gray-400 opacity-50'
                        : 'border-red-200 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="h-3 w-3" />
                    删除
                  </button>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>

        {allAreas.length === 0 && !isCreating && (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">还没有领域</p>
              <p className="mt-1 text-xs text-slate-400">点击"新建领域"开始创建</p>
            </div>
          </div>
        )}
      </div>

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditModal(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-slate-900">重命名领域</h3>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleRename(editModal.areaId)
                if (e.key === 'Escape') setEditModal(null)
              }}
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => void handleRename(editModal.areaId)} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                保存
              </button>
              <button onClick={() => setEditModal(null)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
