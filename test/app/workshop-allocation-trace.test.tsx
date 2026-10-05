import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import {
  TraceProgressBar,
  type TraceStageView,
} from '../../src/modules/workshop-rankings/app/components/choices.js'

afterEach(cleanup)

test('carries only fulfilled placements into the next trace round', () => {
  const stages: readonly TraceStageView[] = [
    {
      id: 'round-1',
      label: 'Runde 1',
      description: 'Erstwünsche',
      fulfilled: 78,
      capacity: 28,
      overlap: 0,
      leader: 5,
      unscheduled: 14,
      open: 0,
      rank: 1,
    },
    {
      id: 'round-2',
      label: 'Runde 2',
      description: 'Zweitwünsche',
      fulfilled: 38,
      capacity: 33,
      overlap: 4,
      leader: 5,
      unscheduled: 45,
      open: 125,
      rank: 2,
    },
  ]

  render(<TraceProgressBar stages={stages} index={1} />)

  expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
    'Runde 2: 78 Wunsch 1, 38 Wunsch 2, 33 voll, 4 Überschneidung, 5 leitet selbst, 45 ohne Termin, 125 noch offen',
  )
})
