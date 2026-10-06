import { OrganiserLink } from '../../components/application/organiser-link.js'
import { Card } from '../../components/shared/ui/card'
import { SuccessState } from '../../components/shared/ui/success-state.js'
import { cn } from '../../lib/utils.js'
import { useOrganiser } from '../context.js'
import { familyRows } from '../family-data.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { OrganiserScreenHeader } from '../components/layout.js'

const overviewCardClassName =
  'block rounded-base border-2 border-border bg-secondary-background p-6'

export function Dashboard() {
  const { world } = useOrganiser()
  const families = familyRows(world!)
  const people = families.reduce((total, family) => total + family.persons.length, 0)
  const diagnostics = world!.diagnostics

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <OrganiserScreenHeader title="Was braucht heute Aufmerksamkeit?" />
        {diagnostics.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold">{diagnostics.length} Hinweise</h2>
            <Card className="mt-4 bg-secondary-background p-0">
              <ul className="divide-y-2 divide-border">
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
            <Card className="flex-row items-center gap-4 bg-secondary-background p-6">
              <SuccessState>Alles im Griff – heute ist nichts zu erledigen.</SuccessState>
            </Card>
          </div>
        )}
      </div>
      <div>
        <h2 className="text-xl font-bold">Überblick</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <OrganiserLink
            href={organiserPaths.families()}
            className={cn(overviewCardClassName, 'group pressable')}
          >
            <p className="text-5xl leading-none font-heading tracking-tight">{families.length}</p>
            <p className="mt-3 text-lg font-bold">Familien</p>
            <p className="mt-1 text-muted underline group-hover:no-underline">
              Alle Familien ansehen
            </p>
          </OrganiserLink>
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
