import { check, fact } from '../../attention/helpers.js'
import type { AttentionContext } from '../../attention/types.js'
import type { OfficialWorkshopsSummary } from './index.js'
function summary(c: AttentionContext) {
  const value = c.world!.summaries['official-workshops']
  if (!value) throw new Error('missing workshop facts')
  return value as OfficialWorkshopsSummary
}
export function workshopAgeAdvisory(
  w: Pick<OfficialWorkshopsSummary['workshops'][number], 'audience' | 'age_min' | 'age_max'>,
): boolean {
  return (
    (w.audience === 'adults' && w.age_min < 16) || (w.audience === 'children' && w.age_max > 17)
  )
}

export const officialWorkshopAttention = [
  check(
    'official-workshops.zero-capacity',
    'official-workshops',
    ['Workshop ohne Plätze', 'Workshop without capacity'],
    (c) =>
      summary(c)
        .workshops.filter((w) => w.capacity === 0)
        .map((w) => fact(c, [w.id], [w.id], { capacity: 0 })),
    { scopes: ['dashboard', 'workshop'] },
  ),
  check(
    'official-workshops.age-advisory',
    'official-workshops',
    ['Alter und Zielgruppe prüfen', 'Review age and audience'],
    (c) =>
      summary(c)
        .workshops.filter(workshopAgeAdvisory)
        .map((w) =>
          fact(
            c,
            [w.id],
            [w.id],
            { audience: w.audience, age_min: w.age_min, age_max: w.age_max },
            { acknowledge: true },
          ),
        ),
    {
      kind: 'review',
      scopes: ['dashboard', 'workshop', 'closing'],
      detail: (fact) =>
        fact.evidence.audience === 'adults'
          ? {
              de: 'Die Zielgruppe ist Erwachsene, aber das Mindestalter liegt unter 16 Jahren.',
              en: 'The audience is adults, but the minimum age is below 16.',
            }
          : {
              de: 'Die Zielgruppe ist Kinder, aber das Höchstalter liegt über 17 Jahren.',
              en: 'The audience is children, but the maximum age is above 17.',
            },
    },
  ),
  check(
    'official-workshops.leader-missing',
    'official-workshops',
    ['Leitung fehlt', 'Leader missing'],
    (c) =>
      summary(c)
        .workshops.filter((w) => w.leader_ids.length === 0)
        .map((w) => fact(c, [w.id], [w.id], { leaders: [] }, { acknowledge: true })),
    {
      kind: 'review',
      scopes: ['dashboard', 'workshop', 'closing'],
      detail: () => ({
        de: 'Für diesen Workshop ist keine Leitung angegeben.',
        en: 'No leader has been specified for this workshop.',
      }),
    },
  ),
  check(
    'official-workshops.leader-unavailable',
    'official-workshops',
    ['Leitung nicht verfügbar', 'Leader unavailable'],
    (c) =>
      summary(c)
        .workshops.filter((w) => w.leader_ids.some((id) => !c.world!.entity_kind_by_id[id]))
        .map((w) =>
          fact(
            c,
            [w.id],
            [w.id],
            {
              leaders: [...w.leader_ids].sort(),
              unavailable: w.leader_ids.filter((id) => !c.world!.entity_kind_by_id[id]).sort(),
            },
            { acknowledge: true },
          ),
        ),
    {
      kind: 'review',
      scopes: ['dashboard', 'workshop', 'closing'],
      detail: () => ({
        de: 'Mindestens eine eingetragene Leitung ist nicht mehr verfügbar.',
        en: 'At least one recorded leader is no longer available.',
      }),
    },
  ),
]
