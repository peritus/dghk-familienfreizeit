import { useMemo, useState, type FormEvent } from 'react'
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
  const { world, state, dispatch } = useOrganiser()
  const [search, setSearch] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const rows = useMemo(
    () =>
      familyRows(world!).filter((row) =>
        `${row.display_name} ${row.email}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [world, search],
  )
  function stage(events: readonly EventDraft[]) {
    dispatch({ type: 'stage', events })
  }

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!state.principal_email || !displayName.trim() || !email.includes('@')) return
    stage([
      {
        at: new Date().toISOString(),
        actor: state.principal_email,
        subject: null,
        type: 'FamilyInvited',
        payload: {
          family_id: id('fam_'),
          email,
          display_name: displayName.trim(),
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
        <label className="grid gap-1">
          Suche
          <input
            aria-label="Familien suchen"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-11 rounded border-2 border-black px-3"
          />
        </label>
      </div>
      <Card className="bg-white">
        <CardHeader>
          <h3 className="text-xl">Familie einladen</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="grid gap-1">
              Name
              <input
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="min-h-11 rounded border-2 border-black px-3"
              />
            </label>
            <label className="grid gap-1">
              E-Mail
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11 rounded border-2 border-black px-3"
              />
            </label>
            <Button type="submit">Zur offenen Liste</Button>
          </form>
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
        {rows.length === 0 ? <p className="p-4">Keine Familien gefunden.</p> : null}
      </div>
    </div>
  )
}
