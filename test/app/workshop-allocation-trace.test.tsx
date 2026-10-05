import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import {
  TraceProgressBar,
  TraceStageRow,
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

test('places trace detail headings in the left rail', () => {
  const stage: TraceStageView = {
    id: 'round-1',
    label: 'Runde 1',
    description: 'Erstwünsche',
    fulfilled: 1,
    capacity: 0,
    overlap: 0,
    leader: 0,
    unscheduled: 0,
    open: 0,
    rank: 1,
    detail_groups: [
      {
        id: 'fulfilled',
        heading: 'Erfüllt · 1 Wunsch',
        items: [
          {
            id: 'fulfilled-1',
            person_id: 'alex',
            people: [{ id: 'alex', name: 'Alex Morgan' }],
            text: 'Keramik: Alex Morgan',
            bold_prefix: 'Keramik',
          },
        ],
      },
    ],
  }

  render(
    <table>
      <tbody>
        <TraceStageRow stage={stage} stages={[stage]} index={0} show_detail_rows />
      </tbody>
    </table>,
  )

  const heading = screen.getByRole('rowheader', { name: 'Erfüllt · 1 Wunsch' })
  expect(heading.className).toContain('min-w-52')
  expect(heading.parentElement?.textContent).toContain('Keramik: Alex Morgan')
  const summaryRow = heading.parentElement?.previousElementSibling
  expect(summaryRow?.querySelectorAll('th, td')).toHaveLength(2)
  expect(screen.getByRole('img').className).toContain('h-10')
  expect(screen.getByTitle('1 Wunsch 1').className).toContain('items-center')
  expect(screen.getByTitle('1 Wunsch 1').className).toContain('justify-center')
  expect(screen.queryByRole('heading', { name: 'Erfüllt · 1 Wunsch' })).toBeNull()
})
