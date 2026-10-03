import { useState, type FormEvent } from 'react'
import { useLocation } from 'wouter'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import type { EventDraft, JsonValue } from '../../../events/types.js'
import { Button } from '../../components/shared/ui/button.js'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/shared/ui/dialog.js'
import { Card, CardContent, CardHeader } from '../../components/shared/ui/card.js'
import { useOrganiser } from '../context.js'
import {
  familyPeople,
  familyStatus,
  findFamily,
  labelBoolean,
  labelValue,
  personName,
} from '../family-data.js'
import { familyTopicLabel, FamilyTopicNavigation } from '../components/family-navigation.js'
import { organiserPaths, type FamilyTopic } from '../../../organiser/routes.js'
import { activeProfile } from '../../../config/index.js'
import { FamilyPreferencesControls } from '../../../modules/family-preferences/app/controls.js'
import { familyPreferencesConfig } from '../../../modules/family-preferences/index.js'
import { OrganiserScreenHeader } from '../components/layout.js'

function eventTime(): string {
  return new Date().toISOString()
}

function labelEvent(
  actor: string,
  familyId: string,
  entityId: string,
  key: string,
  value: JsonValue | null,
): EventDraft {
  return value === null
    ? {
        at: eventTime(),
        actor,
        subject: entityId === familyId ? familyId : entityId,
        type: 'LabelCleared',
        payload: { entity_id: entityId, key, value: null },
      }
    : {
        at: eventTime(),
        actor,
        subject: entityId === familyId ? familyId : entityId,
        type: 'LabelSet',
        payload: { entity_id: entityId, key, value, strength: null, note: null },
      }
}

