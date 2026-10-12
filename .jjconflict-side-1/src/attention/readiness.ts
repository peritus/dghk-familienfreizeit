import type { AttentionCheck } from './types.js'
import { composeAttention } from './engine.js'
import { attentionBlockers } from './selectors.js'
import type { PhaseReadiness } from '../config/phases.js'
/** Compatibility of the phase contract is presentation over registered operation policies. */
export function attentionReadiness(
  area: 'accommodation' | 'workshops',
  checks: readonly AttentionCheck[],
): PhaseReadiness {
  const evaluate = composeAttention(checks)
  return ({ world, plan }) => {
    const result = evaluate({
      world,
      plan,
      domain: 'available',
      profile: {
        modules: [],
        traits: {},
        validation_view: {},
        meta: { locale: 'de', fallback_locale: 'en' },
      },
      build_revision: plan?.meta.build_revision ?? 'unavailable',
      locale: 'de',
      now: '1970-01-01T00:00:00.000Z',
      audience: 'organiser',
    })
    const blockers = attentionBlockers(
      result,
      area === 'accommodation' ? 'close-accommodation' : 'close-workshops',
    )
    return blockers.length
      ? {
          ready: false,
          findings: blockers.map((item) => ({
            id: item.id,
            subject_id: item.subjects[0]?.id ?? null,
            message: item.wording.detail,
          })),
        }
      : { ready: true }
  }
}
