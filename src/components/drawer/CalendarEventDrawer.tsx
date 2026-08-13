import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Clock, Tag, X, ExternalLink } from 'lucide-react'
import { findCalendarEventAgendaItem } from '../../lib/eventkitTransform'
import { useUiStore } from '../../store/uiStore'
import { useEventkitStore } from '../../store/eventkitStore'
import { getEventKitAdapter } from '../../lib/workspaceMutations'
import { DrawerSection, DrawerStack, drawerBackdropClassName, drawerBackdropMotion, drawerPaperVariants } from './drawerMotion'

export function CalendarEventDrawer() {
  const calendarEvents = useEventkitStore((state) => state.rawEventKit.calendarEvents)
  const isOpen = useUiStore((state) => state.activeDrawer?.type === 'calendarEvent')
  const eventId = useUiStore((state) => state.activeDrawer?.type === 'calendarEvent' ? state.activeDrawer.id : undefined)
  const onClose = useUiStore((state) => state.closeDrawer)

  const event = findCalendarEventAgendaItem(calendarEvents, eventId)

  if (!event) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close drawer backdrop"
            className={drawerBackdropClassName}
            {...drawerBackdropMotion}
            onClick={onClose}
          />
          <motion.aside
            className="glass-panel fixed bottom-4 right-4 top-4 z-50 flex w-[600px] origin-center flex-col rounded-3xl border border-white bg-white/95 shadow-2xl outline-none"
            variants={drawerPaperVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-slate-100 bg-slate-50/50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-purple-600">
                    CALENDAR EVENT
                  </p>
                  <p className="text-xs text-slate-500">只读 - 请在日历 App 中编辑</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:border-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Content */}
            <DrawerStack className="flex-1 overflow-y-auto">
              <DrawerSection className="p-8">
                <h2 className="mb-6 text-2xl font-black text-slate-900">{event.title}</h2>

                {/* Event Details */}
                <div className="space-y-3">
                  {/* Time */}
                  <div className="glass-card flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-purple-400 mb-1">
                        时间
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {event.timeLabel}
                      </p>
                    </div>
                  </div>

                  {/* Calendar Source */}
                  {event.sourceLabel && (
                    <div className="glass-card flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                      <Tag className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                      <div className="flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                          日历
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {event.sourceLabel}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Location Placeholder - 待后端支持 */}
                  {/*
                  {event.location && (
                    <div className="glass-card flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                      <div className="flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                          地点
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {event.location}
                        </p>
                      </div>
                    </div>
                  )}
                  */}
                </div>

                {/* Info Box */}
                <div className="mt-6 rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
                    <p className="text-xs text-purple-800">
                      此事件来自系统日历。如需修改事件详情、添加地点或备注，请在日历 App 中编辑。
                    </p>
                  </div>
                </div>
              </DrawerSection>

              <DrawerSection className="border-t border-slate-100 bg-slate-50/80 p-8">
                <button
                  type="button"
                   onClick={async () => {
                     if (!eventId) return
                     try {
                       await getEventKitAdapter().openCalendarEvent(eventId)
                     } catch (error) {
                       console.error('Failed to open calendar event:', error)
                     }
                   }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition-colors hover:bg-purple-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  在日历 App 中打开
                </button>
                <p className="mt-3 text-center text-xs text-slate-500">
                  将跳转到系统日历应用查看完整事件详情
                </p>
              </DrawerSection>
            </DrawerStack>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
