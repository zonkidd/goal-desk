import {
  Calendar,
  CheckSquare,
  Inbox,
  KanbanSquare,
  PauseCircle,
  Sun,
  Target,
  Trash2,
  Workflow,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { useGoalStore } from "../../store/goalStore";
import { useAreaStore } from "../../store/areaStore";
import { useUiStore } from "../../store/uiStore";
import { useWorkspaceDerived } from "../../hooks/useWorkspaceDerived";
import { EventKitStatusCard } from "./EventKitStatusCard";
import type { ViewKey } from "../../types/app";

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Inbox }> = [
  { key: "inbox", label: "收集箱 / 待办", icon: Inbox },
  { key: "today", label: "今日焦点", icon: Sun },
  { key: "board", label: "目标看板", icon: KanbanSquare },
  { key: "goals", label: "目标", icon: Target },
  { key: "daily-review", label: "每日复盘", icon: BookOpen },
  { key: "calendar", label: "📅 日历看板", icon: Calendar },
  { key: "reminders", label: "⏰ 提醒看板", icon: CheckSquare },
  { key: "recycle-bin", label: "回收站", icon: Trash2 },
];

export function Sidebar() {
  const currentView = useUiStore((state) => state.currentView);
  const activeArea = useUiStore((state) => state.activeArea);
  const allAreas = useAreaStore((state) => state.allAreas);
  const setView = useUiStore((state) => state.setView);
  const setActiveArea = useUiStore((state) => state.setActiveArea);
  const openQuickCapture = useUiStore((state) => state.openQuickCapture);
  const goals = useGoalStore((state) => state.baseGoals);
  const { inbox, today } = useWorkspaceDerived();
  const inboxCount = inbox.activeTasks.length;
  const pausedCount = inbox.pausedTasks.length;

  return (
    <aside className="glass-panel relative z-20 flex h-full w-[260px] shrink-0 flex-col justify-between border-r border-white/15">
      <div className="px-6 pb-4 pt-8">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-theme-accent shadow-sm transition-colors">
            <Workflow className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-theme-primary transition-colors">
            Kairos
          </h1>
        </div>
      </div>

      <nav className="nav-container flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
        <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-theme-secondary transition-colors">
          Tasks
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                "nav-btn flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                active
                  ? "border border-white/10 bg-theme-card text-theme-accent shadow-sm"
                  : "text-theme-secondary hover:bg-theme-card/35 hover:text-theme-primary"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.key === "inbox" && (
                <span className="rounded-full bg-theme-accent-light px-2 py-0.5 text-xs font-bold text-theme-accent transition-colors">
                  {inboxCount}
                </span>
              )}
            </button>
          );
        })}

        <p className="mb-3 mt-8 flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-widest text-theme-secondary transition-colors">
          <span>Areas 领域</span>
          <button
            onClick={() => setView("areas")}
            className="rounded px-2 py-0.5 text-[10px] font-bold text-theme-accent transition-colors hover:bg-theme-accent-light"
          >
            管理
          </button>
        </p>
        <motion.button
          whileHover={{ x: 2 }}
          onClick={() => {
            setActiveArea("ALL");
            setView("goals");
          }}
          className={cn(
            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all hover:bg-theme-card/35",
            activeArea === "ALL"
              ? "bg-theme-card/75 text-theme-accent shadow-sm ring-1 ring-theme-accent/20"
              : "text-theme-secondary"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-theme-secondary transition-colors" /> 全部领域
          </div>
          <span className="text-xs text-theme-secondary transition-colors">{goals.length}</span>
        </motion.button>
        {allAreas.map((area, index) => {
          const swatch =
            index === 0
              ? "bg-theme-accent"
              : index === 1
              ? "bg-theme-accent-sec"
              : "bg-theme-pause";
          const active = activeArea === area.title;
          return (
            <motion.button
              key={area.id}
              whileHover={{ x: 2 }}
              onClick={() => {
                setActiveArea(area.title);
                setView("goals");
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all hover:bg-theme-card/35",
                active
                  ? "bg-theme-card/75 text-theme-accent shadow-sm ring-1 ring-theme-accent/20"
                  : "text-theme-secondary"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${swatch} transition-colors`} />{" "}
                {area.title}
              </div>
            </motion.button>
          );
        })}

        <div className="mt-8 rounded-2xl border border-theme-pause/20 bg-theme-pause-light/35 p-4 shadow-sm backdrop-blur-md transition-colors">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-theme-pause transition-colors">
            <PauseCircle className="h-4 w-4" />
            Paused
          </div>
          <p className="text-sm font-semibold text-theme-secondary transition-colors">
            {pausedCount} 项等待恢复
          </p>
        </div>

        <EventKitStatusCard />
      </nav>

      <button
        onClick={openQuickCapture}
        className="mx-4 mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-theme-card/30 p-4 text-xs font-semibold text-theme-secondary shadow-sm backdrop-blur-md transition-all hover:bg-theme-card/65 hover:text-theme-primary"
      >
        <span>全局速记</span>
        <kbd className="rounded-md border border-white/10 bg-theme-card/45 px-1.5 py-0.5 font-mono text-[10px] text-theme-secondary transition-colors">
          ⌥ Space
        </kbd>
      </button>
    </aside>
  );
}
