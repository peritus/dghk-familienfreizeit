import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { TertiaryNavigation } from '../../src/app/components/shared/ui/tertiary-navigation.js'
import { WorkflowStepper } from '../../src/app/components/shared/ui/workflow-stepper.js'

afterEach(cleanup)

test('workflow stepper exposes the current mobile summary and can expand all steps', () => {
  render(
    <WorkflowStepper
      aria_label="Ablauf"
      steps={[
        { id: 'create', label: 'Anlegen', state: 'complete' },
        { id: 'review', label: 'Prüfen', state: 'current' },
        { id: 'fixed', label: 'Festlegen', state: 'upcoming' },
      ]}
    />,
  )

  const toggle = screen.getByRole('button', { name: 'Alle Schritte (2 von 3)' })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(toggle)
  expect(screen.getByRole('button', { name: 'Weniger' }).getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByRole('listitem', { current: 'step' }).textContent).toContain('Prüfen')
})

test('tertiary navigation selects and focuses the next view with arrow keys', () => {
  const onChange = vi.fn()
  render(
    <TertiaryNavigation
      aria_label="Ansichten"
      value="workshops"
      onChange={onChange}
      items={[
        { value: 'workshops', label: 'Workshops' },
        { value: 'leaders', label: 'Leitungen' },
        { value: 'external', label: 'Extern' },
      ]}
    />,
  )

  const current = screen.getByRole('tab', { name: 'Workshops' })
  fireEvent.keyDown(current, { key: 'ArrowRight' })
  expect(onChange).toHaveBeenCalledWith('leaders')
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Leitungen' }))
})
