import { useState, type FormEvent } from 'react'
import { useLocation } from 'wouter'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import type { World } from '../../../events/fold.js'
import type { EventDraft, JsonValue } from '../../../events/types.js'
import { Button } from '../../components/shared/ui/button.js'
import { SegmentedControl } from '../../components/shared/ui/segmented-control.js'
import { DestructiveActionDialog } from '../../components/shared/ui/destructive-action-dialog.js'
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
  personAge,
  personName,
} from '../family-data.js'
import { familyTopicLabel, FamilyTopicNavigation } from '../components/family-navigation.js'
import { organiserPaths, type FamilyTopic } from '../../../organiser/routes.js'
import { activeProfile } from '../../../config/index.js'
import { FamilyPreferencesControls } from '../../../modules/family-preferences/app/controls.js'
import { OrganiserScreenHeader } from '../components/layout.js'
import { CollectionCreateAction } from '../components/collection-create-action.js'

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
  world: World
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

function makePersonId(givenName: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `per_${random.replaceAll('-', '').slice(0, 16)}_${givenName.toLowerCase()}`
}

const personRoleOptions = [
  { value: 'adult', label: 'Erwachsene(r)' },
  { value: 'child', label: 'Kind' },
  { value: 'infant', label: 'Baby' },
] as const

