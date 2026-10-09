import { check, fact } from '../../attention/helpers.js'
import type { AttentionContext } from '../../attention/types.js'
import type { OfficialWorkshopsSummary } from './index.js'
function summary(c: AttentionContext) { const value = c.world!.summaries['official-workshops']; if (!value) throw new Error('missing workshop facts'); return value as OfficialWorkshopsSummary }
export const officialWorkshopAttention = [
 check('official-workshops.zero-capacity', 'official-workshops', ['Workshop ohne Plätze', 'Workshop without capacity'], c => summary(c).workshops.filter(w => w.capacity === 0).map(w => fact(c, [w.id], [w.id], { capacity: 0 })), { scopes: ['dashboard', 'workshop'] }),
 check('official-workshops.age-advisory', 'official-workshops', ['Alter und Zielgruppe prüfen', 'Review age and audience'], c => summary(c).workshops.filter(w => (w.audience === 'adults' && w.age_min < 16) || (w.audience === 'children' && w.age_max > 17)).map(w => fact(c, [w.id], [w.id], { audience: w.audience, age_min: w.age_min, age_max: w.age_max }, { acknowledge: true })), { kind: 'review', scopes: ['dashboard', 'workshop', 'closing'] }),
 check('official-workshops.leader-missing', 'official-workshops', ['Leitung fehlt', 'Leader missing'], c => summary(c).workshops.filter(w => w.leader_ids.length === 0).map(w => fact(c, [w.id], [w.id], { leaders: [] }, { acknowledge: true })), { kind: 'review', scopes: ['dashboard', 'workshop', 'closing'] }),
 check('official-workshops.leader-unavailable', 'official-workshops', ['Leitung nicht verfügbar', 'Leader unavailable'], c => summary(c).workshops.filter(w => w.leader_ids.some(id => !c.world!.entity_kind_by_id[id])).map(w => fact(c, [w.id], [w.id], { leaders: [...w.leader_ids].sort(), unavailable: w.leader_ids.filter(id => !c.world!.entity_kind_by_id[id]).sort() }, { acknowledge: true })), { kind: 'review', scopes: ['dashboard', 'workshop', 'closing'] }),
]
