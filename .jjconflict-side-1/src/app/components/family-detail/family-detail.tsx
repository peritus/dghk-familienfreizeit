import { useState, type FormEvent, type ReactNode, type ReactElement } from 'react'
import type {
  DetailPerson,
  DetailWorkshop,
  FamilyDetailData,
  FamilyDetailActions,
  FamilyTopic,
  PersonInput,
} from '../../../family-detail/model.js'
import { familyTopics, familyTopicLabels, personName } from '../../../family-detail/model.js'
import { DetailPreferences, PreferenceField } from './controls.js'
import { TextField } from '../shared/ui/field.js'
import { ChoiceField } from '../shared/ui/field.js'
import { Button } from '../shared/ui/button.js'
import { Badge } from '../shared/ui/badge.js'
import { SegmentedControl } from '../shared/ui/segmented-control.js'
import { DestructiveActionDialog } from '../shared/ui/destructive-action-dialog.js'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../shared/ui/dialog.js'
import { Card, CardContent, CardHeader } from '../shared/ui/card.js'
import { ScreenLayout, ScreenHeader, SectionHeader } from '../shared/ui/screen-layout.js'
import { CollectionCreateAction } from '../shared/ui/collection-create-action.js'
import { TertiaryNavigation } from '../shared/ui/tertiary-navigation.js'

export type FamilyDetailProps = {
  data: FamilyDetailData
  actions: FamilyDetailActions
  topic?: FamilyTopic
  person_id?: string
  on_select: (person_id: string) => void
  on_topic: (topic: FamilyTopic) => void
  topic_link: (
    topic: FamilyTopic,
  ) => ReactElement<{ className?: string; children?: ReactNode; 'aria-current'?: 'page' }>
  back_link?: ReactNode
  status?: ReactNode
  defer_text?: boolean
}

