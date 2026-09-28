import { useState, type FormEvent } from 'react'
import { OrganiserLink } from '../../components/organiser-link.js'
import type { EventDraft } from '../../../events/types.js'
import { materializeDraftEvents } from '../state.js'
import { Button } from '../../components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog.js'
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
  onDelete,
}: {
  person_id: string
  family_id: string
  actor: string
  initial_given_name: string
  initial_family_name: string
  initial_role: string
  onStage: (event: EventDraft) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
    setEditing(false)
  }

  const formId = `person-form-${personId}`

  if (!editing) {
    return (
      <tr className="border-b border-black last:border-b-0 max-md:mb-3 max-md:block max-md:border-2 max-md:p-3">
        <th scope="row" className="p-3 font-bold max-md:block max-md:p-0">
          <span className="mr-2 md:hidden">Vorname:</span>
          {givenName}
        </th>
        <td className="p-3 max-md:block max-md:p-0 max-md:pt-2">
          <span className="mr-2 font-bold md:hidden">Nachname:</span>
          {familyName}
        </td>
        <td className="p-3 max-md:block max-md:p-0 max-md:pt-2">
          <span className="mr-2 font-bold md:hidden">Rolle:</span>
          {role === 'child' ? 'Kind' : role === 'infant' ? 'Baby' : 'Erwachsene(r)'}
        </td>
        <td className="p-3 max-md:block max-md:p-0 max-md:pt-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="neutral" size="sm" onClick={() => setEditing(true)}>
              Bearbeiten
            </Button>
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              Entfernen
            </Button>
          </div>
          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {givenName} {familyName} entfernen?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Die Person wird aus dieser Familie entfernt. Diese Änderung lässt sich nicht über
                  die Familienansicht rückgängig machen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel autoFocus>Behalten</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Ja, entfernen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-black last:border-b-0 max-md:mb-3 max-md:block max-md:border-2 max-md:p-3">
      <th scope="row" className="p-3 align-bottom max-md:block max-md:p-0">
        <form id={formId} onSubmit={update} />
        <label htmlFor={`${formId}-given-name`} className="grid gap-1">
          <span className="md:sr-only">Vorname</span>
          <input
            id={`${formId}-given-name`}
            form={formId}
            required
            value={givenName}
            onChange={(event) => setGivenName(event.target.value)}
            className="min-h-11 w-full rounded border-2 border-black px-3"
          />
        </label>
      </th>
      <td className="p-3 align-bottom max-md:block max-md:p-0 max-md:pt-2">
        <label htmlFor={`${formId}-family-name`} className="grid gap-1">
          <span className="font-bold md:sr-only">Nachname</span>
          <input
            id={`${formId}-family-name`}
            form={formId}
            required
            value={familyName}
            onChange={(event) => setFamilyName(event.target.value)}
            className="min-h-11 w-full rounded border-2 border-black px-3"
          />
        </label>
      </td>
      <td className="p-3 align-bottom max-md:block max-md:p-0 max-md:pt-2">
        <label htmlFor={`${formId}-role`} className="grid gap-1">
          <span className="font-bold md:sr-only">Rolle</span>
          <select
            id={`${formId}-role`}
            form={formId}
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="min-h-11 w-full rounded border-2 border-black px-3"
          >
            <option value="adult">Erwachsene(r)</option>
            <option value="child">Kind</option>
            <option value="infant">Baby</option>
          </select>
        </label>
      </td>
      <td className="p-3 align-bottom max-md:block max-md:p-0 max-md:pt-2">
        <div className="flex flex-wrap gap-2">
          <Button form={formId} type="submit" size="sm">
            Person übernehmen
          </Button>
          <Button type="button" variant="neutral" size="sm" onClick={() => setEditing(false)}>
            Abbrechen
          </Button>
        </div>
      </td>
    </tr>
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
  const draftEvents = materializeDraftEvents(state)
  const draftSeqs = new Set(draftEvents.map((event) => event.seq))
  const history = [...state.committed, ...draftEvents]
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
        <OrganiserLink href={organiserPaths.families()} className="underline">
          ← Familien
        </OrganiserLink>
      </p>
      <div>
        <p className="text-sm font-bold uppercase tracking-wide">Familie</p>
        <h2 className="text-3xl">{labelValue(labels, 'display-name') ?? family.family.id}</h2>
        <p>{labelValue(labels, 'email') ?? 'Keine E-Mail'}</p>
      </div>
      <Card className="bg-white">
        <CardHeader>
          <h3 className="text-xl">Personen · {family.persons.length}</h3>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left max-md:block">
            <caption className="sr-only">Personen dieser Familie</caption>
            <thead className="border-y-2 border-black max-md:hidden">
              <tr>
                <th scope="col" className="p-3">
                  Vorname
                </th>
                <th scope="col" className="p-3">
                  Nachname
                </th>
                <th scope="col" className="p-3">
                  Rolle
                </th>
                <th scope="col" className="p-3">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="max-md:block">
              <tr className="border-b-2 border-black bg-main/15 max-md:mb-3 max-md:block max-md:border-2 max-md:p-3">
                <th scope="row" className="p-3 align-bottom max-md:block max-md:p-0">
                  <form id="add-person-form" onSubmit={addPerson} />
                  <label htmlFor="add-person-given-name" className="grid gap-1">
                    <span className="md:sr-only">Vorname</span>
                    <input
                      id="add-person-given-name"
                      form="add-person-form"
                      required
                      value={givenName}
                      onChange={(event) => setGivenName(event.target.value)}
                      className="min-h-11 w-full rounded border-2 border-black px-3"
                    />
                  </label>
                </th>
                <td className="p-3 align-bottom max-md:block max-md:p-0 max-md:pt-2">
                  <label htmlFor="add-person-family-name" className="grid gap-1">
                    <span className="font-bold md:sr-only">Nachname</span>
                    <input
                      id="add-person-family-name"
                      form="add-person-form"
                      required
                      value={familyName}
                      onChange={(event) => setFamilyName(event.target.value)}
                      className="min-h-11 w-full rounded border-2 border-black px-3"
                    />
                  </label>
                </td>
                <td className="p-3 align-bottom max-md:block max-md:p-0 max-md:pt-2">
                  <label htmlFor="add-person-role" className="grid gap-1">
                    <span className="font-bold md:sr-only">Rolle der neuen Person</span>
                    <select
                      id="add-person-role"
                      form="add-person-form"
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      className="min-h-11 w-full rounded border-2 border-black px-3"
                    >
                      <option value="adult">Erwachsene(r)</option>
                      <option value="child">Kind</option>
                      <option value="infant">Baby</option>
                    </select>
                  </label>
                </td>
                <td className="p-3 align-bottom max-md:block max-md:p-0 max-md:pt-2">
                  <Button form="add-person-form" type="submit" className="w-full md:w-auto">
                    Neue Person hinzufügen
                  </Button>
                </td>
              </tr>
              {family.persons.map((person) => {
                const personLabels = world!.labels_by_entity[person.id] ?? []
                return (
                  <PersonEditor
                    key={person.id}
                    person_id={person.id}
                    family_id={selectedFamilyId}
                    actor={state.principal_email!}
                    initial_given_name={labelValue(personLabels, 'given-name') ?? ''}
                    initial_family_name={labelValue(personLabels, 'family-name') ?? ''}
                    initial_role={labelValue(personLabels, 'role') ?? 'adult'}
                    onStage={(event) => stage([event])}
                    onDelete={() =>
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
                  />
                )
              })}
            </tbody>
          </table>
          {family.persons.length === 0 ? (
            <p className="mt-3" role="status">
              Noch keine Personen erfasst.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card className="bg-white">
        <CardHeader>
          <h3 className="text-xl">Änderungen</h3>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p>Noch keine Änderungen.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((event) => (
                <li key={event.seq} className="border-l-4 border-black pl-3">
                  <p className="font-bold">{changeSummary(event.type)}</p>
                  {draftSeqs.has(event.seq) ? (
                    <p className="text-sm font-bold">Noch nicht gespeichert</p>
                  ) : null}
                  <p className="text-sm">
                    {event.actor} · {formatChangeDate(event.at)}
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

function changeSummary(type: string): string {
  switch (type) {
    case 'FamilyInvited':
      return 'Familie eingeladen'
    case 'PersonAdded':
      return 'Person hinzugefügt'
    case 'PersonUpdated':
      return 'Person geändert'
    case 'PersonWithdrawn':
      return 'Person entfernt'
    default:
      return 'Angabe geändert'
  }
}

function formatChangeDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  const dateStyle = 'dateStyle'
  const timeStyle = 'timeStyle'
  return new Intl.DateTimeFormat('de-DE', {
    [dateStyle]: 'medium',
    [timeStyle]: 'short',
  }).format(date)
}
