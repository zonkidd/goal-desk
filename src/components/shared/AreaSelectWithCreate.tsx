import { useState } from 'react'
import type { AreaWithStats } from '../../types/app'

interface AreaSelectWithCreateProps {
  value: string
  areas: AreaWithStats[]
  onChange: (value: string) => void
  onCreateArea: (title: string) => Promise<void>
  placeholder?: string
  className?: string
}

export function AreaSelectWithCreate({ value, areas, onChange, onCreateArea, placeholder, className }: AreaSelectWithCreateProps) {
  const [showModal, setShowModal] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [localAreas, setLocalAreas] = useState<AreaWithStats[]>([])

  const mergedAreas = [...areas, ...localAreas.filter((la) => !areas.some((a) => a.id === la.id))]

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value
    if (selected === '__create_new__') {
      setShowModal(true)
      setNewAreaName('')
    } else {
      onChange(selected)
    }
  }

  const handleCreate = async () => {
    const trimmed = newAreaName.trim()
    if (!trimmed) return

    await onCreateArea(trimmed)
    setLocalAreas((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, title: trimmed, goalCount: 0, activeGoalCount: 0, isSystem: false },
    ])
    onChange(trimmed)
    setShowModal(false)
    setNewAreaName('')
  }

  return (
    <>
      <select value={value} onChange={handleSelectChange} className={className}>
        <option value="">{placeholder || '选择领域'}</option>
        {mergedAreas.map((area) => (
          <option key={area.id} value={area.title}>
            {area.title} ({area.goalCount})
          </option>
        ))}
        <option value="__create_new__">+ 创建新领域</option>
      </select>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-slate-900">创建新领域</h3>
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="输入领域名称"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate()
                if (e.key === 'Escape') setShowModal(false)
              }}
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => void handleCreate()} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                创建
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
