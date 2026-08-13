import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuickCaptureForm } from './QuickCaptureForm'

describe('QuickCaptureForm', () => {
  it('submits local capture without offering System Reminder write modes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <QuickCaptureForm
        value="明天下午三点看熊掌记"
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByRole('radio', { name: /系统/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /混合/ })).not.toBeInTheDocument()

    await user.type(screen.getByTestId('quick-capture-input'), '{Enter}')

    expect(onSubmit).toHaveBeenCalledWith()
  })

  it('renders dynamic neon container (TDD)', () => {
    render(<QuickCaptureForm value="" onChange={vi.fn()} onSubmit={vi.fn()} />)
    const container = screen.getByTestId('qc-container')
    expect(container).toBeInTheDocument()
  })
})
