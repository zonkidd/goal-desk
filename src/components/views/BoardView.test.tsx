import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BoardView } from './BoardView'
import { useTaskStore } from '../../store/taskStore'
import { useGoalStore } from '../../store/goalStore'
import { useUiStore } from '../../store/uiStore'

vi.mock('../../store/taskStore', () => ({
  useTaskStore: vi.fn(),
}))
vi.mock('../../store/goalStore', () => ({
  useGoalStore: vi.fn(),
}))
vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => {
      const { whileHover, layout, layoutId, drag, dragConstraints, ...rest } = props;
      return <button {...rest} data-layout={layout ? "true" : undefined} data-layoutid={layoutId} data-drag={drag}>{children}</button>
    }
  }
}))

describe('BoardView', () => {
  it('renders cards with framer-motion layout properties for drag animations (TDD)', () => {
    vi.mocked(useTaskStore).mockImplementation((selector) => selector({ tasks: [{ id: 'task-1', title: 'Task 1', status: 'TODO' }] } as any))
    vi.mocked(useGoalStore).mockImplementation((selector) => selector({ baseGoals: [] } as any))
    vi.mocked(useUiStore).mockImplementation((selector) => selector({ activeArea: 'ALL', openDrawer: vi.fn() } as any))

    render(<BoardView />)
    const card = screen.getByRole('button', { name: /Task 1/i })
    expect(card).toHaveAttribute('data-layout', 'true')
    expect(card).toHaveAttribute('data-layoutid', 'board-card-task-1')
  })
})
