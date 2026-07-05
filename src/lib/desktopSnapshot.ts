import type { GoalCard } from '../types/app'
import type { Task } from '../types/task'
import type { EventKitSnapshotData } from './eventkitAdapter'
import * as tauriCommands from './tauriCommands'
import { getEventKitAdapter } from './workspaceMutations'

export async function loadDesktopSnapshot(): Promise<{
  rawEventKit: EventKitSnapshotData
  goals: GoalCard[]
  tasks: Task[]
}> {
  const [tasks, goals] = await Promise.all([
    tauriCommands.loadTaskList(),
    tauriCommands.loadGoalList(),
  ])

  const eventkitData = await getEventKitAdapter().loadRawEventKitData()

  return {
    rawEventKit: eventkitData,
    goals,
    tasks,
  }
}
