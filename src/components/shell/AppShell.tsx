import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { InboxView } from '../views/InboxView'
import { TodayView } from '../views/TodayView'
import { BoardView } from '../views/BoardView'
import { GoalsView } from '../views/GoalsView'
import { AreasView } from '../views/AreasView'
import { CalendarView } from '../views/CalendarView'
import { RemindersView } from '../views/RemindersView'
import { RecycleBinView } from '../views/RecycleBinView'
import { DailyReviewView } from '../views/DailyReviewView'
import { TaskDrawer } from '../drawer/TaskDrawer'
import { GoalDrawer } from '../drawer/GoalDrawer'
import { CalendarEventDrawer } from '../drawer/CalendarEventDrawer'
import { SystemReminderDrawer } from '../drawer/SystemReminderDrawer'
import { QuickCaptureModal } from '../modal/QuickCaptureModal'
import { SettingsModal } from '../modal/SettingsModal'
import { startWindowDrag } from '../../lib/runtime'
import { useUiStore } from '../../store/uiStore'

export function AppShell() {
  const currentView = useUiStore((state) => state.currentView)
  const errorToast = useUiStore((state) => state.errorToast)
  const dismissErrorToast = useUiStore((state) => state.dismissErrorToast)

  return (
    <main className="relative flex h-full overflow-hidden overscroll-none select-none bg-theme-bg/40 backdrop-blur-3xl text-theme-primary transition-colors">
      <div
        data-testid="window-drag-region"
        data-tauri-drag-region
        onPointerDown={(event) => {
          if (event.button === 0) startWindowDrag()
        }}
        className="absolute inset-x-0 top-0 z-30 h-8"
      />
      <Sidebar />

      <section className="relative flex flex-1 flex-col overflow-y-auto overscroll-none">
        <div className="h-8 shrink-0" />
        <div className="mx-auto w-full max-w-7xl p-10 pt-7">
          {currentView === 'inbox' && <InboxView />}
          {currentView === 'today' && <TodayView />}
          {currentView === 'board' && <BoardView />}
          {currentView === 'goals' && <GoalsView />}
          {currentView === 'daily-review' && <DailyReviewView />}
          {currentView === 'areas' && <AreasView />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'reminders' && <RemindersView />}
          {currentView === 'recycle-bin' && <RecycleBinView />}
        </div>
      </section>

      {errorToast ? (
        <div
          role="alert"
          className="pointer-events-auto fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-theme-card bg-theme-card px-4 py-3 text-sm text-theme-primary shadow-lg"
        >
          <p className="flex-1 leading-5">{errorToast}</p>
          <button
            type="button"
            aria-label="关闭通知"
            onClick={dismissErrorToast}
            className="shrink-0 rounded-lg p-1 text-theme-secondary transition-colors hover:bg-theme-card/60 hover:text-theme-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <TaskDrawer />
      <GoalDrawer />
      <CalendarEventDrawer />
      <SystemReminderDrawer />
      <QuickCaptureModal />
      <SettingsModal />
    </main>
  )
}
