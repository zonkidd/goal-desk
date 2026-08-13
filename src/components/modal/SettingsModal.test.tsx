import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsModal } from './SettingsModal'
import { useUiStore } from '../../store/uiStore'

vi.mock('../../lib/workspaceMutations', () => ({
  createWorkspaceMutationAdapter: () => ({
    pickDirectory: vi.fn(),
    exportDatabase: vi.fn(),
    importDatabase: vi.fn(),
  }),
}))

describe('SettingsModal', () => {
  beforeEach(() => {
    useUiStore.setState({
      isSettingsOpen: true,
      theme: 'wabi-sabi',
      errorToast: null,
      backupDirectory: null,
    })
  })

  it('打开设置能看到「外观」并切换主题', async () => {
    const user = userEvent.setup()
    render(<SettingsModal />)

    expect(screen.getByText('外观')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '日式原木' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '液态玻璃' }))

    expect(useUiStore.getState().theme).toBe('liquid-glass')
  })

  it('导入恢复入口仍在设置里', () => {
    render(<SettingsModal />)
    expect(screen.getByText(/导入恢复/)).toBeInTheDocument()
  })
})
