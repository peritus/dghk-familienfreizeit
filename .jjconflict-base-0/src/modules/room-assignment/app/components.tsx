import type { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '../../../app/components/ui/alert.js'
import { Badge } from '../../../app/components/ui/badge.js'
import { Button } from '../../../app/components/ui/button.js'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../app/components/ui/card.js'
import { cn } from '../../../app/lib/utils.js'
import type { FamilyView, FindingView, RoomView, StatusLabel } from './types.js'

const severityTone = {
  error: 'danger',
  warning: 'attention',
  info: 'neutral',
} as const

const severityLabel = {
  error: 'Fehler',
  warning: 'Warnung',
  info: 'Hinweis',
} as const

export function ScreenFrame({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-8 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-6">
        <div className="max-w-3xl space-y-2">
          {eyebrow ? (
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
          ) : null}
          <h1 className="text-3xl leading-tight sm:text-5xl">{title}</h1>
          {description ? <p className="max-w-2xl text-lg text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  )
}

export function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string
  detail?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl">{title}</h2>
        {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function StatusBadge({ status }: { status: StatusLabel }) {
  return <Badge tone={status.tone}>{status.label}</Badge>
}

export function MetricsStrip({
  items,
}: {
  items: readonly { value: string | number; label: string; tone?: StatusLabel['tone'] }[]
}) {
  return (
    <Card className="bg-white p-0">
      <div
        className={cn(
          'grid grid-cols-2 divide-y-2 divide-black sm:divide-x-2 sm:divide-y-0',
          items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4',
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="p-4 text-center">
            <p className={cn('text-4xl leading-none', item.tone === 'attention' && 'text-main')}>
              {item.value}
            </p>
            <p className="mt-2 font-bold">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function FindingCard({ finding }: { finding: FindingView }) {
  return (
    <Card className={cn('bg-white p-0', finding.severity === 'error' && 'border-danger')}>
      <CardContent className="flex flex-wrap items-start gap-4 p-5">
        <Badge tone={severityTone[finding.severity]}>{severityLabel[finding.severity]}</Badge>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg">{finding.title}</h3>
          <p className="mt-1 text-muted">{finding.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {finding.subjects.map((subject) => (
              <Badge key={subject}>{subject}</Badge>
            ))}
          </div>
        </div>
        {finding.action ? (
          <Button variant="neutral" size="sm">
            {finding.action}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function FindingsList({
  findings,
  title = 'Hinweise',
}: {
  findings: readonly FindingView[]
  title?: string
}) {
  return (
    <section className="space-y-4" aria-labelledby="findings-title">
      <SectionHeading title={title} detail={`${findings.length} Einträge`} />
      {findings.length === 0 ? (
        <Alert className="bg-white">
          <AlertTitle>Keine offenen Hinweise</AlertTitle>
          <AlertDescription>Für diesen Bereich ist aktuell nichts zu prüfen.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3">
          {findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      )}
    </section>
  )
}

export function FamilyCard({
  family,
  reason,
  action,
  onAction,
  expanded,
  onToggle,
}: {
  family: FamilyView
  reason?: string
  action?: string
  onAction?: () => void
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <FamilySummary family={family} expanded={expanded} onToggle={onToggle} />
        {family.requirements.length > 0 ? (
          <CardDescription>{family.requirements.join(' · ')}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {reason ? <p className="border-l-4 border-danger pl-3 text-sm">{reason}</p> : null}
        {action && onAction ? (
          <Button variant="neutral" size="sm" onClick={onAction}>
            {action}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function FamilySummary({
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
          {family.status ? <StatusBadge status={family.status} /> : null}
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

export function RoomCard(props: {
  room: RoomView
  expanded_family_ids: ReadonlySet<string>
  onToggleFamily: (familyId: string) => void
}) {
  const { room, onToggleFamily } = props
  const free = room.capacity - room.occupied
  const isFull = free === 0
  return (
    <Card
      className={cn(
        'p-0',
        isFull ? 'bg-secondary-background' : 'bg-white',
        room.state === 'infeasible' && 'border-danger bg-danger/10',
      )}
    >
      <CardHeader className="p-5">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">{room.name}</CardTitle>
          <Badge tone={room.state === 'infeasible' ? 'danger' : isFull ? 'attention' : 'success'}>
            {room.state === 'infeasible' ? 'Nicht möglich' : isFull ? 'Voll' : `${free} frei`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="flex flex-wrap gap-2">
          {room.capabilities.map((capability) => (
            <Badge key={capability}>{capability}</Badge>
          ))}
        </div>
        {room.occupants.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-wide text-muted">Belegung</p>
            {room.occupants.map((family) => (
              <FamilySummary
                key={family.id}
                family={family}
                expanded={props.expanded_family_ids.has(family.id)}
                onToggle={() => onToggleFamily(family.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted">Noch keine Familie zugeordnet.</p>
        )}
        {room.reasons?.map((reason) => (
          <p key={reason} className="border-l-4 border-danger pl-3 text-sm">
            {reason}
          </p>
        ))}
        {room.soft_notes?.map((note) => (
          <p key={note} className="text-sm text-muted">
            {note}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}

export function MetaLine({ items }: { items: readonly { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border-l-4 border-black pl-3">
          <dt className="text-sm font-bold uppercase tracking-wide text-muted">{item.label}</dt>
          <dd className="mt-1 font-bold">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="bg-white">
      <CardContent className="space-y-3 p-8 text-center">
        <h2 className="text-2xl">{title}</h2>
        <p className="mx-auto max-w-lg text-muted">{description}</p>
        {action ? <div className="flex justify-center">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
