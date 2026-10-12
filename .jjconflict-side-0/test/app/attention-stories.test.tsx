import type { ReactElement } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { FixedDialog } from '../../src/modules/room-assignment/app/components/assignment-board/components.stories.js'
import { BlockedByConflicts } from '../../src/modules/workshop-rankings/app/components/workshop-allocation.stories.js'
afterEach(cleanup)
test('fixed-room preview uses the same world and excludes the family own occupancy', () => {
  const Story = FixedDialog.render as () => ReactElement
  render(<Story />)
  expect(screen.getByRole('link', { name: 'Zimmer 23' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Zimmer 24' })).toBeTruthy()
  expect(screen.getAllByRole('button', { name: 'Zuordnen' })).toHaveLength(2)
  expect(screen.queryByText(/Kein Zimmer hat/)).toBeNull()
})
test('allocation attention preview has canonical world context and renders findings', () => {
  const Story = BlockedByConflicts.render as () => ReactElement
  render(<Story />)
  expect(screen.getByText(/Hinweis/, { selector: 'p' })).toBeTruthy()
  expect(document.querySelectorAll('summary').length).toBeGreaterThan(0)
})
