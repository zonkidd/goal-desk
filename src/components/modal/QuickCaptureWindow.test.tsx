import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../lib/tauriCommands', () => ({
  captureTask: vi.fn(),
  createSystemReminder: vi.fn(),
}))

vi.mock('../../lib/runtime', () => ({
  hideCurrentWindow: vi.fn(),
}))

import { QuickCaptureWindow } from './QuickCaptureWindow'

describe('QuickCaptureWindow', () => {
  it('should render close control', () => {
    render(<QuickCaptureWindow />)
    expect(screen.getByRole('button', { name: /close quick capture/i })).toBeInTheDocument()
  })
})
