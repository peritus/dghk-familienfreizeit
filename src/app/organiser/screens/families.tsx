import { useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import type { EventDraft } from '../../../events/types.js'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
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
      <Card className="bg-white">
        <CardHeader>
          <h3 className="text-xl">Familie einladen</h3>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={invite}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <label className="grid gap-1">
              Name
              <input
                required
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value)
                  setInviteError(null)
                }}
                className="min-h-11 rounded border-2 border-black px-3"
              />
            </label>
            <label className="grid gap-1">
              E-Mail
              <input
                required
                type="email"
                value={email}
                aria-invalid={inviteError ? true : undefined}
                aria-describedby={inviteError ? 'invite-error' : undefined}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setInviteError(null)
                }}
                className="min-h-11 rounded border-2 border-black px-3"
              />
            </label>
            <Button type="submit">Zur offenen Liste</Button>
          </form>
          {inviteError ? (
            <p id="invite-error" role="alert" className="mt-3">
              {inviteError}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded border-2 border-black bg-white">
        <table className="w-full min-w-[38rem] text-left">
          <caption className="p-4 text-left font-bold">Familien im aktuellen Ereignisstand</caption>
          <thead className="border-y-2 border-black">
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
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.family.id} className="border-b border-black last:border-b-0">
                <th scope="row" className="p-3 font-bold">
                  <Link href={organiserPaths.family_detail(row.family.id)} className="underline">
                    {row.display_name}
                  </Link>
                </th>
                <td className="p-3">{row.email}</td>
                <td className="p-3">{row.persons.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p role="status" className="p-4">
            Noch keine Familien erfasst.
          </p>
        ) : null}
      </div>
    </div>
  )
}
