import { describe, expect, it } from 'vitest'
import { getSystemReminderCapabilities } from './reminderCapabilityPolicy'
import type { IntegrationStatus } from '../types/app'

const grantedStatus: IntegrationStatus = {
  calendar: 'granted',
  reminders: 'granted',
}

const deniedStatus: IntegrationStatus = {
  calendar: 'granted',
  reminders: 'denied',
}

describe('getSystemReminderCapabilities', () => {
  it('keeps imported Reminders read-only in Kairos while gating external actions by Reminder access', () => {
    expect(getSystemReminderCapabilities(grantedStatus)).toEqual({
      canEditInKairos: false,
      canOpenExternal: true,
      canToggleDone: false,
      readOnlyReason: 'System Reminders are edited in Apple Reminders.',
      unavailableReason: undefined,
    })

    expect(getSystemReminderCapabilities(deniedStatus)).toEqual({
      canEditInKairos: false,
      canOpenExternal: false,
      canToggleDone: false,
      readOnlyReason: 'System Reminders are edited in Apple Reminders.',
      unavailableReason: 'Reminder access is denied.',
    })
  })
})
