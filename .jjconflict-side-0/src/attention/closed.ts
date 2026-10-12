import { closedResults } from '../config/phases.js'
import type { OccasionProfile } from '../config/define.js'
import type { World } from '../events/fold.js'
import type { Plan } from '../solver/types.js'
import type { AttentionContext } from './types.js'
export function closedAttentionContext(
  world: World,
  plan: Plan,
  profile: OccasionProfile,
): NonNullable<AttentionContext['closed_changes']> {
  return [...closedResults(profile.modules).values()].flatMap((contribution) => {
    const facts = world.phase_facts.areas[contribution.area],
      closing = facts?.closings.at(-1)
    if (!closing) return []
    const difference = contribution.compare(
      closing.payload,
      contribution.compute({ world, plan }),
      world,
    )
    return [
      {
        area: contribution.area,
        seq: closing.seq,
        closed: facts?.latest?.kind === 'closed',
        changes: difference.changes.map((c) => ({
          kind: c.kind,
          aspect: c.aspect ?? null,
          subject_id: c.subject_id,
          family_id: c.family_id,
          before: c.before_value ?? c.before,
          after: c.after_value ?? c.after,
          family_unknown: c.family_unknown ?? false,
        })),
        family_ids: difference.affected_family_ids,
      },
    ]
  })
}
