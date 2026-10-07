import { ApplicationFrame } from '../../application/application-frame.js'
import { PrimaryNavigation, SecondaryNavigation } from './navigation.js'
import { LoadingState, ErrorState, EmptyState } from './screen-state.js'
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScreenLayout, ScreenHeader, CollectionSection } from './screen-layout.js'
import { ActionableNotices, ActionableNotice, StatusNotice } from './notice.js'
import { CollectionCreateAction } from './collection-create-action.js'
import { TertiaryNavigation } from './tertiary-navigation.js'
import { StatsStrip } from './stats-strip.js'
import { TextField, SelectField } from './field.js'
import { Button } from './button.js'

const meta = {
  title: 'Shared/Patterns/Screen layout',
  component: ScreenLayout,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ScreenLayout>
export default meta
type Story = StoryObj

function Example() {
  const [view, setView] = useState('buildings')
  const [open, setOpen] = useState(false)
  return (
    <ScreenLayout
      header={<ScreenHeader title="Unterkunft" description="Gebäude, Zimmer und Betten." />}
      notices={
        <ActionableNotices>
          <ActionableNotice
            title="Eine Familie hat noch kein Bett"
            action={<Button variant="neutral">Belegung prüfen</Button>}
          >
            Prüfe die verfügbaren Schlafplätze.
          </ActionableNotice>
        </ActionableNotices>
      }
      workflow={<StatusNotice label="Vorbereitung">Die Unterkunft wird vorbereitet.</StatusNotice>}
      summary={
        <StatsStrip
          items={[
            { value: 2, label: 'Gebäude' },
            { value: 21, label: 'Schlafplätze' },
          ]}
        />
      }
      tertiary_navigation={
        <TertiaryNavigation
          aria_label="Unterkunftsansichten"
          value={view}
          onChange={setView}
          items={[
            { value: 'buildings', label: 'Gebäude' },
            { value: 'notes', label: 'Hinweise' },
          ]}
        />
      }
    >
      {view === 'buildings' ? (
        <CollectionSection
          title="Gebäude"
          action={
            <CollectionCreateAction
              label="Gebäude hinzufügen"
              title="Gebäude hinzufügen"
              open={open}
              on_open_change={setOpen}
              on_submit={(event) => {
                event.preventDefault()
                setOpen(false)
              }}
              submit_label="Gebäude anlegen"
            >
              <TextField label="Name" required />
              <SelectField label="Art">
                <option>Unterkunft</option>
              </SelectField>
            </CollectionCreateAction>
          }
        >
          <CollectionSection
            title="Haupthaus"
            heading_level={3}
            action={<Button>Zimmer hinzufügen</Button>}
          >
            <CollectionSection
              title="Zimmer 101"
              heading_level={4}
              action={<Button>Bett hinzufügen</Button>}
            >
              <p>Zwei Einzelbetten</p>
            </CollectionSection>
          </CollectionSection>
        </CollectionSection>
      ) : (
        <CollectionSection title="Hinweise">
          <p>Hinweise zu dieser Unterkunft.</p>
        </CollectionSection>
      )}
    </ScreenLayout>
  )
}
export const NestedCollections: Story = { render: () => <Example /> }

export const Notices: Story = {
  render: () => (
    <div className="space-y-4">
      <ActionableNotices>
        <ActionableNotice
          title="Drei Familien haben noch kein Zimmer"
          action={<Button variant="neutral">Belegung prüfen</Button>}
        >
          Prüfe die freien Schlafplätze und die Anforderungen.
        </ActionableNotice>
      </ActionableNotices>
      <StatusNotice label="Festgelegt" tone="success">
        Familien sehen das festgelegte Ergebnis.
      </StatusNotice>
    </div>
  ),
}

export const Fields: Story = {
  render: () => (
    <div className="max-w-lg space-y-4">
      <TextField label="Name" hint="Name des Gebäudes" defaultValue="Haupthaus" />
      <TextField label="Name" error="Bitte einen Namen eingeben." />
      <SelectField label="Etage">
        <option>Erdgeschoss</option>
        <option>Obergeschoss</option>
      </SelectField>
    </div>
  ),
}

export const NavigationLevels: Story = {
  render: () => (
    <div className="space-y-4">
      <PrimaryNavigation
        items={[
          { id: 'home', label: 'Dashboard', active: false, link: <a href="#dashboard" /> },
          { id: 'families', label: 'Familien', active: true, link: <a href="#families" /> },
        ]}
      />
      <SecondaryNavigation
        aria_label="Unterbringungsbereiche"
        items={[
          { id: 'inventory', label: 'Unterkunft', active: true, link: <a href="#inventory" /> },
          { id: 'assignment', label: 'Belegung', active: false, link: <a href="#assignment" /> },
        ]}
      />
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div className="space-y-6">
      <LoadingState />
      <ErrorState onRetry={() => {}}>Gespeicherte Angaben bleiben erhalten.</ErrorState>
      <EmptyState title="Noch keine Gebäude">Füge das erste Gebäude hinzu.</EmptyState>
    </div>
  ),
}

export const Frame: Story = {
  render: () => (
    <ApplicationFrame
      brand={
        <a href="#home" className="text-xl font-heading">
          Familienfreizeit
        </a>
      }
    >
      <ScreenLayout header={<ScreenHeader title="Willkommen" />}>
        <p>Inhalt im gemeinsamen Anwendungsrahmen.</p>
      </ScreenLayout>
    </ApplicationFrame>
  ),
}