function FamilyEditDialog({
  data,
  actions,
}: {
  data: FamilyDetailData
  actions: FamilyDetailActions
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(data.family.display_name),
    [email, setEmail] = useState(data.family.email),
    [error, setError] = useState<string | null>(null),
    [pending, setPending] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Bitte gib einen Familiennamen ein.')
      return
    }
    setPending(true)
    try {
      await actions.change({
        type: 'family',
        display_name: name.trim(),
        ...(data.can_edit_email ? { email: email.trim() } : {}),
      })
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Die Änderung konnte nicht gespeichert werden.')
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName(data.family.display_name)
          setEmail(data.family.email)
          setError(null)
        }
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button type="button">Familie bearbeiten</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Familie bearbeiten</DialogTitle>
          <DialogDescription>Ändere die Angaben der Familie.</DialogDescription>
        </DialogHeader>
        {error ? <p role="alert">{error}</p> : null}
        <form
          id="family-edit-form"
          className="mt-5 grid gap-4"
          onSubmit={(event) => void submit(event)}
        >
          <TextField
            label="Familienname"
            hint="So erscheint die Familie in Listen und Zimmerplänen."
            aria-label="Familienname"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {data.can_edit_email ? (
            <TextField
              label="E-Mail"
              aria-label="E-Mail"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          ) : null}
        </form>
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="neutral">
                Abbrechen
              </Button>
            }
          />
          <Button type="submit" form="family-edit-form" disabled={pending}>
            Änderungen speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PersonForm({
  data,
  person,
  actions,
  on_done: onDone,
  on_cancel: onCancel = onDone,
  is_new: isNew = false,
}: {
  data: FamilyDetailData
  person?: DetailPerson
  actions: FamilyDetailActions
  on_done: () => void
  on_cancel?: () => void
  is_new?: boolean
}) {
  const [givenName, setGivenName] = useState(person?.given_name ?? ''),
    [familyName, setFamilyName] = useState(
      person?.family_name ?? (isNew ? data.family.display_name : ''),
    ),
    [role, setRole] = useState(person?.role ?? 'adult'),
    [age, setAge] = useState(person?.age == null ? '' : String(person.age)),
    [error, setError] = useState<string | null>(null),
    [pending, setPending] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const next: PersonInput = {
      given_name: givenName.trim(),
      family_name: familyName.trim(),
      role,
      age: role === 'child' && age.trim() ? Number(age) : null,
    }
    if (!next.given_name || !next.family_name) {
      setError('Bitte gib Vorname und Nachname ein.')
      return
    }
    if (
      role === 'child' &&
      (next.age === null || !Number.isSafeInteger(next.age) || next.age < 1 || next.age > 17)
    ) {
      setError('Bitte gib ein Alter zwischen 1 und 17 Jahren ein.')
      return
    }
    setPending(true)
    try {
      await actions.change(
        isNew
          ? { type: 'person-create', person: next }
          : { type: 'person-update', person_id: person!.id, person: next },
      )
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Die Person konnte nicht gespeichert werden.')
    } finally {
      setPending(false)
    }
  }
  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      {error ? <p role="alert">{error}</p> : null}
      <SegmentedControl
        label="Altersgruppe"
        value={role}
        onChange={setRole}
        options={[
          { value: 'adult', label: 'Erwachsene(r)' },
          { value: 'child', label: 'Kind' },
          { value: 'infant', label: 'Baby' },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Vorname"
          required
          value={givenName}
          onChange={(event) => setGivenName(event.target.value)}
        />
        <TextField
          label="Nachname"
          hint={isNew ? 'Vorschlag aus dem Familiennamen. Du kannst ihn ändern.' : undefined}
          required
          value={familyName}
          onChange={(event) => setFamilyName(event.target.value)}
        />
      </div>
      {role === 'child' ? (
        <TextField
          label="Alter"
          type="number"
          min="1"
          max="17"
          step="1"
          inputMode="numeric"
          value={age}
          onChange={(event) => setAge(event.target.value)}
        />
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="neutral" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={pending}>
          {isNew ? 'Person hinzufügen' : 'Speichern'}
        </Button>
      </div>
    </form>
  )
}

export function FamilyPersonSidebar({
  data,
  persons,
  selected_person_id: selectedPersonId,
  on_select: onSelect,
  adding,
  on_add_change: onAddChange,
  actions,
}: {
  data: FamilyDetailData
  persons: readonly DetailPerson[]
  selected_person_id?: string
  on_select: (id: string) => void
  adding: boolean
  on_add_change: (open: boolean) => void
  actions: FamilyDetailActions
  family_id?: string
  topic?: FamilyTopic
}) {
  return (
    <aside className="grid content-start gap-3" aria-label="Person auswählen">
      <SectionHeader
        title="Personen"
        action={
          <CollectionCreateAction
            label="Person hinzufügen"
            title="Person hinzufügen"
            description="Lege eine Person in dieser Familie an."
            open={adding}
            on_open_change={onAddChange}
          >
            <PersonForm data={data} actions={actions} on_done={() => onAddChange(false)} is_new />
          </CollectionCreateAction>
        }
      />
      {persons.length ? (
        <div
          role="tablist"
          aria-label="Person auswählen"
          aria-orientation="vertical"
          className="grid gap-2"
        >
          {persons.map((person, index) => (
            <button
              key={person.id}
              type="button"
              role="tab"
              aria-selected={person.id === selectedPersonId}
              tabIndex={person.id === selectedPersonId ? 0 : -1}
              onClick={() => onSelect(person.id)}
              onKeyDown={(event) => {
                if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? persons.length - 1
                      : (index + (event.key === 'ArrowDown' ? 1 : -1) + persons.length) %
                        persons.length
                onSelect(persons[next]!.id)
                const tabs = event.currentTarget
                  .closest('[role="tablist"]')
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                tabs?.[next]?.focus()
              }}
              className={`grid min-h-16 w-full justify-items-start gap-1 rounded-base border-2 border-border px-3 py-2 text-left ${person.id === selectedPersonId ? 'bg-foreground text-background shadow-shadow' : 'bg-secondary-background hover:bg-main-soft'}`}
            >
              <span className="font-bold">{personName(person)}</span>
              <span
                className={`text-sm ${person.id === selectedPersonId ? 'text-background' : 'text-muted'}`}
              >
                {person.role === 'adult'
                  ? 'Erwachsene(r)'
                  : person.role === 'infant'
                    ? 'Baby'
                    : person.age === null
                      ? 'Kind · Alter fehlt'
                      : `Kind · ${person.age} ${person.age === 1 ? 'Jahr' : 'Jahre'}`}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-base border-2 border-dashed border-muted p-3">
          Noch niemand eingetragen.
        </p>
      )}
    </aside>
  )
}

function FamilyPeopleView({
  data,
  actions,
  selected_person_id: selectedPersonId,
  on_select: onSelect,
}: {
  data: FamilyDetailData
  actions: FamilyDetailActions
  selected_person_id?: string
  on_select: (id: string) => void
}) {
  const [adding, setAdding] = useState(false),
    [version, setVersion] = useState(0),
    [confirm, setConfirm] = useState(false)
  const selected = data.people.find((person) => person.id === selectedPersonId) ?? data.people[0]
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(13rem,23%)_minmax(0,1fr)]">
      <FamilyPersonSidebar
        data={data}
        actions={actions}
        persons={data.people}
        selected_person_id={selected?.id}
        on_select={onSelect}
        adding={adding}
        on_add_change={setAdding}
      />
      <div className="grid min-w-0 gap-5">
        {selected ? (
          <>
            <Card className="bg-secondary-background">
              <CardHeader>
                <h3 className="text-metric">Person</h3>
              </CardHeader>
              <CardContent>
                <PersonForm
                  key={`${JSON.stringify(selected)}-${version}`}
                  data={data}
                  person={selected}
                  actions={actions}
                  on_done={() => setVersion((v) => v + 1)}
                  on_cancel={() => setVersion((v) => v + 1)}
                />
              </CardContent>
            </Card>
            {data.can_remove_person ? (
              <section className="print:hidden grid gap-3 rounded-base border-2 border-dashed border-muted p-5">
                <h3 className="font-bold">Person entfernen</h3>
                <p>Entfernt {personName(selected)} mit allen Angaben zu Essen und Workshops.</p>
                <div>
                  <Button type="button" variant="neutral" onClick={() => setConfirm(true)}>
                    Person entfernen
                  </Button>
                </div>
                <DestructiveActionDialog
                  open={confirm}
                  onOpenChange={setConfirm}
                  title={`${personName(selected)} wirklich entfernen?`}
                  description="Alle Angaben zu Essen und Workshops gehen verloren. Das lässt sich nicht rückgängig machen."
                  onConfirm={() =>
                    void actions.change({ type: 'person-remove', person_id: selected.id })
                  }
                />
              </section>
            ) : null}
          </>
        ) : (
          <Card>
            <CardContent>
              <p>Noch niemand eingetragen. Mit „Person hinzufügen“ geht es los.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function FamilyRoomView({
  data,
  actions,
  defer_text: deferText,
}: {
  data: FamilyDetailData
  actions: FamilyDetailActions
  defer_text: boolean
}) {
  const count = data.people.filter(
    (person) =>
      data.preferences[person.id]?.['does-not-need-a-bed']?.answer.values[0]?.value !== true,
  ).length
  const infants = data.people.filter((person) => person.role === 'infant')
  return (
    <div className="space-y-4">
      <DetailPreferences
        data={data}
        actions={actions}
        section_keys={['room-wishes']}
        trait_keys={['needs-private-sanitary', 'needs-accessible', 'sole-occupancy']}
      />
      <Card className="bg-secondary-background">
        <CardHeader>
          <h3 className="text-metric">Schlafen</h3>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="flex flex-wrap items-baseline gap-2">
            <strong className="text-h1">{count}</strong>
            <span>{count === 1 ? 'Schlafplatz' : 'Schlafplätze'} nötig</span>
          </p>
          {infants.map((person) => {
            const control = data.preferences[person.id]?.['does-not-need-a-bed']
            return control ? (
              <PreferenceField
                key={person.id}
                control={{ ...control, title: `${personName(person)} schläft im Bett der Eltern` }}
                actions={actions}
              />
            ) : null
          })}
          {!infants.length ? (
            <p className="text-sm text-muted">Jede Person braucht einen eigenen Schlafplatz.</p>
          ) : (
            <p className="text-sm text-muted">
              Babys im Bett der Eltern brauchen keinen eigenen Schlafplatz.
            </p>
          )}
        </CardContent>
      </Card>
      {data.preferences[data.family.id]?.['family-note'] ? (
        <Card className="bg-secondary-background">
          <CardHeader>
            <h3 className="text-metric">Sonstiges zum Zimmer</h3>
            <p>Alles, was oben nicht vorkommt.</p>
          </CardHeader>
          <CardContent>
            <PreferenceField
              control={{
                ...data.preferences[data.family.id]!['family-note']!,
                title: 'Sonstiges zum Zimmer',
              }}
              actions={actions}
              defer_text={deferText}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function FamilyFoodView({
  data,
  actions,
  selected_person_id: selectedPersonId,
  on_select: onSelect,
  defer_text: deferText,
}: {
  data: FamilyDetailData
  actions: FamilyDetailActions
  selected_person_id?: string
  on_select: (id: string) => void
  defer_text: boolean
}) {
  const [adding, setAdding] = useState(false)
  const selected = data.people.find((person) => person.id === selectedPersonId) ?? data.people[0]
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(13rem,23%)_minmax(0,1fr)]">
      <FamilyPersonSidebar
        data={data}
        actions={actions}
        persons={data.people}
        selected_person_id={selected?.id}
        on_select={onSelect}
        adding={adding}
        on_add_change={setAdding}
      />
      {selected ? (
        <DetailPreferences
          data={data}
          actions={actions}
          section_keys={['food']}
          person_id={selected.id}
          defer_text={deferText}
        />
      ) : (
        <Card>
          <CardContent>Noch niemand eingetragen. Mit „Person hinzufügen“ geht es los.</CardContent>
        </Card>
      )}
    </div>
  )
}

function workshopAgeLabel(workshop: DetailWorkshop): string {
  if (workshop.age_min === 0 && workshop.age_max >= 120) return 'Alle Altersgruppen'
  if (workshop.age_min === 0) return `Bis ${workshop.age_max} Jahre`
  if (workshop.age_max >= 120) return `Ab ${workshop.age_min} Jahren`
  return `${workshop.age_min}–${workshop.age_max} Jahre`
}

function workshopEligibility(
  person: DetailPerson,
  workshop: DetailWorkshop,
): { ok: boolean; reason?: string } {
  const reason = workshop.eligibility[person.id] ?? null
  return reason ? { ok: false, reason } : { ok: true }
}

function WorkshopFinder({
  person,
  data,
  actions,
  mode,
  on_back: onBack,
}: {
  family_id: string
  person: DetailPerson
  data: FamilyDetailData
  actions: FamilyDetailActions
  mode: DetailWorkshop['mode']
  on_back: () => void
}) {
  const writable = data.sections.find((section) => section.key === 'workshops')?.writable ?? false
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const workshops = data.workshops.filter((workshop) => workshop.mode === mode)
  const matching = workshops.filter((workshop) => {
    const eligibility = workshopEligibility(person, workshop)
    const text = `${workshop.title} ${workshop.description}`.toLocaleLowerCase('de')
    return (showAll || eligibility.ok) && text.includes(query.trim().toLocaleLowerCase('de'))
  })
  const unsuitable = workshops.filter(
    (workshop) => !workshopEligibility(person, workshop).ok,
  ).length
  const ranking = data.rankings[person.id] ?? []
  const signup = data.signups[person.id] ?? []
  const interest = data.interests[person.id] ?? []
  const title =
    mode === 'assigned'
      ? 'Workshops, die über die Wunschliste vergeben werden'
      : mode === 'sign-up'
        ? 'Workshops mit fester Anmeldung'
        : 'Workshops nach Interesse'

  function toggle(workshop: DetailWorkshop) {
    if (!workshopEligibility(person, workshop).ok) return
    const next = ranking.includes(workshop.id)
      ? ranking.filter((id) => id !== workshop.id)
      : [...ranking, workshop.id]
    if (mode === 'assigned') {
      if (next.length <= data.max_rank)
        void actions.change({ type: 'ranking', person_id: person.id, workshop_ids: next })
    } else
      void actions.change({
        type: mode === 'sign-up' ? 'signup' : 'interest',
        person_id: person.id,
        workshop_id: workshop.id,
        selected: !(mode === 'sign-up' ? signup : interest).includes(workshop.id),
      })
  }

  return (
    <div className="grid gap-4">
      <Button type="button" variant="neutral" className="justify-self-start" onClick={onBack}>
        ← Zurück
      </Button>
      <h3 className="text-metric">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Suchen"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Titel oder Stichwort"
          autoComplete="off"
        />
        {unsuitable ? (
          <ChoiceField
            className="flex min-h-11 items-center gap-3 self-end font-bold"
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
            label={<>Auch zeigen, was nicht zu {person.given_name} passt</>}
          />
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
            const remaining = workshop.capacity - workshop.signed_up_count
            return (
              <li
                key={workshop.id}
                className={`grid content-start gap-3 rounded-base border-2 border-border p-4 shadow-shadow ${eligibility.ok ? 'bg-secondary-background' : 'border-dashed bg-paper shadow-none'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="text-title font-bold">{workshop.title}</h4>
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
                              className={`size-3 rounded-sm border-2 border-border ${index < workshop.signed_up_count ? 'bg-foreground' : 'bg-secondary-background'}`}
                            />
                          ))}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant={joined ? 'neutral' : 'default'}
                      disabled={!writable || !eligibility.ok || (!joined && remaining <= 0)}
                      onClick={() => toggle(workshop)}
                    >
                      {joined ? 'Abmelden' : remaining <= 0 ? 'Ausgebucht' : 'Anmelden'}
                    </Button>
                  </div>
                ) : mode === 'interest' ? (
                  <Button
                    type="button"
                    variant={interested ? 'neutral' : 'default'}
                    disabled={!writable || !eligibility.ok}
                    aria-pressed={interested}
                    onClick={() => toggle(workshop)}
                  >
                    {interested ? '✓ Interesse markiert' : 'Interesse markieren'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant={rankedAt >= 0 ? 'neutral' : 'default'}
                    disabled={
                      !writable ||
                      !eligibility.ok ||
                      (rankedAt < 0 && ranking.length >= data.max_rank)
                    }
                    onClick={() => toggle(workshop)}
                  >
                    {rankedAt >= 0
                      ? `★ Wunsch Platz ${rankedAt + 1} · Entfernen`
                      : ranking.length >= data.max_rank
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
  persons,
  data,
  actions,
  selected_person_id: selectedPersonId,
  on_select: onSelect,
}: {
  family_id: string
  persons: readonly DetailPerson[]
  data: FamilyDetailData
  actions: FamilyDetailActions
  selected_person_id?: string
  on_select: (person_id: string) => void
}) {
  const writable = data.sections.find((section) => section.key === 'workshops')?.writable ?? false
  const [adding, setAdding] = useState(false)
  const [finder, setFinder] = useState<DetailWorkshop['mode'] | null>(null)
  const selected = persons.find((person) => person.id === selectedPersonId) ?? persons[0]
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
        family_id={data.family.id}
        person={selected}
        data={data}
        actions={actions}
        mode={finder}
        on_back={() => setFinder(null)}
      />
    )
  }
  const selectedId = selected.id
  const ranking = data.rankings[selectedId] ?? []
  const assigned = data.workshops.filter((workshop) => workshop.mode === 'assigned')
  const eligibleTarget = Math.min(
    data.max_rank,
    assigned.filter((workshop) => workshopEligibility(selected, workshop).ok).length,
  )
  const signup = data.signups[selectedId] ?? []
  const interest = data.interests[selectedId] ?? []
  function reorder(workshopId: string, nextIndex: number) {
    const next = ranking.filter((id) => id !== workshopId)
    next.splice(nextIndex, 0, workshopId)
    void actions.change({ type: 'ranking', person_id: selectedId, workshop_ids: next })
  }

  function remove(workshopId: string) {
    void actions.change({
      type: 'ranking',
      person_id: selectedId,
      workshop_ids: ranking.filter((id) => id !== workshopId),
    })
  }

  const selectedWorkshops = data.workshops
  const displayWorkshop = (id: string) => selectedWorkshops.find((workshop) => workshop.id === id)
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(13rem,23%)_minmax(0,1fr)]">
      <FamilyPersonSidebar
        data={data}
        family_id={data.family.id}
        topic="workshops"
        persons={persons}
        selected_person_id={selected.id}
        on_select={onSelect}
        adding={adding}
        on_add_change={setAdding}
        actions={actions}
      />
      <div className="grid min-w-0 gap-5">
        <DetailPreferences
          data={data}
          actions={actions}
          section_keys={['workshops']}
          person_id={selectedId}
        />
        <section
          className="grid gap-3 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow"
          aria-labelledby="workshop-wishes-title"
        >
          <div>
            <h3 id="workshop-wishes-title" className="text-metric">
              Wunschliste
            </h3>
            <p className="text-sm text-muted">
              Bis zu {data.max_rank} Workshops, geordnet nach Wunsch.
            </p>
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
                    <span className="grid size-9 place-items-center rounded-full border-2 border-border bg-main-soft font-bold">
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
                                  disabled={!writable}
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
                            disabled={!writable}
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
                <h3 className="text-metric">{title}</h3>
                <p className="text-sm text-muted">{hint}</p>
              </div>
              {ids.length ? (
                <ul className="grid gap-2">
                  {ids.map((id) => (
                    <li
                      key={id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-base border-2 border-border p-2"
                    >
                      <strong>{displayWorkshop(id)?.title ?? 'Workshop ohne Titel'}</strong>
                      <Button
                        type="button"
                        variant="neutral"
                        disabled={!writable}
                        onClick={() =>
                          void actions.change({
                            type: mode === 'sign-up' ? 'signup' : 'interest',
                            person_id: selectedId,
                            workshop_id: id,
                            selected: false,
                          })
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
  data,
  actions,
  topic = 'zimmer',
  person_id: personId,
  on_select: onSelect,
  on_topic: onTopic,
  topic_link: topicLink,
  back_link: backLink,
  status,
  defer_text: deferText = false,
}: FamilyDetailProps) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null)
  const guarded: FamilyDetailActions = {
    change: async (change) => {
      setPending(true)
      setError(null)
      try {
        await actions.change(change)
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Die Änderung konnte nicht gespeichert werden.',
        )
        throw failure
      } finally {
        setPending(false)
      }
    },
  }
  return (
    <ScreenLayout
      print_context={<p>Ansicht: {familyTopicLabels[topic]}</p>}
      header={
        <ScreenHeader
          title={data.family.display_name}
          eyebrow={backLink}
          description={data.family.email}
          action={
            <FamilyEditDialog key={JSON.stringify(data.family)} data={data} actions={guarded} />
          }
        />
      }
      workflow={status}
      notices={error ? <p role="alert">{error}</p> : null}
      tertiary_navigation={
        <TertiaryNavigation
          aria_label="Familienbereiche"
          value={topic}
          items={familyTopics.map((item) => ({
            value: item,
            label: familyTopicLabels[item],
            link: topicLink(item),
          }))}
          onChange={(value) => onTopic(value as FamilyTopic)}
        />
      }
    >
      <fieldset disabled={pending} className="min-w-0 border-0 p-0">
        <div role="tabpanel" aria-label={familyTopicLabels[topic]} aria-busy={pending}>
          {topic === 'zimmer' ? (
            <FamilyRoomView data={data} actions={guarded} defer_text={deferText} />
          ) : topic === 'personen' ? (
            <FamilyPeopleView
              data={data}
              actions={guarded}
              selected_person_id={personId}
              on_select={onSelect}
            />
          ) : topic === 'essen' ? (
            <FamilyFoodView
              data={data}
              actions={guarded}
              selected_person_id={personId}
              on_select={onSelect}
              defer_text={deferText}
            />
          ) : !data.sections.find((section) => section.key === 'workshops')?.visible ? (
            <p className="rounded-base border-2 border-dashed border-muted p-5">
              Workshopwünsche sind in dieser Planung ausgeschaltet.
            </p>
          ) : (
            <FamilyWorkshopView
              family_id={data.family.id}
              persons={data.people}
              data={data}
              actions={{
                change: async (change) => {
                  try {
                    await guarded.change(change)
                  } catch {
                    /* safe error is rendered above */
                  }
                },
              }}
              selected_person_id={personId}
              on_select={onSelect}
            />
          )}
        </div>
      </fieldset>
    </ScreenLayout>
  )
}
