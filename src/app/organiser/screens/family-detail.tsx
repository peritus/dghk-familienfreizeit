import { useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import type { EventDraft } from '../../../events/types.js'
import { materializePendingEvents } from '../state.js'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { useOrganiser } from '../context.js'
import { findFamily, labelValue } from '../family-data.js'
import { organiserPaths } from '../../../organiser/routes.js'

function makePersonId(givenName: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${globalThis.performance?.now() ?? 0}`
  return `per_${random.replaceAll('-', '').slice(0, 16)}_${givenName.toLowerCase()}`
}

function PersonEditor({
  person_id: personId,
  family_id: familyId,
  actor,
  initial_given_name: initialGivenName,
  initial_family_name: initialFamilyName,
  initial_role: initialRole,
  onStage,
}: {
  person_id: string
  family_id: string
  actor: string
  initial_given_name: string
  initial_family_name: string
  initial_role: string
  onStage: (event: EventDraft) => void
}) {
  const [givenName, setGivenName] = useState(initialGivenName)
  const [familyName, setFamilyName] = useState(initialFamilyName)
  const [role, setRole] = useState(initialRole)

  function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onStage({
      at: new Date().toISOString(),
      actor,
      subject: familyId,
      type: 'PersonUpdated',
      payload: {
        person_id: personId,
        family_id: familyId,
        given_name: givenName.trim(),
        family_name: familyName.trim(),
        birthdate: null,
        role,
      },
    })
  }

  return (
    <form onSubmit={update} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <label className="grid gap-1">
        Vorname
        <input
          required
          value={givenName}
          onChange={(event) => setGivenName(event.target.value)}
          className="min-h-10 rounded border-2 border-black px-2"
        />
      </label>
      <label className="grid gap-1">
        Nachname
        <input
          required
          value={familyName}
          onChange={(event) => setFamilyName(event.target.value)}
          className="min-h-10 rounded border-2 border-black px-2"
        />
      </label>
      <label className="grid gap-1">
        Rolle
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="min-h-10 rounded border-2 border-black px-2"
        >
          <option value="adult">Erwachsene(r)</option>
          <option value="child">Kind</option>
          <option value="infant">Baby</option>
        </select>
      </label>
      <Button type="submit" variant="neutral">
        Ändern vormerken
      </Button>
    </form>
  )
}

export function FamilyDetail({ family_id: familyId }: { family_id?: string }) {
  const { state, world, stage } = useOrganiser()
  const family = familyId ? findFamily(world!, familyId) : null
  const [givenName, setGivenName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [role, setRole] = useState('adult')

  if (!family || !state.principal_email) return <p role="alert">Diese Familie gibt es nicht.</p>

  const selectedFamilyId = family.family.id
  const labels = world!.labels_by_entity[family.family.id] ?? []
  const familyEventSeqs = new Set<number>([
    family.family.created_seq,
    ...world!.labels
      .filter((label) => label.entity_id === family.family.id)
      .map((label) => label.set_seq),
  ])
  for (const person of family.persons) {
    familyEventSeqs.add(person.created_seq)
    for (const label of world!.labels_by_entity[person.id] ?? []) familyEventSeqs.add(label.set_seq)
  }
  const pendingEvents = materializePendingEvents(state)
  const pendingSeqs = new Set(pendingEvents.map((event) => event.seq))
  const history = [...state.committed, ...pendingEvents]
    .filter((event) => event.subject === family.family.id || familyEventSeqs.has(event.seq))
    .sort((a, b) => b.seq - a.seq)

  function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!givenName.trim() || !familyName.trim()) return
    stage([
      {
        at: new Date().toISOString(),
        actor: state.principal_email!,
        subject: selectedFamilyId,
        type: 'PersonAdded',
        payload: {
          person_id: makePersonId(givenName),
          family_id: selectedFamilyId,
          given_name: givenName.trim(),
          family_name: familyName.trim(),
          birthdate: null,
          role,
        },
      },
    ])
    setGivenName('')
    setFamilyName('')
  }

  return (
    <div className="space-y-6">
      <p>
        <Link href={organiserPaths.families()} className="underline">
          ← Familien
        </Link>
      </p>
      <div>
        <p className="text-sm font-bold uppercase tracking-wide">Familie</p>
        <h2 className="text-3xl">{labelValue(labels, 'display-name') ?? family.family.id}</h2>
        <p>{labelValue(labels, 'email') ?? 'Keine E-Mail'}</p>
      </div>
      <Card className="bg-white">
        <CardHeader>
          <h3 className="text-xl">Person hinzufügen</h3>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={addPerson}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          >
            <label className="grid gap-1">
              Vorname
              <input
                required
                value={givenName}
                onChange={(event) => setGivenName(event.target.value)}
                className="min-h-11 rounded border-2 border-black px-3"
              />
            </label>
            <label className="grid gap-1">
              Nachname
              <input
                required
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                className="min-h-11 rounded border-2 border-black px-3"
              />
            </label>
            <label className="grid gap-1">
              Rolle
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="min-h-11 rounded border-2 border-black px-3"
              >
                <option value="adult">Erwachsene(r)</option>
                <option value="child">Kind</option>
                <option value="infant">Baby</option>
              </select>
            </label>
            <Button type="submit">Vormerken</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="bg-white">
        <CardHeader>
          <h3 className="text-xl">Personen · {family.persons.length}</h3>
        </CardHeader>
        <CardContent>
          {family.persons.length === 0 ? (
            <p>Noch keine Personen erfasst.</p>
          ) : (
            <ul className="divide-y-2 divide-black">
              {family.persons.map((person) => {
                const personLabels = world!.labels_by_entity[person.id] ?? []
                return (
                  <li key={person.id} className="space-y-3 py-3">
                    <p>
                      <strong>
                        {labelValue(personLabels, 'given-name')}{' '}
                        {labelValue(personLabels, 'family-name')}
                      </strong>
                      <span className="ml-3">
                        {labelValue(personLabels, 'role') ?? 'ohne Rolle'}
                      </span>
                    </p>
                    <PersonEditor
                      person_id={person.id}
                      family_id={selectedFamilyId}
                      actor={state.principal_email!}
                      initial_given_name={labelValue(personLabels, 'given-name') ?? ''}
                      initial_family_name={labelValue(personLabels, 'family-name') ?? ''}
                      initial_role={labelValue(personLabels, 'role') ?? 'adult'}
                      onStage={(event) => stage([event])}
                    />
                    <Button
                      variant="neutral"
                      onClick={() =>
                        stage([
                          {
                            at: new Date().toISOString(),
                            actor: state.principal_email!,
                            subject: person.id,
                            type: 'PersonWithdrawn',
                            payload: { person_id: person.id, reason: null },
                          },
                        ])
                      }
                    >
                      Rücknahme vormerken
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="bg-white">
        <CardHeader>
          <h3 className="text-xl">Ereignisverlauf</h3>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p>Noch kein Verlauf verfügbar.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((event) => (
                <li key={event.seq} className="border-l-4 border-black pl-3">
                  <p className="font-bold">{event.type}</p>
                  {pendingSeqs.has(event.seq) ? (
                    <p className="text-sm font-bold">Noch nicht angewendet</p>
                  ) : null}
                  <p className="text-sm">
                    #{event.seq} · {event.actor} · {event.at}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