export function FamilyPersonSidebar({
  family_id: familyId,
  topic,
  persons,
  selected_person_id: selectedPersonId,
  on_select: onSelect,
  adding,
  on_add_change: onAddChange,
  actor,
  stage,
}: {
  family_id: string
  topic: Exclude<FamilyTopic, 'zimmer'>
  persons: ReturnType<typeof familyPeople>
  selected_person_id?: string
  on_select: (personId: string) => void
  adding: boolean
  on_add_change: (open: boolean) => void
  actor: string
  stage: (events: readonly EventDraft[]) => void
}) {
  const [, navigate] = useLocation()
  return (
    <aside className="grid content-start gap-3" aria-label="Person auswählen">
      {persons.length ? (
        <div
          role="tablist"
          aria-label="Person auswählen"
          aria-orientation="vertical"
          className="grid gap-2"
        >
          {persons.map((person) => {
            const age = personAge(person.birthdate)
            const selected = person.entity.id === selectedPersonId
            return (
              <button
                key={person.entity.id}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  onSelect(person.entity.id)
                  void navigate(
                    organiserPaths.family_person_topic(familyId, topic, person.entity.id),
                  )
                }}
                className={`grid min-h-16 w-full justify-items-start gap-1 rounded-base border-2 border-border px-3 py-2 text-left ${selected ? 'bg-foreground text-background shadow-shadow' : 'bg-secondary-background hover:bg-main'}`}
              >
                <span className="font-bold">{personName(person) || person.entity.id}</span>
                <span className={`text-sm ${selected ? 'text-background' : 'text-muted'}`}>
                  {person.role === 'adult'
                    ? 'Erwachsene(r)'
                    : person.role === 'infant'
                      ? 'Baby'
                      : age === null
                        ? 'Kind · Alter fehlt'
                        : `Kind · ${age} ${age === 1 ? 'Jahr' : 'Jahre'}`}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="rounded-base border-2 border-dashed border-muted p-3">
          Noch niemand eingetragen.
        </p>
      )}
      <CollectionCreateAction
        label="Person hinzufügen"
        title="Person hinzufügen"
        description="Lege eine Person in dieser Familie an."
        open={adding}
        on_open_change={onAddChange}
      >
        <PersonForm
          family_id={familyId}
          actor={actor}
          stage={stage}
          on_done={() => onAddChange(false)}
          is_new
        />
      </CollectionCreateAction>
    </aside>
  )
}

function PersonForm({
  family_id: familyId,
  person,
  actor,
  stage,
  on_done: onDone,
  is_new: isNew = false,
}: {
  family_id: string
  person?: ReturnType<typeof familyPeople>[number]
  actor: string
  stage: (events: readonly EventDraft[]) => void
  on_done: () => void
  is_new?: boolean
}) {
  const [givenName, setGivenName] = useState(person?.given_name ?? '')
  const [familyName, setFamilyName] = useState(person?.family_name ?? '')
  const [role, setRole] = useState(person?.role ?? 'adult')
  const [birthdate, setBirthdate] = useState(person?.birthdate ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const given = givenName.trim()
    const family = familyName.trim()
    if (!given || !family) {
      setError('Bitte gib Vor- und Nachnamen ein.')
      return
    }
    const nextBirthdate =
      role === 'adult' || role === 'infant' ? birthdate || null : birthdate || null
    if (isNew) {
      stage([
        {
          at: eventTime(),
          actor,
          subject: familyId,
          type: 'PersonAdded',
          payload: {
            person_id: makePersonId(given),
            family_id: familyId,
            given_name: given,
            family_name: family,
            birthdate: nextBirthdate,
            role,
          },
        },
      ])
    } else if (person) {
      stage([
        {
          at: eventTime(),
          actor,
          subject: familyId,
          type: 'PersonUpdated',
          payload: {
            person_id: person.entity.id,
            family_id: familyId,
            given_name: given,
            family_name: family,
            birthdate: nextBirthdate,
            role,
          },
        },
      ])
    }
    onDone()
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {error ? <p role="alert">{error}</p> : null}
      <SegmentedControl
        label="Altersgruppe"
        value={role}
        onChange={setRole}
        options={personRoleOptions}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="font-bold">Vorname</span>
          <input
            required
            value={givenName}
            onChange={(event) => setGivenName(event.target.value)}
            className="min-h-11 rounded-base border-2 border-border px-3"
          />
        </label>
        <label className="grid gap-1">
          <span className="font-bold">Nachname</span>
          <input
            required
            value={familyName}
            onChange={(event) => setFamilyName(event.target.value)}
            className="min-h-11 rounded-base border-2 border-border px-3"
          />
        </label>
      </div>
      <label className="grid max-w-xs gap-1">
        <span className="font-bold">Geburtsdatum</span>
        <input
          type="date"
          value={birthdate}
          onChange={(event) => setBirthdate(event.target.value)}
          className="min-h-11 rounded-base border-2 border-border px-3"
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="neutral" onClick={onDone}>
          Abbrechen
        </Button>
        <Button type="submit">{isNew ? 'Person hinzufügen' : 'Speichern'}</Button>
      </div>
    </form>
  )
}

function FamilyPeopleView({
  family_id: familyId,
  persons,
  actor,
  stage,
  selected_person_id: selectedPersonId,
  on_select: onSelect,
}: {
  family_id: string
  persons: ReturnType<typeof familyPeople>
  actor: string
  stage: (events: readonly EventDraft[]) => void
  selected_person_id?: string
  on_select: (personId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const selected = persons.find((person) => person.entity.id === selectedPersonId) ?? persons[0]
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!selected) {
    return (
      <Card className="bg-secondary-background">
        <CardHeader>
          <h3 className="text-xl">Personen</h3>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p>Noch niemand eingetragen. Mit „Person hinzufügen“ geht es los.</p>
          <CollectionCreateAction
            label="Person hinzufügen"
            title="Person hinzufügen"
            description="Lege eine Person in dieser Familie an."
            open={adding}
            on_open_change={setAdding}
          >
            <PersonForm
              family_id={familyId}
              actor={actor}
              stage={stage}
              on_done={() => setAdding(false)}
              is_new
            />
          </CollectionCreateAction>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(13rem,23%)_minmax(0,1fr)]">
      <FamilyPersonSidebar
        family_id={familyId}
        topic="personen"
        persons={persons}
        selected_person_id={selected.entity.id}
        on_select={onSelect}
        adding={adding}
        on_add_change={setAdding}
        actor={actor}
        stage={stage}
      />
      <div className="grid min-w-0 gap-5">
        <Card className="bg-secondary-background">
          <CardHeader>
            <h3 className="text-xl">Person</h3>
            <p className="text-muted">
              {personName(selected) || selected.entity.id} ·{' '}
              {selected.role === 'adult'
                ? 'Erwachsene(r)'
                : selected.role === 'infant'
                  ? 'Baby'
                  : personAge(selected.birthdate) === null
                    ? 'Kind · Alter fehlt'
                    : `Kind · ${personAge(selected.birthdate)} Jahre`}
            </p>
          </CardHeader>
          <CardContent>
            <PersonForm
              key={selected.entity.id}
              family_id={familyId}
              person={selected}
              actor={actor}
              stage={stage}
              on_done={() => undefined}
            />
          </CardContent>
        </Card>
        <section
          className="grid gap-3 rounded-base border-2 border-dashed border-muted p-5"
          aria-labelledby="remove-person-title"
        >
          <h3 id="remove-person-title" className="font-bold">
            Person entfernen
          </h3>
          <p>
            Entfernt {personName(selected) || selected.entity.id} mit allen Angaben zu Essen und
            Workshops.
          </p>
          <div>
            <Button type="button" variant="neutral" onClick={() => setConfirmDelete(true)}>
              Person entfernen
            </Button>
          </div>
          <DestructiveActionDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title={`${personName(selected) || selected.entity.id} wirklich entfernen?`}
            description="Alle Angaben zu Essen und Workshops gehen verloren. Das lässt sich nicht rückgängig machen."
            onConfirm={() =>
              stage([
                {
                  at: eventTime(),
                  actor,
                  subject: selected.entity.id,
                  type: 'PersonWithdrawn',
                  payload: { person_id: selected.entity.id, reason: null },
                },
              ])
            }
          />
        </section>
      </div>
    </div>
  )
}

function FamilyFoodView({
  family_id: familyId,
  persons,
  actor,
  world,
  stage,
  selected_person_id: selectedPersonId,
  on_select: onSelect,
}: {
  family_id: string
  persons: ReturnType<typeof familyPeople>
  actor: string
  world: World
  stage: (events: readonly EventDraft[]) => void
  selected_person_id?: string
  on_select: (personId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const selected = persons.find((person) => person.entity.id === selectedPersonId) ?? persons[0]
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(13rem,23%)_minmax(0,1fr)]">
      <FamilyPersonSidebar
        family_id={familyId}
        topic="essen"
        persons={persons}
        selected_person_id={selected?.entity.id}
        on_select={onSelect}
        adding={adding}
        on_add_change={setAdding}
        actor={actor}
        stage={stage}
      />
      {selected ? (
        <FamilyPreferencesControls
          profile={activeProfile}
          family_id={familyId}
          persons={persons.map((person) => person.entity)}
          world={world}
          actor={actor}
          stage={stage}
          section_keys={['food']}
          person_id={selected.entity.id}
          defer_text
        />
      ) : (
        <Card className="bg-secondary-background">
          <CardContent className="p-5">
            <p>Noch niemand eingetragen. Mit „Person hinzufügen“ geht es los.</p>
          </CardContent>
        </Card>
      )}
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

  function selectPerson(nextPersonId: string) {
    void navigate(
      organiserPaths.family_person_topic(
        selectedFamilyId,
        topic === 'zimmer' ? 'personen' : topic,
        nextPersonId,
      ),
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
          ) : topic === 'personen' ? (
            <FamilyPeopleView
              family_id={selectedFamilyId}
              persons={people}
              actor={state.principal_email}
              stage={stage}
              selected_person_id={detailPersonId}
              on_select={selectPerson}
            />
          ) : topic === 'essen' ? (
            <FamilyFoodView
              family_id={selectedFamilyId}
              persons={people}
              actor={state.principal_email}
              world={world!}
              stage={stage}
              selected_person_id={detailPersonId}
              on_select={selectPerson}
            />
          ) : (
            <p className="rounded-base border-2 border-dashed border-muted p-5">
              Dieser Bereich wird noch aufgebaut.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
