import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GoalsView } from './GoalsView'
import { useGoalStore } from '../../store/goalStore'
import { useAreaStore } from '../../store/areaStore'
import { useUiStore } from '../../store/uiStore'

vi.mock('../../store/goalStore', () => ({
  useGoalStore: vi.fn(),
}))
vi.mock('../../store/areaStore', () => ({
  useAreaStore: vi.fn(),
}))
vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn(),
}))

describe('GoalsView', () => {
  it('renders SVG Ring Data Visualization for goal progress (TDD)', () => {
    vi.mocked(useGoalStore).mockImplementation((selector) => selector({ baseGoals: [
      { id: 'goal-1', title: 'Goal 1', status: 'ACTIVE', progress: 75, area: 'Work', taskCount: 4, nextTodo: '' }
    ], createGoal: vi.fn() } as any))
    
    vi.mocked(useAreaStore).mockImplementation((selector) => selector({ allAreas: [
      { id: 'area-1', title: 'Work', isSystem: false }
    ], createArea: vi.fn() } as any))
    
    vi.mocked(useUiStore).mockImplementation((selector) => selector({ activeArea: 'ALL', setActiveArea: vi.fn(), openDrawer: vi.fn() } as any))

    render(<GoalsView />)
    
    const ring = screen.getByTestId('svg-progress-ring')
    expect(ring).toBeInTheDocument()
    expect(ring.tagName.toLowerCase()).toBe('svg')
  })
})
