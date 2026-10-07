import { useState, type FormEvent } from 'react'
import { randomIdPart } from '../ids.js'
import { useLocation } from 'wouter'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import type { World } from '../../../events/fold.js'
import type { EventDraft, JsonValue } from '../../../events/types.js'
import { Button } from '../../components/shared/ui/button.js'
import { Badge } from '../../components/shared/ui/badge.js'
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
  personName,
} from '../family-data.js'
import { familyTopicLabel, FamilyTopicNavigation } from '../components/family-navigation.js'
import { organiserPaths, type FamilyTopic } from '../../../organiser/routes.js'
import { activeProfile } from '../../../config/index.js'
import {
  FamilyPreferencesControls,
  phaseNoticeText,
} from '../../../modules/family-preferences/app/controls.js'
import type { PhaseView } from '../../../derive/phases.js'
import { familyPreferencesConfig } from '../../../modules/family-preferences/index.js'
import { sectionOffered } from '../../../derive/features.js'
import {
  officialWorkshopsWorld,
  type WorkshopMode,
  type WorkshopRecord,
} from '../../../modules/official-workshops/index.js'
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

function clearLabelValueEvent(
  actor: string,
  familyId: string,
  entityId: string,
  key: string,
  value: JsonValue,
): EventDraft {
  return {
    at: eventTime(),
    actor,
    subject: entityId === familyId ? familyId : entityId,
    type: 'LabelCleared',
    payload: { entity_id: entityId, key, value },
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
          <label htmlFor="family-edit-name" className="grid gap-1">
            <span className="font-bold">Familienname</span>
            <span className="text-sm text-muted">
              So erscheint die Familie in Listen und Zimmerplänen.
            </span>
            <input
              id="family-edit-name"
              aria-label="Familienname"
              required
              value={nextName}
              onChange={(event) => setNextName(event.target.value)}
              className="min-h-11 rounded-base border-2 border-border px-3"
            />
          </label>
          <label htmlFor="family-edit-email" className="grid gap-1">
            <span className="font-bold">E-Mail</span>
            <input
              id="family-edit-email"
              aria-label="E-Mail"
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
  effective_features: effectiveFeatures,
  room_wishes_offered: roomWishesOffered,
  phases,
}: {
  family_id: string
  persons: ReturnType<typeof familyPeople>
  world: World
  actor: string
  stage: (events: readonly EventDraft[]) => void
  effective_features?: ReadonlySet<string>
  room_wishes_offered: boolean
  phases?: readonly PhaseView[]
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
        tri_state_no_answer
        audience="organiser"
        effective_features={effectiveFeatures}
        phases={phases}
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
      {roomWishesOffered ? (
        <FamilyNoteEditor family_id={familyId} value={roomNote} actor={actor} stage={stage} />
      ) : null}
    </div>
  )
}

