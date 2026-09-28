import { Link } from 'wouter'
import { Check } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { cn } from '../../lib/utils.js'
import { useOrganiser } from '../context.js'
import { familyRows } from '../family-data.js'
import { organiserPaths } from '../../../organiser/routes.js'

const overviewCardClassName = 'block rounded-base border-2 border-black bg-white p-6'

export function Dashboard() {
  const { world } = useOrganiser()
  const families = familyRows(world!)
  const people = families.reduce((total, family) => total + family.persons.length, 0)
  const diagnostics = world!.diagnostics

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <h1 className="text-3xl font-heading sm:text-4xl">Was braucht heute Aufmerksamkeit?</h1>
        {diagnostics.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold">{diagnostics.length} Hinweise</h2>
            <Card className="mt-4 bg-white p-0">
              <ul className="divide-y-2 divide-black">
                {diagnostics.map((diagnostic) => (
                  <li
                    key={`${diagnostic.id}:${diagnostic.subject_id}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-5"
                  >
                    <p>{diagnostic.message}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ) : (
          <div>
            <h2 className="sr-only">Hinweise</h2>
            <Card className="flex-row items-center gap-4 bg-white p-6">
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-black bg-main"
              >
                <Check className="size-6" />
              </span>
              <div>
                <p className="text-xl font-bold">Alles im Griff</p>
                <p className="text-muted">Heute ist nichts zu erledigen.</p>
              </div>
            </Card>
          </div>
        )}
      </div>
      <div>
        <h2 className="text-xl font-bold">Überblick</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link
            href={organiserPaths.families()}
            className={cn(overviewCardClassName, 'group pressable')}
          >
            <p className="text-5xl leading-none font-heading tracking-tight">{families.length}</p>
            <p className="mt-3 text-lg font-bold">Familien</p>
            <p className="mt-1 text-muted underline group-hover:no-underline">
              Alle Familien ansehen
            </p>
          </Link>
          <div className={overviewCardClassName}>
            <p className="text-5xl leading-none font-heading tracking-tight">{people}</p>
            <p className="mt-3 text-lg font-bold">Personen</p>
            <p className="mt-1 text-muted">angemeldet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
