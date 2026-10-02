import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { TertiaryNavigation } from '../../src/app/components/shared/ui/tertiary-navigation.js'
import { SecondaryNavigation } from '../../src/app/organiser/components/navigation.js'
import { WorkflowStepper } from '../../src/app/components/shared/ui/workflow-stepper.js'
import { organiserPaths } from '../../src/organiser/routes.js'

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

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

test('secondary navigation selects an item for any of its typed active routes', () => {
  window.history.replaceState({}, '', '/workshops/slots')
  render(
    <SecondaryNavigation
      aria_label="Workshopbereiche"
      items={[
        {
          href: organiserPaths.workshops(),
          active_paths: [organiserPaths.workshops()],
          label: 'Workshops',
        },
        {
          href: organiserPaths.workshop_spaces(),
          active_paths: [organiserPaths.workshop_spaces(), organiserPaths.workshop_slots()],
          label: 'Räume und Slots',
        },
      ]}
    />,
  )

  expect(screen.getByRole('link', { name: 'Workshops' }).getAttribute('aria-current')).toBeNull()
  expect(screen.getByRole('link', { name: 'Räume und Slots' }).getAttribute('aria-current')).toBe(
    'page',
  )
})

test('workshop allocation keeps the workshop area active across all three views', () => {
  window.history.replaceState({}, '', '/workshops/allocation/trace')
  render(
    <SecondaryNavigation
      aria_label="Workshopbereiche"
      items={[
        {
          href: organiserPaths.workshops(),
          active_paths: [organiserPaths.workshops()],
          label: 'Workshops',
        },
        {
          href: organiserPaths.workshop_allocation(),
          active_paths: [
            organiserPaths.workshop_allocation(),
            organiserPaths.workshop_allocation_demand(),
            organiserPaths.workshop_allocation_trace(),
          ],
          label: 'Wünsche',
        },
      ]}
    />,
  )

  expect(screen.getByRole('link', { name: 'Wünsche' }).getAttribute('aria-current')).toBe('page')
})
