import { ApplicationFrame } from '../../src/app/components/application/application-frame.js'
import { FixtureProvider } from '../../src/app/stories/organiser-fixtures.js'
import { AccommodationWorkflow } from '../../src/app/organiser/components/accommodation-workflow.js'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import {
  CollectionSection,
  ScreenHeader,
  ScreenLayout,
} from '../../src/app/components/shared/ui/screen-layout.js'
import { ActionableNotice, ActionableNotices } from '../../src/app/components/shared/ui/notice.js'
import { TertiaryNavigation } from '../../src/app/components/shared/ui/tertiary-navigation.js'
import { TextField, TextareaField } from '../../src/app/components/shared/ui/field.js'
import { PrintFooter } from '../../src/app/components/shared/ui/print-layout.js'

afterEach(cleanup)

test('screen-wide findings remain mounted above tabs while collection actions change scope', () => {
  function Example() {
    const [view, setView] = useState('workshops')
    return (
      <ScreenLayout
        header={<ScreenHeader title="Workshopübersicht" />}
        notices={
          <ActionableNotices>
            <ActionableNotice title="Leitung fehlt" action={<button>Prüfen</button>} />
          </ActionableNotices>
        }
        tertiary_navigation={
          <TertiaryNavigation
            aria_label="Workshopansichten"
            value={view}
            onChange={setView}
            items={[
              { value: 'workshops', label: 'Workshops' },
              { value: 'leaders', label: 'Leitungen' },
            ]}
          />
        }
      >
        <CollectionSection
          title={view === 'workshops' ? 'Aktive Workshops' : 'Interne Leitungen'}
          action={view === 'workshops' ? <button>Workshop hinzufügen</button> : undefined}
        >
          <p>Inhalt</p>
        </CollectionSection>
      </ScreenLayout>
    )
  }
  render(<Example />)
  const notice = screen.getByRole('note')
  expect(
    notice.compareDocumentPosition(screen.getByRole('tablist')) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  expect(
    within(screen.getByRole('region', { name: 'Aktive Workshops' })).getByRole('button', {
      name: 'Workshop hinzufügen',
    }),
  ).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', { name: 'Leitungen' }))
  expect(screen.getByRole('note')).toBe(notice)
  expect(screen.queryByRole('button', { name: 'Workshop hinzufügen' })).toBeNull()
  expect(screen.getByRole('region', { name: 'Interne Leitungen' })).toBeTruthy()
})

test('nested collections keep distinct accessible names and heading levels', () => {
  render(
    <CollectionSection title="Gebäude">
      <CollectionSection title="Haupthaus" heading_level={3}>
        <CollectionSection title="Zimmer 101" heading_level={4}>
          <p>Betten</p>
        </CollectionSection>
      </CollectionSection>
    </CollectionSection>,
  )
  expect(screen.getByRole('heading', { name: 'Gebäude', level: 2 })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Haupthaus', level: 3 })).toBeTruthy()
  expect(screen.getByRole('region', { name: 'Zimmer 101' })).toBeTruthy()
})

test('repeated field labels receive distinct ids and connected hints and validation', () => {
  render(
    <>
      <TextField label="Name" hint="Gebäudename" />
      <TextField label="Name" error="Bitte ausfüllen" />
    </>,
  )
  const fields = screen.getAllByRole('textbox', { name: 'Name' })
  expect(fields[0]?.id).not.toBe(fields[1]?.id)
  expect(document.getElementById(fields[0]!.getAttribute('aria-describedby')!)?.textContent).toBe(
    'Gebäudename',
  )
  expect(fields[1]?.getAttribute('aria-invalid')).toBe('true')
  expect(document.getElementById(fields[1]!.getAttribute('aria-describedby')!)?.textContent).toBe(
    'Bitte ausfüllen',
  )
})

test('print values follow unsaved input without changing the domain handler', () => {
  let changed = ''
  const { container, rerender } = render(
    <TextareaField
      label="Hinweise"
      defaultValue="Erste Zeile"
      onChange={(event) => {
        changed = event.currentTarget.value
      }}
    />,
  )
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mehrere\nZeilen' } })
  expect(changed).toBe('Mehrere\nZeilen')
  expect(container.querySelector('[data-print-value]')?.getAttribute('data-print-value')).toBe(
    changed,
  )
  rerender(<TextareaField label="Hinweise" value="Gespeicherter Wert" readOnly />)
  expect(container.querySelector('[data-print-value]')?.getAttribute('data-print-value')).toBe(
    'Gespeicherter Wert',
  )
})

test('print footer reports data status and refreshes for browser printing', () => {
  render(
    <PrintFooter
      revision={42}
      drafts={1}
      closed_at="2027-04-15T08:00:00Z"
      generated_at={new Date('2027-04-16T08:00:00Z')}
      confidentiality="Nur für Leitungen"
    />,
  )
  fireEvent(window, new Event('beforeprint'))
  const footer = document.querySelector('[data-slot="print-footer"]')!
  expect(footer.textContent).toContain('Datenstand v42')
  expect(footer.textContent).toContain('mit ungespeicherten Änderungen')
  expect(footer.textContent).toContain('Festgelegt am 15. April 2027')
  expect(footer.textContent).toContain('Stand 16. April 2027')
  expect(footer.textContent).toContain('Nur für Leitungen')
})

test('shared accommodation status keeps closing actions opt-in for editing routes', () => {
  const { rerender } = render(
    <FixtureProvider>
      <AccommodationWorkflow />
    </FixtureProvider>,
  )
  expect(screen.queryByRole('button', { name: 'Festlegen' })).toBeNull()
  rerender(
    <FixtureProvider>
      <AccommodationWorkflow actions />
    </FixtureProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Alle Schritte' }))
  expect(screen.getByRole('button', { name: 'Festlegen' })).toBeTruthy()
})

test('section navigation belongs to the frame band and disappears with its screen', () => {
  const { rerender } = render(
    <ApplicationFrame brand="Veranstaltung">
      <ScreenLayout
        header={<ScreenHeader title="Workshops" />}
        secondary_navigation={<nav aria-label="Workshopbereiche">Übersicht</nav>}
      >
        <p>Workshopliste</p>
      </ScreenLayout>
    </ApplicationFrame>,
  )
  const navigation = screen.getByRole('navigation', { name: 'Workshopbereiche' })
  expect(navigation.closest('[data-slot="application-section-band"]')).toBeTruthy()
  expect(screen.getByRole('main').contains(navigation)).toBe(false)
  rerender(
    <ApplicationFrame brand="Veranstaltung">
      <ScreenLayout header={<ScreenHeader title="Familien" />} />
    </ApplicationFrame>,
  )
  expect(screen.queryByRole('navigation', { name: 'Workshopbereiche' })).toBeNull()
})
