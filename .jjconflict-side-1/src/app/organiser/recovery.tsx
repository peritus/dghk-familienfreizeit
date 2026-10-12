import { useState } from 'react'
import type { AttentionItem } from '../../attention/types.js'
import { Button } from '../components/shared/ui/button.js'
import { DraftGroupEditor } from './draft-group-editor.js'
import { useOrganiser } from './context.js'
import { AttentionDetails } from './attention.js'
export function AttentionRecovery({ findings }: { findings: readonly AttentionItem[] }) {
  const { state, baseline_world: baselineWorld } = useOrganiser()
  const [group, setGroup] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      {baselineWorld ? (
        <p className="text-sm text-muted">
          Namen und Auswahlmöglichkeiten stammen aus dem gespeicherten Datenstand. Die Entwürfe sind
          noch nicht gültig.
        </p>
      ) : null}
      {findings.map((item) => (
        <section key={item.id}>
          <h2 className="font-bold">{item.wording.title}</h2>
          <AttentionDetails item={item} />
        </section>
      ))}
      {state.drafts.flatMap((draft) =>
        draft.id
          ? [
              <Button
                key={draft.id}
                variant="neutral"
                disabled={state.submitted_groups?.includes(draft.id)}
                onClick={() => setGroup(draft.id!)}
              >
                Änderungsgruppe {draft.id.replace('group-', '')} prüfen …
              </Button>,
            ]
          : [],
      )}
      {group ? <DraftGroupEditor group_id={group} onClose={() => setGroup(null)} /> : null}
    </div>
  )
}
