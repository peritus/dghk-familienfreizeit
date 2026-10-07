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
import { TextField } from '../../src/app/components/shared/ui/field.js'

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
