import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { InboxView } from '../views/InboxView'
import { TodayView } from '../views/TodayView'
import { BoardView } from '../views/BoardView'
import { GoalsView } from '../views/GoalsView'
import { AreasView } from '../views/AreasView'
import { CalendarView } from '../views/CalendarView'
import { RemindersView } from '../views/RemindersView'
import { TaskDrawer } from '../drawer/TaskDrawer'
import { GoalDrawer } from '../drawer/GoalDrawer'
import { ReminderDrawer } from '../drawer/ReminderDrawer'
import { CalendarEventDrawer } from '../drawer/CalendarEventDrawer'
import { SystemReminderDrawer } from '../drawer/SystemReminderDrawer'
import { QuickCaptureModal } from '../modal/QuickCaptureModal'
import { isTauriRuntime } from '../../lib/runtime'
import { useUiStore } from '../../store/uiStore'

export function AppShell() {
  const currentView = useUiStore((state) => state.currentView)
  const statusMessage = useUiStore((state) => state.statusMessage)
  const isLoading = useUiStore((state) => state.isLoading)

  return (
    <main className="mesh-bg relative flex h-screen overflow-hidden select-none text-slate-800">
      <Sidebar />

      <section className="relative flex flex-1 flex-col overflow-y-auto">
        <TopBar />
        <div className="mx-auto w-full max-w-7xl p-10">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              {isLoading ? 'Syncing workspace' : statusMessage}
            </p>
            {!isLoading && !isTauriRuntime() && (
              <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                Preview mode only. Actions update in-memory demo data.
              </p>
            )}
          </div>

          {currentView === 'inbox' && <InboxView />}
          {currentView === 'today' && <TodayView />}
          {currentView === 'board' && <BoardView />}
          {currentView === 'goals' && <GoalsView />}
          {currentView === 'areas' && <AreasView />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'reminders' && <RemindersView />}
        </div>
      </section>

      <TaskDrawer />
      <GoalDrawer />
      <ReminderDrawer />
      <CalendarEventDrawer />
      <SystemReminderDrawer />
      <QuickCaptureModal />
    </main>
  )
}
