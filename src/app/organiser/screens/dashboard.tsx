import { Link } from 'wouter'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { useOrganiser } from '../context.js'
import { familyRows } from '../family-data.js'
import { pendingEventCount } from '../state.js'
import { organiserPaths } from '../../../organiser/routes.js'

export function Dashboard() {
  const { state, world } = useOrganiser()
  const families = familyRows(world!)
  const people = families.reduce((total, family) => total + family.persons.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide">Übersicht</p>
        <h2 className="text-3xl">Was braucht heute Aufmerksamkeit?</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-white">
          <CardHeader>
            <h3 className="font-bold">Familien</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl">{families.length}</p>
            <Link href={organiserPaths.families()} className="underline">
              Familien öffnen
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader>
            <h3 className="font-bold">Personen</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl">{people}</p>
            <p>Aktive Personen im Ereignisstand</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader>
            <h3 className="font-bold">Ereignisstand</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl">{world!.head_seq}</p>
            <p>Zuletzt abgeleitet</p>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-white">
        <CardHeader>
          <h3 className="text-xl">Hinweise</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {world!.diagnostics.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5">
              {world!.diagnostics.map((diagnostic) => (
                <li key={`${diagnostic.id}:${diagnostic.subject_id}`}>{diagnostic.message}</li>
              ))}
            </ul>
          ) : (
            <p>Keine Hinweise aus dem aktuellen Ereignisstand.</p>
          )}
          <p>
            {pendingEventCount(state) === 0
              ? 'Es gibt keine offenen Änderungen.'
              : `${pendingEventCount(state)} offene Änderungen warten auf Anwendung.`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