function makePersonId(givenName: string): string {
  return `per_${randomIdPart()}_${givenName.toLowerCase()}`
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
            const age = person.age
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
  on_cancel: onCancel = onDone,
  is_new: isNew = false,
}: {
  family_id: string
  person?: ReturnType<typeof familyPeople>[number]
  actor: string
  stage: (events: readonly EventDraft[]) => void
  on_done: () => void
  on_cancel?: () => void
  is_new?: boolean
}) {
  const [givenName, setGivenName] = useState(person?.given_name ?? '')
  const [familyName, setFamilyName] = useState(person?.family_name ?? '')
  const [role, setRole] = useState(person?.role ?? 'adult')
  const [age, setAge] = useState(
    person?.age === null || person?.age === undefined ? '' : String(person.age),
  )
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const given = givenName.trim()
    const family = familyName.trim()
    if (!given || !family) {
      setError('Bitte gib Vor- und Nachnamen ein.')
      return
    }
    const nextAge = role === 'child' && age.trim() ? Number(age) : null
    if (
      role === 'child' &&
      (nextAge === null || !Number.isSafeInteger(nextAge) || nextAge < 1 || nextAge > 17)
    ) {
      setError('Bitte gib für Kinder ein Alter zwischen 1 und 17 Jahren ein.')
      return
    }
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
            age: nextAge,
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
            age: nextAge,
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
      {role === 'child' ? (
        <label className="grid max-w-xs gap-1">
          <span className="font-bold">Alter</span>
          <input
            type="number"
            min="1"
            max="17"
            step="1"
            inputMode="numeric"
            value={age}
            onChange={(event) => setAge(event.target.value)}
            className="min-h-11 rounded-base border-2 border-border px-3"
          />
        </label>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="neutral" onClick={onCancel}>
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
  const [personFormVersion, setPersonFormVersion] = useState(0)
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
                  : selected.age === null
                    ? 'Kind · Alter fehlt'
                    : `Kind · ${selected.age} Jahre`}
            </p>
          </CardHeader>
          <CardContent>
            <PersonForm
              key={`${selected.entity.id}-${personFormVersion}`}
              family_id={familyId}
              person={selected}
              actor={actor}
              stage={stage}
              on_done={() => setPersonFormVersion((version) => version + 1)}
              on_cancel={() => setPersonFormVersion((version) => version + 1)}
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

function workshopAgeLabel(workshop: WorkshopRecord): string {
  if (workshop.age_min === 0 && workshop.age_max >= 120) return 'Alle Altersgruppen'
  if (workshop.age_min === 0) return `Bis ${workshop.age_max} Jahre`
  if (workshop.age_max >= 120) return `Ab ${workshop.age_min} Jahren`
  return `${workshop.age_min}–${workshop.age_max} Jahre`
}

function workshopEligibility(
  person: ReturnType<typeof familyPeople>[number],
  workshop: WorkshopRecord,
): { ok: boolean; reason?: string } {
  if (person.role === 'infant') return { ok: false, reason: 'Babys können hier nicht teilnehmen.' }
  const age = person.age
  if (age !== null && age < workshop.age_min)
    return { ok: false, reason: `Ab ${workshop.age_min} Jahren. ${person.given_name} ist ${age}.` }
  if (age !== null && age > workshop.age_max)
    return { ok: false, reason: `Bis ${workshop.age_max} Jahre. ${person.given_name} ist ${age}.` }
  if (workshop.audience === 'children' && person.role === 'adult')
    return { ok: false, reason: 'Dieser Workshop ist für Kinder.' }
  if (workshop.audience === 'adults' && person.role !== 'adult')
    return { ok: false, reason: 'Dieser Workshop ist für Erwachsene.' }
  return { ok: true }
}

function workshopRankings(world: World, personId: string): readonly string[] {
  return (world.labels_by_entity[personId] ?? [])
    .filter((label) => label.key === 'prefers-workshop')
    .map((label) => {
      if (typeof label.value !== 'object' || label.value === null || Array.isArray(label.value))
        return null
      const workshopId = label.value.workshop_id
      const rank = label.value.rank
      return typeof workshopId === 'string' && typeof rank === 'number'
        ? { workshop_id: workshopId, rank }
        : null
    })
    .filter((value): value is { workshop_id: string; rank: number } => value !== null)
    .sort((a, b) => a.rank - b.rank)
    .map(({ workshop_id: workshopId }) => workshopId)
}

function personWorkshopValues(world: World, personId: string, key: string): readonly string[] {
  return (world.labels_by_entity[personId] ?? [])
    .filter((label) => label.key === key && typeof label.value === 'string')
    .map((label) => label.value as string)
}

function workshopAttendance(world: World, workshopId: string): number {
  return Object.values(world.labels_by_entity).reduce(
    (count, labels) =>
      count +
      labels.filter((label) => label.key === 'signed-up-for' && label.value === workshopId).length,
    0,
  )
}

function replaceRankings(
  actor: string,
  familyId: string,
  personId: string,
  workshopIds: readonly string[],
  stage: (events: readonly EventDraft[]) => void,
) {
  const events: EventDraft[] = [labelEvent(actor, familyId, personId, 'prefers-workshop', null)]
  workshopIds.forEach((workshopId, index) => {
    events.push(
      labelEvent(actor, familyId, personId, 'prefers-workshop', {
        workshop_id: workshopId,
        rank: index + 1,
      }),
    )
  })
  stage(events)
}

function WorkshopFinder({
  family_id: familyId,
  person,
  world,
  actor,
  stage,
  mode,
  on_back: onBack,
}: {
  family_id: string
  person: ReturnType<typeof familyPeople>[number]
  world: World
  actor: string
  stage: (events: readonly EventDraft[]) => void
  mode: WorkshopMode
  on_back: () => void
}) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const workshops = officialWorkshopsWorld(world).workshops.filter(
    (workshop) => workshop.mode === mode,
  )
  const matching = workshops.filter((workshop) => {
    const eligibility = workshopEligibility(person, workshop)
    const text = `${workshop.title} ${workshop.description}`.toLocaleLowerCase('de')
    return (showAll || eligibility.ok) && text.includes(query.trim().toLocaleLowerCase('de'))
  })
  const unsuitable = workshops.filter(
    (workshop) => !workshopEligibility(person, workshop).ok,
  ).length
  const ranking = workshopRankings(world, person.entity.id)
  const signup = personWorkshopValues(world, person.entity.id, 'signed-up-for')
  const interest = personWorkshopValues(world, person.entity.id, 'interested-in')
  const title =
    mode === 'assigned'
      ? 'Workshops, die über die Wunschliste vergeben werden'
      : mode === 'sign-up'
        ? 'Workshops mit fester Anmeldung'
        : 'Workshops nach Interesse'

  function toggle(workshop: WorkshopRecord) {
    const eligible = workshopEligibility(person, workshop).ok
    if (!eligible) return
    if (mode === 'assigned') {
      if (ranking.includes(workshop.id)) {
        replaceRankings(
          actor,
          familyId,
          person.entity.id,
          ranking.filter((id) => id !== workshop.id),
          stage,
        )
      } else if (ranking.length < 3) {
        replaceRankings(actor, familyId, person.entity.id, [...ranking, workshop.id], stage)
      }
    } else if (mode === 'sign-up') {
      if (signup.includes(workshop.id))
        stage([
          clearLabelValueEvent(actor, familyId, person.entity.id, 'signed-up-for', workshop.id),
        ])
      else if (workshopAttendance(world, workshop.id) < workshop.capacity)
        stage([labelEvent(actor, familyId, person.entity.id, 'signed-up-for', workshop.id)])
    } else if (interest.includes(workshop.id)) {
      stage([clearLabelValueEvent(actor, familyId, person.entity.id, 'interested-in', workshop.id)])
    } else {
      stage([labelEvent(actor, familyId, person.entity.id, 'interested-in', workshop.id)])
    }
  }

  return (
    <div className="grid gap-4">
      <Button type="button" variant="neutral" className="justify-self-start" onClick={onBack}>
        ← Zurück
      </Button>
      <h3 className="text-xl">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="font-bold">Suchen</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titel oder Stichwort"
            autoComplete="off"
            className="min-h-11 rounded-base border-2 border-border px-3"
          />
        </label>
        {unsuitable ? (
          <label className="flex min-h-11 items-center gap-3 self-end font-bold">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(event) => setShowAll(event.target.checked)}
            />
            Auch zeigen, was nicht zu {person.given_name} passt
          </label>
        ) : null}
      </div>
      <p className="text-sm font-bold" aria-live="polite">
        {matching.length} {matching.length === 1 ? 'Workshop' : 'Workshops'}
      </p>
      {matching.length ? (
        <ul className="grid gap-4 md:grid-cols-2" aria-label="Workshops">
          {matching.map((workshop) => {
            const eligibility = workshopEligibility(person, workshop)
            const rankedAt = ranking.indexOf(workshop.id)
            const joined = signup.includes(workshop.id)
            const interested = interest.includes(workshop.id)
            const remaining = workshop.capacity - workshopAttendance(world, workshop.id)
            return (
              <li
                key={workshop.id}
                className={`grid content-start gap-3 rounded-base border-2 border-border p-4 shadow-shadow ${eligibility.ok ? 'bg-secondary-background' : 'border-dashed bg-paper shadow-none'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="text-lg font-bold">{workshop.title}</h4>
                  {!eligibility.ok ? <Badge tone="neutral">✕ Passt nicht</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{workshopAgeLabel(workshop)}</Badge>
                  <Badge>
                    {workshop.audience === 'all'
                      ? 'Alle'
                      : workshop.audience === 'children'
                        ? 'Kinder'
                        : 'Erwachsene'}
                  </Badge>
                </div>
                <p>{workshop.description}</p>
                {!eligibility.ok ? (
                  <p className="border-l-4 border-muted pl-3 text-sm">
                    <strong>Warum nicht?</strong> {eligibility.reason}
                  </p>
                ) : null}
                {mode === 'sign-up' ? (
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>
                        {remaining === 0
                          ? 'Keine Plätze frei'
                          : `Noch ${remaining} ${remaining === 1 ? 'Platz' : 'Plätze'} frei`}
                      </strong>
                      {workshop.capacity <= 12 ? (
                        <span className="flex gap-1" aria-hidden="true">
                          {Array.from({ length: workshop.capacity }, (_, index) => (
                            <span
                              key={index}
                              className={`size-3 rounded-sm border-2 border-border ${index < workshopAttendance(world, workshop.id) ? 'bg-foreground' : 'bg-secondary-background'}`}
                            />
                          ))}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant={joined ? 'neutral' : 'default'}
                      disabled={!eligibility.ok || (!joined && remaining <= 0)}
                      onClick={() => toggle(workshop)}
                    >
                      {joined ? 'Abmelden' : remaining <= 0 ? 'Ausgebucht' : 'Anmelden'}
                    </Button>
                  </div>
                ) : mode === 'interest' ? (
                  <Button
                    type="button"
                    variant={interested ? 'neutral' : 'default'}
                    disabled={!eligibility.ok}
                    aria-pressed={interested}
                    onClick={() => toggle(workshop)}
                  >
                    {interested ? '✓ Interesse markiert' : 'Interesse markieren'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant={rankedAt >= 0 ? 'neutral' : 'default'}
                    disabled={!eligibility.ok || (rankedAt < 0 && ranking.length >= 3)}
                    onClick={() => toggle(workshop)}
                  >
                    {rankedAt >= 0
                      ? `★ Wunsch Platz ${rankedAt + 1} · Entfernen`
                      : ranking.length >= 3
                        ? 'Wunschliste voll'
                        : 'Auf Wunschliste setzen'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="grid justify-items-start gap-3 rounded-base border-2 border-dashed border-muted p-5">
          <p>
            {query
              ? 'Zur Suche passt kein Workshop.'
              : `Für ${person.given_name} passt hier gerade kein Workshop.`}
          </p>
          {query ? (
            <Button type="button" variant="neutral" onClick={() => setQuery('')}>
              Suche leeren
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function FamilyWorkshopView({
  family_id: familyId,
  persons,
  world,
  actor,
  stage,
  selected_person_id: selectedPersonId,
  on_select: onSelect,
}: {
  family_id: string
  persons: ReturnType<typeof familyPeople>
  world: World
  actor: string
  stage: (events: readonly EventDraft[]) => void
  selected_person_id?: string
  on_select: (personId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [finder, setFinder] = useState<WorkshopMode | null>(null)
  const selected = persons.find((person) => person.entity.id === selectedPersonId) ?? persons[0]
  if (!selected) {
    return (
      <p className="rounded-base border-2 border-dashed border-muted p-5">
        Noch niemand eingetragen. Personen kommen unter „Personen“ dazu.
      </p>
    )
  }
  if (finder) {
    return (
      <WorkshopFinder
        family_id={familyId}
        person={selected}
        world={world}
        actor={actor}
        stage={stage}
        mode={finder}
        on_back={() => setFinder(null)}
      />
    )
  }
  const selectedId = selected.entity.id
  const ranking = workshopRankings(world, selectedId)
  const assigned = officialWorkshopsWorld(world).workshops.filter(
    (workshop) => workshop.mode === 'assigned',
  )
  const eligibleTarget = Math.min(
    3,
    assigned.filter((workshop) => workshopEligibility(selected, workshop).ok).length,
  )
  const signup = personWorkshopValues(world, selectedId, 'signed-up-for')
  const interest = personWorkshopValues(world, selectedId, 'interested-in')
  function reorder(workshopId: string, nextIndex: number) {
    const next = ranking.filter((id) => id !== workshopId)
    next.splice(nextIndex, 0, workshopId)
    replaceRankings(actor, familyId, selectedId, next, stage)
  }

  function remove(workshopId: string) {
    replaceRankings(
      actor,
      familyId,
      selectedId,
      ranking.filter((id) => id !== workshopId),
      stage,
    )
  }

  const selectedWorkshops = officialWorkshopsWorld(world).workshops
  const displayWorkshop = (id: string) => selectedWorkshops.find((workshop) => workshop.id === id)
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(13rem,23%)_minmax(0,1fr)]">
      <FamilyPersonSidebar
        family_id={familyId}
        topic="workshops"
        persons={persons}
        selected_person_id={selected.entity.id}
        on_select={onSelect}
        adding={adding}
        on_add_change={setAdding}
        actor={actor}
        stage={stage}
      />
      <div className="grid min-w-0 gap-5">
        <section
          className="grid gap-3 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow"
          aria-labelledby="workshop-wishes-title"
        >
          <div>
            <h3 id="workshop-wishes-title" className="text-xl">
              Wunschliste
            </h3>
            <p className="text-sm text-muted">Bis zu 3 Workshops, geordnet nach Wunsch.</p>
          </div>
          {eligibleTarget === 0 && ranking.length === 0 ? (
            <p>
              Für {selected.given_name} gibt es keinen Workshop mit Wunschliste. Anmeldungen und
              Interesse sind trotzdem möglich.
            </p>
          ) : (
            <ol className="grid gap-2" aria-label={`Wunschliste von ${personName(selected)}`}>
              {Array.from({ length: Math.max(eligibleTarget, ranking.length) }, (_, index) => {
                const workshop = displayWorkshop(ranking[index] ?? '')
                return (
                  <li
                    key={index}
                    className={`grid gap-3 rounded-base border-2 p-3 sm:grid-cols-[2.5rem_1fr] ${workshop ? 'border-border bg-secondary-background' : 'border-dashed border-muted'}`}
                  >
                    <span className="grid size-9 place-items-center rounded-full border-2 border-border bg-main font-bold">
                      {index + 1}
                    </span>
                    {workshop ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <strong>{workshop.title}</strong>
                          <span className="block text-sm text-muted">
                            {workshopAgeLabel(workshop)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {ranking.length > 1 ? (
                            <div
                              className="flex flex-wrap gap-1"
                              role="group"
                              aria-label={`Platz für ${workshop.title}`}
                            >
                              {ranking.map((_, rank) => (
                                <button
                                  key={rank}
                                  type="button"
                                  aria-pressed={rank === index}
                                  onClick={() => reorder(workshop.id, rank)}
                                  className="size-10 rounded-base border-2 border-border px-2 font-bold aria-pressed:bg-foreground aria-pressed:text-background"
                                >
                                  {rank + 1}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          <Button
                            type="button"
                            variant="neutral"
                            onClick={() => remove(workshop.id)}
                          >
                            Entfernen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3 text-muted">
                        <span>Platz {index + 1} ist frei.</span>
                        {index === ranking.length ? (
                          <Button type="button" onClick={() => setFinder('assigned')}>
                            Workshop finden
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </section>
        {(['sign-up', 'interest'] as const).map((mode) => {
          const ids = mode === 'sign-up' ? signup : interest
          const title = mode === 'sign-up' ? 'Feste Anmeldungen' : 'Interesse'
          const hint =
            mode === 'sign-up'
              ? 'Mit der Anmeldung ist der Platz sofort reserviert.'
              : 'Unverbindlich, ohne Platzreservierung.'
          return (
            <section
              key={mode}
              className="grid gap-3 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow"
            >
              <div>
                <h3 className="text-xl">{title}</h3>
                <p className="text-sm text-muted">{hint}</p>
              </div>
              {ids.length ? (
                <ul className="grid gap-2">
                  {ids.map((id) => (
                    <li
                      key={id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-base border-2 border-border p-2"
                    >
                      <strong>{displayWorkshop(id)?.title ?? id}</strong>
                      <Button
                        type="button"
                        variant="neutral"
                        onClick={() =>
                          stage([
                            clearLabelValueEvent(
                              actor,
                              familyId,
                              selectedId,
                              mode === 'sign-up' ? 'signed-up-for' : 'interested-in',
                              id,
                            ),
                          ])
                        }
                      >
                        {mode === 'sign-up' ? 'Abmelden' : 'Zurücknehmen'}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">{mode === 'sign-up' ? 'Keine.' : 'Keins.'}</p>
              )}
              <Button
                type="button"
                variant="neutral"
                className="justify-self-start"
                onClick={() => setFinder(mode)}
              >
                Workshops finden
              </Button>
            </section>
          )
        })}
      </div>
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
  const { state, world, stage, effective_features: effectiveFeatures, phases } = useOrganiser()
  const [, navigate] = useLocation()
  const family = familyId ? findFamily(world!, familyId) : null
  const workshopSection = familyPreferencesConfig(activeProfile).sections.find(
    ({ key }) => key === 'workshops',
  )
  const workshopNotice = workshopSection
    ? phaseNoticeText(workshopSection, activeProfile.meta, 'organiser', phases)
    : null
  const offered = (sectionKey: string): boolean => {
    const section = familyPreferencesConfig(activeProfile).sections.find(
      ({ key }) => key === sectionKey,
    )
    return (
      !section ||
      !effectiveFeatures ||
      sectionOffered(section, 'organiser', activeProfile.modules, effectiveFeatures)
    )
  }
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
        title={displayName}
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
              effective_features={effectiveFeatures}
              room_wishes_offered={offered('room-wishes')}
              phases={phases}
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
          ) : topic === 'workshops' && !offered('workshops') ? (
            <p className="rounded-base border-2 border-dashed border-muted p-5">
              Workshopwünsche sind in dieser Planung ausgeschaltet.
            </p>
          ) : topic === 'workshops' ? (
            <>
              {workshopNotice ? <p role="note">{workshopNotice}</p> : null}
              <FamilyWorkshopView
                family_id={selectedFamilyId}
                persons={people}
                world={world!}
                actor={state.principal_email}
                stage={stage}
                selected_person_id={detailPersonId}
                on_select={selectPerson}
              />
            </>
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
