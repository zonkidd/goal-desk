import type { AccessStatus, IntegrationStatus } from '../types/app'

const READ_ONLY_REASON = 'System Reminders are edited in Apple Reminders.'

export interface SystemReminderCapabilities {
  canEditInKairos: false
  canOpenExternal: boolean
  canToggleDone: boolean
  readOnlyReason: string
  unavailableReason?: string
}

function reminderUnavailableReason(status: AccessStatus): string | undefined {
  if (status === 'granted') return undefined
  if (status === 'denied') return 'Reminder access is denied.'
  if (status === 'restricted') return 'Reminder access is restricted.'
  if (status === 'not_determined') return 'Reminder access has not been requested.'
  return 'Reminder access is unavailable.'
}

export function getSystemReminderCapabilities(
  integrationStatus: IntegrationStatus,
): SystemReminderCapabilities {
  const unavailableReason = reminderUnavailableReason(integrationStatus.reminders)
  const canUseSystemReminder = !unavailableReason

  return {
    canEditInKairos: false,
    canOpenExternal: canUseSystemReminder,
    canToggleDone: false,
    readOnlyReason: READ_ONLY_REASON,
    unavailableReason,
  }
}
