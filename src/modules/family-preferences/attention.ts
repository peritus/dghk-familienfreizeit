import { localized } from '../../attention/engine.js'
import { check, fact } from '../../attention/helpers.js'
import type { FamilyPreferencesParams } from '../../config/define.js'
import type { AttentionContext } from '../../attention/types.js'
import { deriveFeatureView, effectiveFeatureIds, sectionOffered } from '../../derive/features.js'
import { phaseActivation, derivePhaseStatus, utcInstant } from '../../derive/phases.js'
export function responseAttention(params: FamilyPreferencesParams) {
  const responseTitle = (c: AttentionContext, key: string, de: string, en: string) => ({
    de: `${localized(c.profile.traits[key]?.title ?? key, 'de', c.profile.meta.fallback_locale)}: ${de}`,
    en: `${localized(c.profile.traits[key]?.title ?? key, 'en', c.profile.meta.fallback_locale)}: ${en}`,
  })
  const rows = (c: AttentionContext) =>
    (params.response_fields ?? []).flatMap((field) => {
      const section = params.sections.find((s) => s.traits.includes(field.key))
      if (!section) return []
      const features =
        c.effective_features ??
        effectiveFeatureIds(
          deriveFeatureView({
            modules: c.profile.modules,
            principal: 'organiser',
            overrides: [],
            world: c.world!,
            phase_active: phaseActivation(
              derivePhaseStatus({
                world: c.world!,
                modules: c.profile.modules,
                meta: c.profile.meta,
                now: c.now,
              }),
            ),
          }),
        )
      if (!sectionOffered(section, 'organiser', c.profile.modules, features)) return []
      const trait = c.profile.traits[field.key]
      return (field.scope === 'family' ? c.world!.families : c.world!.persons).flatMap((entity) => {
        const labels = c.world!.labels_by_entity[entity.id] ?? []
        const validity = trait?.valid_for?.({
          label: (key) => labels.find((l) => l.key === key)?.value,
        })
        if (validity !== undefined && validity !== true) return []
        const value = labels.find((l) => l.key === field.key),
          marker = labels.find((l) => l.key === `response-${field.key}` && l.value === true)
        return [{ field, entity, value, marker }]
      })
    })
  return [
    check(
      'family-preferences.response-missing',
      'family-preferences',
      ['Antwort nicht dokumentiert', 'Response not recorded'],
      (c) =>
        rows(c)
          .filter((r) => r.field.requirement === 'requested' && !r.value && !r.marker)
          .map((r) =>
            fact(
              c,
              [r.entity.id, r.field.key],
              [r.entity.id],
              { field: r.field.key },
              {
                title: responseTitle(
                  c,
                  r.field.key,
                  'Antwort nicht dokumentiert',
                  'Response not recorded',
                ),
              },
            ),
          ),
      { areas: ['core'], scopes: ['dashboard', 'family'] },
    ),
    check(
      'family-preferences.response-inconsistent',
      'family-preferences',
      ['Neutral und Wunsch zugleich dokumentiert', 'Neutral response and wish both recorded'],
      (c) =>
        rows(c)
          .filter((r) => r.value && r.marker)
          .map((r) =>
            fact(
              c,
              [r.entity.id, r.field.key],
              [r.entity.id],
              { field: r.field.key },
              {
                title: responseTitle(
                  c,
                  r.field.key,
                  'Neutral und Wunsch zugleich dokumentiert',
                  'Neutral response and wish both recorded',
                ),
              },
            ),
          ),
      { areas: ['core'], scopes: ['dashboard', 'family'] },
    ),
    check(
      'family-preferences.late-save',
      'family-preferences',
      ['Antwort nach dem Zieltermin gespeichert', 'Response saved after target date'],
      (c) =>
        rows(c).flatMap((r) => {
          const section = params.sections.find((s) => s.traits.includes(r.field.key))
          const target = c.profile.meta.phase_dates?.find(
            (p) => p.phase === section?.phase,
          )?.target_at
          const label = r.value ?? r.marker
          return target && label?.set_at && utcInstant(label.set_at) > utcInstant(target)
            ? [
                fact(c, [r.entity.id, r.field.key], [r.entity.id], {
                  field: r.field.key,
                  saved_at: label.set_at,
                  target_at: target,
                }),
              ]
            : []
        }),
      { areas: ['core'], kind: 'information', severity: 'info', scopes: ['family'] },
    ),
  ]
}
