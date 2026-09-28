import { useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import type { EventDraft } from '../../../events/types.js'
import { Button } from '../../components/ui/button'
import { useOrganiser } from '../context.js'
import { familyRows } from '../family-data.js'
import { organiserPaths } from '../../../organiser/routes.js'

function id(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}${random.replaceAll('-', '').slice(0, 16)}`
}

export function Families() {
  const { world, state, stage: stageEvents } = useOrganiser()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const rows = familyRows(world!)
  function stage(events: readonly EventDraft[]) {
    stageEvents(events)
  }

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = displayName.trim()
    const trimmedEmail = email.trim()
    if (!state.principal_email) return
    if (!trimmedName) {
      setInviteError('Bitte gib einen Familiennamen ein.')
      return
    }
    if (!trimmedEmail.includes('@')) {
      setInviteError('Bitte gib eine gültige E-Mail-Adresse ein.')
      return
    }
    setInviteError(null)
    stage([
      {
        at: new Date().toISOString(),
        actor: state.principal_email,
        subject: null,
        type: 'FamilyInvited',
        payload: {
          family_id: id('fam_'),
          email: trimmedEmail,
          display_name: trimmedName,
          locale: 'de',
        },
      },
    ])
    setDisplayName('')
    setEmail('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">Kernel</p>
          <h2 className="text-3xl">Familien · {rows.length}</h2>
        </div>
      </div>
      <div className="rounded border-2 border-black bg-white shadow-shadow">
        <form id="invite-family-form" noValidate onSubmit={invite} />
        <table className="w-full text-left max-md:block">
          <caption className="p-4 text-left font-bold">Alle Familien</caption>
          <thead className="border-y-2 border-black max-md:hidden">
            <tr>
              <th scope="col" className="p-3">
                Familie
              </th>
              <th scope="col" className="p-3">
                E-Mail
              </th>
              <th scope="col" className="p-3">
                Personen
              </th>
              <th scope="col" className="p-3">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="max-md:block">
            <tr className="border-b-2 border-black bg-main/15 max-md:mb-3 max-md:block max-md:border-2 max-md:p-3">
              <th scope="row" className="p-3 align-bottom max-md:block max-md:p-0">
                <label htmlFor="invite-family-name" className="grid gap-1">
                  <span className="md:sr-only">Name</span>
                  <input
                    id="invite-family-name"
                    form="invite-family-form"
                    required
                    value={displayName}
                    onChange={(event) => {
                      setDisplayName(event.target.value)
                      setInviteError(null)
                    }}
                    className="min-h-11 rounded border-2 border-black px-3"
                  />
                </label>
              </th>
              <td className="p-3 align-bottom max-md:block max-md:p-0 max-md:pt-2">
                <label htmlFor="invite-family-email" className="grid gap-1">
                  <span className="md:sr-only">E-Mail</span>
                  <input
                    id="invite-family-email"
                    form="invite-family-form"
                    required
                    type="email"
                    value={email}
                    aria-invalid={inviteError ? true : undefined}
                    aria-describedby={inviteError ? 'invite-error' : undefined}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setInviteError(null)
                    }}
                    className="min-h-11 w-full rounded border-2 border-black px-3"
                  />
                </label>
              </td>
              <td className="p-3 align-bottom max-md:block max-md:p-0 max-md:pt-2">
                <span className="block text-center text-2xl max-md:hidden">—</span>
                <span className="font-bold md:hidden">Personen: —</span>
              </td>
              <td className="p-3 align-bottom max-md:block max-md:p-0 max-md:pt-2">
                <Button form="invite-family-form" type="submit" className="w-full md:w-auto">
                  Familie einladen
                </Button>
              </td>
            </tr>
            {rows.map((row) => (
              <tr
                key={row.family.id}
                className="border-b border-black last:border-b-0 max-md:mb-3 max-md:block max-md:border-2 max-md:p-3"
              >
                <th scope="row" className="p-3 font-bold">
                  <span className="mr-2 md:hidden">Familie:</span>
                  <Link href={organiserPaths.family_detail(row.family.id)} className="underline">
                    {row.display_name}
                  </Link>
                </th>
                <td className="p-3 max-md:block max-md:pt-1">
                  <span className="mr-2 font-bold md:hidden">E-Mail:</span>
                  {row.email}
                </td>
                <td className="p-3 max-md:block max-md:pt-1">
                  <span className="mr-2 font-bold md:hidden">Personen:</span>
                  {row.persons.length}
                </td>
                <td className="p-3 max-md:block max-md:pt-1">
                  <Link href={organiserPaths.family_detail(row.family.id)} className="underline">
                    Öffnen
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inviteError ? (
          <p id="invite-error" role="alert" className="border-t-2 border-black p-4">
            {inviteError}
          </p>
        ) : null}
        {rows.length === 0 ? (
          <p role="status" className="p-4">
            Noch keine Familien erfasst.
          </p>
        ) : null}
      </div>
    </div>
  )
}
