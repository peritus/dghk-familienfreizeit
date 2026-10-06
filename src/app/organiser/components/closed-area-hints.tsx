import { OrganiserLink } from '../../components/application/organiser-link.js'
import { Card } from '../../components/shared/ui/card'
import { activeProfile } from '../../../config/index.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { closedAreaState } from '../closed-areas.js'
import { useOrganiser } from '../context.js'

const areas = [
  { area: 'accommodation' as const, label: 'Unterkunft', href: organiserPaths.assignment_board() },
  { area: 'workshops' as const, label: 'Workshops', href: organiserPaths.workshop_allocation() },
]

/**
 * One dashboard Hinweis per closed area that differs from its closed result, linking to the
 * area's review screen (spec/architecture/phases.md §7).
 */
export function ClosedAreaHints() {
  const { world, current_plan: currentPlan, phases } = useOrganiser()
  if (!world) return null
  const differing = areas.flatMap((entry) => {
    const state = closedAreaState({
      modules: activeProfile.modules,
      world,
      plan: currentPlan ?? null,
      phases: phases ?? [],
      area: entry.area,
    })
    const changes = state?.latest && !state.pending ? (state.difference?.changes.length ?? 0) : 0
    return changes > 0
      ? [{ ...entry, changes, families: state!.difference!.affected_family_ids.length }]
      : []
  })
  if (differing.length === 0) return null
  return (
    <div>
      <h2 className="text-xl font-bold">Abweichungen vom festgelegten Ergebnis</h2>
      <Card className="mt-4 bg-secondary-background p-0">
        <ul className="divide-y-2 divide-border">
          {differing.map((entry) => (
            <li key={entry.area} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p>
                {entry.label}: {entry.changes} {entry.changes === 1 ? 'Abweichung' : 'Abweichungen'}{' '}
                vom festgelegten Ergebnis ({entry.families}{' '}
                {entry.families === 1 ? 'Familie' : 'Familien'})
              </p>
              <OrganiserLink href={entry.href} className="underline">
                Prüfen
              </OrganiserLink>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
