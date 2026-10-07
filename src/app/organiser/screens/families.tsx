import { TableFrame } from '../../components/shared/ui/data-table.js'
import { EmptyState } from '../../components/shared/ui/screen-state.js'
import { TextField } from '../../components/shared/ui/field.js'
import { Search } from 'lucide-react'
import { randomIdPart } from '../ids.js'
import { useMemo, useState, type FormEvent } from 'react'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import type { EventDraft } from '../../../events/types.js'
import { Badge } from '../../components/shared/ui/badge.js'
import { Button } from '../../components/shared/ui/button.js'
import { SegmentedControl } from '../../components/shared/ui/segmented-control.js'
import { useOrganiser } from '../context.js'
import { familyRows, familyStatus } from '../family-data.js'
import { organiserPaths } from '../../../organiser/routes.js'
import {
  ScreenLayout,
  ScreenHeader,
  CollectionSection,
} from '../../components/shared/ui/screen-layout.js'
import { CollectionCreateAction } from '../../components/shared/ui/collection-create-action.js'

type FamilyFilter = 'all' | 'open' | 'complete'

const filterOptions = [
  { value: 'all', label: 'Alle' },
  { value: 'open', label: 'Angaben offen' },
  { value: 'complete', label: 'Vollständig' },
] as const

function id(prefix: string): string {
  return `${prefix}${randomIdPart()}`
}

function familyStatusBadges(open: readonly string[], complete: boolean) {
  if (complete) return <Badge tone="success">✓ Alles angegeben</Badge>
  return (
    <div className="flex flex-wrap gap-2">
      {open.map((item) => (
        <Badge key={item} tone="attention">
          ! {item}
        </Badge>
      ))}
    </div>
  )
}

