import { Plus } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

const titles = {
  inbox: 'Inbox',
  today: 'Today Workbench',
  board: 'Goal Board',
  goals: 'Goals',
  areas: '领域管理',
  calendar: 'Calendar',
  reminders: 'Reminders',
}

export function TopBar() {
  const currentView = useAppStore((state) => state.currentView)
  const openQuickCapture = useAppStore((state) => state.openQuickCapture)

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/40 bg-white/30 px-10 backdrop-blur-md">
      <h2 className="text-sm font-bold text-slate-700">{titles[currentView]}</h2>
      <button
        onClick={openQuickCapture}
        className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
      >
        <Plus className="h-3 w-3" />
        新建待办
      </button>
    </header>
  )
}
