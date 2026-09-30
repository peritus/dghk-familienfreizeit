import { Badge } from '../../../app/components/ui/badge.js'
import type { FamilyView } from './types.js'

export function ExpandableFamilyMemberList({
  family,
  expanded,
  onToggle,
}: {
  family: FamilyView
  expanded: boolean
  onToggle: () => void
}) {
  const peopleId = `family-people-${family.id}`
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 border-l-4 border-black pl-3 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={peopleId}
        aria-label={`${family.name}: ${expanded ? 'Personen ausblenden' : 'Personen anzeigen'}`}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {family.status ? <Badge tone={family.status.tone}>{family.status.label}</Badge> : null}
          <span className="font-bold">{family.name}</span>
        </span>
        <span className="shrink-0 text-sm text-muted">
          {family.people.length} {family.people.length === 1 ? 'Person' : 'Personen'}
        </span>
      </button>
      {expanded ? (
        <div id={peopleId} className="flex flex-wrap gap-2 border-t-2 border-black pt-2">
          {family.people.map((person) => (
            <Badge key={person.id}>{person.name}</Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
