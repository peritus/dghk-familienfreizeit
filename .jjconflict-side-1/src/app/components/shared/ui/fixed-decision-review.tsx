import { SectionHeader } from './screen-layout.js'
import { useId } from 'react'
import { Badge } from './badge.js'
import { CollectionList, CollectionRow } from './collection-list.js'
export type FixedDecisionReviewItem = {
  id: string
  subject: string
  fixed_target: string
  automatic_targets: readonly string[]
  status: 'same' | 'overrides' | 'no-automatic' | 'invalid'
}

export function FixedDecisionReview({
  items,
  title = 'Feste Entscheidungen prüfen',
  description = 'Der Vergleich zeigt, was die automatische Berechnung ohne feste Entscheidungen ergeben hätte.',
}: {
  items: readonly FixedDecisionReviewItem[]
  title?: string
  description?: string
}) {
  const headingId = useId()
  if (!items.length) return null
  const status = {
    same: { label: 'gleich', tone: 'success' as const },
    overrides: { label: 'ersetzt automatisch', tone: 'attention' as const },
    'no-automatic': { label: 'keine automatische Zuordnung', tone: 'neutral' as const },
    invalid: { label: 'nicht erfüllbar', tone: 'danger' as const },
  }
  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <SectionHeader id={headingId} title={title} description={description} />
      <CollectionList>
        {items.map((item) => {
          const state = status[item.status]
          return (
            <CollectionRow key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{item.subject}</strong>
                <Badge tone={state.tone}>{state.label}</Badge>
              </div>
              <p className="mt-1 text-sm">
                Fest: <strong>{item.fixed_target}</strong>
                {' · '}
                Automatisch:{' '}
                {item.automatic_targets.length ? (
                  <strong>{item.automatic_targets.join(', ')}</strong>
                ) : (
                  <span className="text-muted">keine Zuordnung</span>
                )}
              </p>
            </CollectionRow>
          )
        })}
      </CollectionList>
    </section>
  )
}