export function Families() {
  const { world, state, stage: stageEvents } = useOrganiser()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FamilyFilter>('all')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [addingFamily, setAddingFamily] = useState(false)

  const all = useMemo(
    () =>
      familyRows(world!)
        .map((row) => ({ row, status: familyStatus(world!, row) }))
        .sort((a, b) => a.row.display_name.localeCompare(b.row.display_name, 'de')),
    [world],
  )
  const counts = {
    all: all.length,
    open: all.filter(({ status }) => !status.complete).length,
    complete: all.filter(({ status }) => status.complete).length,
  }
  const normalizedQuery = query.trim().toLocaleLowerCase('de')
  const shown = all.filter(({ row, status }) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'open' && !status.complete) ||
      (filter === 'complete' && status.complete)
    if (!matchesFilter) return false
    if (!normalizedQuery) return true
    return [
      row.display_name,
      row.email,
      ...row.persons.map((person) => {
        const labels = world!.labels_by_entity[person.id] ?? []
        return `${
          labels.find((label) => label.key === 'given-name')?.value ?? ''
        } ${labels.find((label) => label.key === 'family-name')?.value ?? ''}`
      }),
    ].some((value) => value.toLocaleLowerCase('de').includes(normalizedQuery))
  })

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = displayName.trim()
    const trimmedEmail = email.trim()
    if (!state.principal_email) return
    if (!trimmedName) {
      setInviteError('Bitte gib einen Familiennamen ein.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setInviteError('Bitte gib eine gültige E-Mail-Adresse ein.')
      return
    }
    if (
      familyRows(world!).some(
        (row) => row.email.toLocaleLowerCase('de') === trimmedEmail.toLocaleLowerCase('de'),
      )
    ) {
      setInviteError('Diese E-Mail ist schon bei einer anderen Familie eingetragen.')
      return
    }
    const familyId = id('fam_')
    stageEvents([
      {
        at: new Date().toISOString(),
        actor: state.principal_email,
        subject: null,
        type: 'FamilyInvited',
        payload: {
          family_id: familyId,
          email: trimmedEmail,
          display_name: trimmedName,
          locale: 'de',
        },
      } satisfies EventDraft,
    ])
    setDisplayName('')
    setEmail('')
    setInviteError(null)
    setAddingFamily(false)
  }

  function resetFilters() {
    setQuery('')
    setFilter('all')
  }

  return (
    <ScreenLayout header={<ScreenHeader title="Familien" />}>
      <CollectionSection
        title="Familienliste"
        action={
          <CollectionCreateAction
            label="Familie hinzufügen"
            title="Familie hinzufügen"
            description="Lege eine Familie mit Namen und E-Mail-Adresse an. Personen kommen anschließend in der Familienansicht dazu."
            open={addingFamily}
            on_open_change={(open) => {
              setAddingFamily(open)
              if (!open) setInviteError(null)
            }}
            error={inviteError}
          >
            <form className="mt-5 grid gap-4" noValidate onSubmit={invite}>
              <TextField
                label="Familienname"
                hint="So erscheint die Familie in Listen und Zimmerplänen."
                id="family-invite-name"
                aria-label="Familienname"
                required
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value)
                  setInviteError(null)
                }}
              />
              <TextField
                label="E-Mail"
                id="family-invite-email"
                aria-label="E-Mail"
                required
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setInviteError(null)
                }}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="neutral" onClick={() => setAddingFamily(false)}>
                  Abbrechen
                </Button>
                <Button type="submit">Familie hinzufügen</Button>
              </div>
            </form>
          </CollectionCreateAction>
        }
        controls={
          <div className="flex flex-wrap items-end gap-4">
            <label className="relative min-w-64 flex-1 sm:max-w-md">
              <span className="sr-only">Familien durchsuchen</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Familie, E-Mail oder Person"
                autoComplete="off"
                className="min-h-12 w-full rounded-base border-2 border-border bg-secondary-background pr-3 pl-10"
              />
            </label>
            <SegmentedControl
              label="Familien filtern"
              value={filter}
              onChange={setFilter}
              options={filterOptions.map((option) => ({
                ...option,
                label: `${option.label} ${counts[option.value]}`,
              }))}
            />
          </div>
        }
      >
        <p className="text-sm text-muted" aria-live="polite">
          {shown.length} von {all.length} Familien
        </p>
        {shown.length ? (
          <TableFrame>
            <table className="w-full text-left max-md:block">
              <caption className="sr-only">Familien</caption>
              <thead className="border-b-2 border-border max-md:hidden">
                <tr>
                  <th scope="col" className="p-4">
                    Familie
                  </th>
                  <th scope="col" className="p-4">
                    Personen
                  </th>
                  <th scope="col" className="p-4">
                    Angaben
                  </th>
                </tr>
              </thead>
              <tbody className="max-md:block">
                {shown.map(({ row, status }) => (
                  <tr
                    key={row.family.id}
                    className="border-b border-border last:border-b-0 max-md:mb-3 max-md:block max-md:border-2 max-md:p-4"
                  >
                    <th scope="row" className="p-4 align-top max-md:block max-md:p-0">
                      <OrganiserLink
                        href={organiserPaths.family_detail(row.family.id)}
                        className="text-lg font-bold underline"
                      >
                        {row.display_name}
                      </OrganiserLink>
                      <span className="mt-1 block text-sm text-muted">{row.email}</span>
                    </th>
                    <td
                      data-label="Personen"
                      className="p-4 align-top max-md:flex max-md:justify-between max-md:gap-4 max-md:p-0 max-md:pt-3"
                    >
                      <span className="font-bold md:sr-only">Personen</span>
                      {row.persons.length ? row.persons.length : '—'}
                    </td>
                    <td
                      data-label="Angaben"
                      className="p-4 align-top max-md:block max-md:p-0 max-md:pt-3"
                    >
                      <span className="mb-2 block font-bold md:sr-only">Angaben</span>
                      {familyStatusBadges(status.open, status.complete)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
        ) : (
          <EmptyState
            title="Keine Familie gefunden."
            action={
              <Button type="button" variant="neutral" onClick={resetFilters}>
                Suche und Filter zurücksetzen
              </Button>
            }
          >
            Keine Familie passt zu Suche und Filter.
          </EmptyState>
        )}
      </CollectionSection>
    </ScreenLayout>
  )
}