function FamilyEditDialog({
  family_id: familyId,
  display_name: displayName,
  email,
  actor,
  stage,
}: {
  family_id: string
  display_name: string
  email: string
  actor: string
  stage: (events: readonly EventDraft[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [nextName, setNextName] = useState(displayName)
  const [nextEmail, setNextEmail] = useState(email)
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = nextName.trim()
    const address = nextEmail.trim()
    if (!name) {
      setError('Bitte gib einen Familiennamen ein.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.')
      return
    }
    const events: EventDraft[] = []
    if (name !== displayName) {
      events.push({
        at: eventTime(),
        actor,
        subject: familyId,
        type: 'FamilyDisplayNameChanged',
        payload: {
          family_id: familyId,
          old_display_name: displayName,
          new_display_name: name,
        },
      })
    }
    if (address !== email) {
      events.push({
        at: eventTime(),
        actor,
        subject: familyId,
        type: 'FamilyEmailChanged',
        payload: { family_id: familyId, old_email: email, new_email: address },
      })
    }
    if (events.length) stage(events)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setNextName(displayName)
          setNextEmail(email)
          setError(null)
        }
        setOpen(nextOpen)
      }}
    >
      <DialogTrigger render={<Button type="button">Familie bearbeiten</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Familie bearbeiten</DialogTitle>
          <DialogDescription>
            Ändere den Anzeigenamen oder die E-Mail-Adresse der Familie.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="mt-4 rounded-base border-2 border-border bg-danger p-3">
            {error}
          </p>
        ) : null}
        <form id="family-edit-form" className="mt-5 grid gap-4" onSubmit={submit}>
          <label className="grid gap-1">
            <span className="font-bold">Familienname</span>
            <span className="text-sm text-muted">
              So erscheint die Familie in Listen und Zimmerplänen.
            </span>
            <input
              required
              value={nextName}
              onChange={(event) => setNextName(event.target.value)}
              className="min-h-11 rounded-base border-2 border-border px-3"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-bold">E-Mail</span>
            <input
              required
              type="email"
              value={nextEmail}
              onChange={(event) => setNextEmail(event.target.value)}
              className="min-h-11 rounded-base border-2 border-border px-3"
            />
          </label>
        </form>
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="neutral">
                Abbrechen
              </Button>
            }
          />
          <Button type="submit" form="family-edit-form">
            Änderungen speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FamilyNoteEditor({
  family_id: familyId,
  value,
  actor,
  stage,
}: {
  family_id: string
  value: string
  actor: string
  stage: (events: readonly EventDraft[]) => void
}) {
  const [draft, setDraft] = useState(value)
  const dirty = draft !== value
  return (
    <Card className="bg-secondary-background">
      <CardHeader>
        <h3 className="text-xl">Sonstiges zum Zimmer</h3>
        <p>Alles, was oben nicht vorkommt.</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        <textarea
          aria-label="Sonstiges zum Zimmer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-32 rounded-base border-2 border-border px-3 py-2"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={!dirty}
            onClick={() =>
              stage([labelEvent(actor, familyId, familyId, 'family-note', draft.trim() || null)])
            }
          >
            Speichern
          </Button>
          <Button type="button" variant="neutral" disabled={!dirty} onClick={() => setDraft(value)}>
            Verwerfen
          </Button>
          {dirty ? <span className="text-sm font-bold">Änderungen offen</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function FamilyRoomView({
  family_id: familyId,
  persons,
  world,
  actor,
  stage,
}: {
  family_id: string
  persons: ReturnType<typeof familyPeople>
  world: NonNullable<ReturnType<typeof useOrganiser>['world']>
  actor: string
  stage: (events: readonly EventDraft[]) => void
}) {
  const peopleWithOwnBed = persons.filter((person) => {
    const labels = world.labels_by_entity[person.entity.id] ?? []
    return labelBoolean(labels, 'does-not-need-a-bed') !== true
  })
  const infants = persons.filter((person) => person.role === 'infant')
  const roomNote = labelValue(world.labels_by_entity[familyId] ?? [], 'family-note') ?? ''
  return (
    <div className="space-y-4">
      <FamilyPreferencesControls
        profile={activeProfile}
        family_id={familyId}
        persons={persons.map((person) => person.entity)}
        world={world}
        actor={actor}
        stage={stage}
        section_keys={['room-wishes']}
        trait_keys={['needs-private-sanitary', 'needs-accessible', 'sole-occupancy']}
      />
      <Card className="bg-secondary-background">
        <CardHeader>
          <h3 className="text-xl">Schlafen</h3>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="flex flex-wrap items-baseline gap-2">
            <strong className="text-3xl">{peopleWithOwnBed.length}</strong>
            <span>{peopleWithOwnBed.length === 1 ? 'Schlafplatz' : 'Schlafplätze'} nötig</span>
          </p>
          {infants.length ? (
            infants.map((person) => {
              const labels = world.labels_by_entity[person.entity.id] ?? []
              const withParents = labelBoolean(labels, 'does-not-need-a-bed') === true
              return (
                <label key={person.entity.id} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={withParents}
                    onChange={(event) =>
                      stage([
                        labelEvent(
                          actor,
                          familyId,
                          person.entity.id,
                          'does-not-need-a-bed',
                          event.target.checked,
                        ),
                      ])
                    }
                  />
                  <span>{personName(person)} schläft im Bett der Eltern</span>
                </label>
              )
            })
          ) : (
            <p className="text-sm text-muted">Jede Person braucht einen eigenen Schlafplatz.</p>
          )}
          {infants.length ? (
            <p className="text-sm text-muted">
              Babys im Bett der Eltern brauchen keinen eigenen Schlafplatz.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <FamilyNoteEditor family_id={familyId} value={roomNote} actor={actor} stage={stage} />
    </div>
  )
}

export function FamilyDetail({
  family_id: familyId,
  topic: requestedTopic = 'zimmer',
  person_id: personId,
}: {
  family_id?: string
  topic?: FamilyTopic
  person_id?: string
}) {
  const { state, world, stage } = useOrganiser()
  const [, navigate] = useLocation()
  const family = familyId ? findFamily(world!, familyId) : null
  const topic = requestedTopic

  if (!family || !state.principal_email) return <p role="alert">Diese Familie gibt es nicht.</p>

  const selectedFamilyId = family.family.id
  const labels = world!.labels_by_entity[selectedFamilyId] ?? []
  const displayName = labelValue(labels, 'display-name') ?? selectedFamilyId
  const email = labelValue(labels, 'email') ?? ''
  const people = familyPeople(world!, selectedFamilyId)
  const status = familyStatus(world!, family)
  const sections = familyPreferencesConfig(activeProfile).sections
  const peopleSection = sections.find((section) => section.key === 'people')
  const detailPersonId =
    personId && people.some((person) => person.entity.id === personId) ? personId : undefined

  function changeTopic(next: FamilyTopic) {
    if (next === 'zimmer') {
      void navigate(organiserPaths.family_topic(selectedFamilyId, next))
      return
    }
    const nextPerson = detailPersonId ?? people[0]?.entity.id
    void navigate(
      nextPerson
        ? organiserPaths.family_person_topic(selectedFamilyId, next, nextPerson)
        : organiserPaths.family_topic(selectedFamilyId, next),
    )
  }

  return (
    <div className="space-y-6">
      <OrganiserLink href={organiserPaths.families()} className="inline-block underline">
        ← Familien
      </OrganiserLink>
      <OrganiserScreenHeader
        title={`Familie ${displayName}`}
        actions={
          <FamilyEditDialog
            family_id={selectedFamilyId}
            display_name={displayName}
            email={email}
            actor={state.principal_email}
            stage={stage}
          />
        }
      />
      <p className="-mt-4 text-muted">{email || 'Keine E-Mail'}</p>
      <section aria-label="Familienbereiche" className="space-y-5">
        <FamilyTopicNavigation value={topic} onChange={changeTopic} />
        {status.complete ? (
          <p className="flex items-center gap-2 rounded-base border-2 border-border bg-secondary-background p-3 font-bold">
            <span aria-hidden="true">✓</span> Alles angegeben.
          </p>
        ) : null}
        <div role="tabpanel" aria-label={familyTopicLabel(topic)}>
          {topic === 'zimmer' ? (
            <FamilyRoomView
              family_id={selectedFamilyId}
              persons={people}
              world={world!}
              actor={state.principal_email}
              stage={stage}
            />
          ) : topic === 'personen' && peopleSection ? (
            <FamilyPreferencesControls
              profile={activeProfile}
              family_id={selectedFamilyId}
              persons={family.persons}
              world={world!}
              actor={state.principal_email}
              stage={stage}
              section_keys={[peopleSection.key]}
              person_id={detailPersonId}
            />
          ) : (
            <p className="rounded-base border-2 border-dashed border-muted p-5">
              {topic === 'essen' || topic === 'workshops'
                ? 'Dieser Bereich wird noch aufgebaut.'
                : 'Keine Person ausgewählt.'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
