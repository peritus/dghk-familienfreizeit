import type { ReactNode } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../../../../../app/components/shared/ui/alert.js'
import { Badge } from '../../../../../app/components/shared/ui/badge.js'
import { Button } from '../../../../../app/components/shared/ui/button.js'
import { Card, CardContent } from '../../../../../app/components/shared/ui/card.js'
import {
  StatsStrip,
  type StatsStripItem,
} from '../../../../../app/components/shared/ui/stats-strip.js'
import {
  OrganiserScreenHeader,
  OrganiserSectionHeader,
} from '../../../../../app/organiser/components/layout.js'
import { cn } from '../../../../../app/lib/utils.js'
import type { FindingView, StatusLabel } from '../../screens/assignment-board/types.js'

const severityTone = { error: 'danger', warning: 'attention', info: 'neutral' } as const
const severityLabel = { error: 'Fehler', warning: 'Warnung', info: 'Hinweis' } as const

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
      <OrganiserScreenHeader title={title} actions={actions} />
      {eyebrow || description ? (
        <p className="-mt-6 text-muted">{[eyebrow, description].filter(Boolean).join(' · ')}</p>
      ) : null}
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
  return <OrganiserSectionHeader title={title} detail={detail} action={action} />
}

export function StatusBadge({ status }: { status: StatusLabel }) {
  return <Badge tone={status.tone}>{status.label}</Badge>
}

export function MetricsStrip({ items }: { items: readonly StatsStripItem[] }) {
  return <StatsStrip items={items} />
}

export function FindingCard({ finding }: { finding: FindingView }) {
  return (
    <Card
      className={cn('bg-secondary-background p-0', finding.severity === 'error' && 'border-danger')}
    >
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
        <Alert className="bg-secondary-background">
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

export function MetaLine({ items }: { items: readonly { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border-l-4 border-border pl-3">
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
    <Card className="bg-secondary-background">
      <CardContent className="space-y-3 p-8 text-center">
        <h2 className="text-2xl">{title}</h2>
        <p className="mx-auto max-w-lg text-muted">{description}</p>
        {action ? <div className="flex justify-center">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
