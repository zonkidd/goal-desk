import { Plus, Palette } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import type { ViewKey } from '../../types/app'

const titles: Record<ViewKey, string> = {
  inbox: 'Inbox',
  today: 'Today Workbench',
  board: 'Goal Board',
  goals: 'Goals',
  areas: '领域管理',
  calendar: 'Calendar',
  reminders: 'Reminders',
  'recycle-bin': '回收站',
  'daily-review': '每日复盘',
}

export function TopBar() {
  const currentView = useUiStore((state) => state.currentView)
  const openQuickCapture = useUiStore((state) => state.openQuickCapture)
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/20 bg-theme-panel/30 px-10 backdrop-blur-md transition-colors">
      <h2 className="text-sm font-bold text-theme-primary tracking-wide transition-colors">{titles[currentView]}</h2>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === 'wabi-sabi' ? 'liquid-glass' : 'wabi-sabi')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-theme-card/30 text-theme-primary shadow-sm backdrop-blur-sm transition-all hover:bg-theme-card/60"
          title={`切换主题: 当前为 ${theme === 'wabi-sabi' ? '日式原木' : '液态玻璃'}`}
        >
          <Palette className="h-4 w-4" />
        </button>
        <button
          onClick={openQuickCapture}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-theme-accent px-3 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90"
        >
          <Plus className="h-3 w-3" />
          新建待办
        </button>
      </div>
    </header>
  )
}
