import type { World } from '../events/fold.js'
import type { OccasionProfile } from '../config/define.js'
import { declaredFeatures } from '../config/features.js'
import {
  deriveFeatureView,
  effectiveFeatureIds,
  sectionOffered,
  type FeatureOverride,
} from '../derive/features.js'
import { derivePhaseStatus, phaseActivation } from '../derive/phases.js'
import { phaseNoticeText } from './notices.js'
import { familyPreferencesConfig } from '../modules/family-preferences/index.js'
import {
  officialWorkshopsWorld,
  workshopEligibilityFailure,
} from '../modules/official-workshops/index.js'
import type { DetailPerson, DetailValue, FamilyDetailData, PreferenceControl } from './model.js'

export function buildFamilyDetailData(
  world: World,
  profile: OccasionProfile,
  familyId: string,
  options: {
    audience: 'family' | 'organiser'
    now: string
    overrides?: readonly FeatureOverride[]
  },
): FamilyDetailData {
  if (world.entity_kind_by_id[familyId] !== 'family') throw new Error('family_not_found')
  const value = (id: string, key: string) =>
    (world.labels_by_entity[id] ?? []).find((label) => label.key === key)?.value
  const text = (id: string, key: string) =>
    typeof value(id, key) === 'string' ? String(value(id, key)) : ''
  const localize = (copy: string | Readonly<Record<string, string>> | null | undefined) =>
    !copy
      ? ''
      : typeof copy === 'string'
        ? copy
        : (copy[profile.meta.locale] ??
          copy[profile.meta.fallback_locale] ??
          Object.values(copy)[0] ??
          '')
  const people: DetailPerson[] = world.persons
    .filter((person) => value(person.id, 'member-of') === familyId)
    .map((person) => ({
      id: person.id,
      given_name: text(person.id, 'given-name'),
      family_name: text(person.id, 'family-name'),
      role: text(person.id, 'role'),
      age: typeof value(person.id, 'age') === 'number' ? Number(value(person.id, 'age')) : null,
    }))
  const phases = derivePhaseStatus({
    world,
    modules: profile.modules,
    meta: profile.meta,
    now: options.now,
  })
  const features = deriveFeatureView({
    world,
    modules: profile.modules,
    overrides: options.overrides ?? [],
    phase_active: phaseActivation(phases),
    principal: options.audience,
  })
  const effective = effectiveFeatureIds(features)
  const params = profile.modules.some((module) => module.id === 'family-preferences')
    ? familyPreferencesConfig(profile)
    : { sections: [], module_controls: [], response_fields: [] }
  const declared = declaredFeatures(profile.modules)
  const sections = params.sections.map((section) => {
    const phase = phases.find((item) => item.phase === section.phase)
    const offered = sectionOffered(section, options.audience, profile.modules, effective)
    const governing = section.features.find((id) => declared.get(id)?.audience === options.audience)
    const availability = features.find((item) => item.feature === governing)
    const closedVisible =
      options.audience === 'family' &&
      phase?.status === 'closed' &&
      availability?.operational !== 'env-off' &&
      (availability?.selected ?? true)
    const title = localize(section.title)
    const notice = phaseNoticeText(section, profile.meta, options.audience, phases)
    return {
      key: section.key,
      title,
      intro: section.intro ? localize(section.intro) : null,
      notice,
      visible: offered || Boolean(closedVisible),
      writable: offered,
    }
  })
  const preferences: Record<string, Record<string, PreferenceControl>> = {}
  for (const section of params.sections) {
    const state = sections.find((item) => item.key === section.key)!
    if (!state.visible) continue
    for (const key of section.traits) {
      const trait = profile.traits[key]
      if (!trait?.family_facing || trait.organiser_only) continue
      const facing = trait.family_facing
      const targets = facing.scope === 'family' ? [familyId] : people.map((person) => person.id)
      for (const targetId of targets) {
        const labels = world.labels_by_entity[targetId] ?? []
        const validity = trait.valid_for?.({
          label: (name) => labels.find((label) => label.key === name)?.value,
        })
        const invalid = validity !== undefined && validity !== true
        const candidates =
          trait.value.kind === 'enum'
            ? trait.value.values.map((item) => ({
                value: item,
                label: localize('copy' in trait ? trait.copy?.[item] : null) || item,
              }))
            : trait.value.kind === 'ref'
              ? (trait.value.entity_kind === 'person'
                  ? people.map((person) => ({
                      value: person.id,
                      label: `${person.given_name} ${person.family_name}`.trim(),
                    }))
                  : trait.value.entity_kind === 'family'
                    ? [{ value: familyId, label: text(familyId, 'display-name') }]
                    : []
                ).map((item) => item)
              : []
        const allowedRefs = new Set(candidates.map((item) => item.value))
        const values = labels
          .filter(
            (label) =>
              label.key === key &&
              (trait.value.kind !== 'ref' ||
                (typeof label.value === 'string' && allowedRefs.has(label.value))),
          )
          .map((label) => ({ value: label.value as DetailValue, strength: label.strength }))
        const control: PreferenceControl = {
          key,
          section_key: section.key,
          target_id: targetId,
          title: localize(facing.title),
          help: facing.help ? localize(facing.help) : null,
          kind: facing.control,
          invert: facing.invert,
          strengths: facing.strengths ?? [],
          options: candidates,
          answer: {
            values,
            answered:
              values.length > 0 ||
              labels.some((label) => label.key === `response-${key}` && label.value === true),
          },
          disabled: !state.writable || invalid,
          disabled_reason: invalid
            ? typeof validity === 'string'
              ? validity
              : 'Diese Angabe ist derzeit nicht verfügbar.'
            : !state.writable
              ? 'Diese Angaben sind festgelegt.'
              : null,
        }
        ;(preferences[targetId] ??= {})[key] = control
      }
    }
  }
  const workshopSection = sections.find((section) => section.key === 'workshops')
  const catalogue =
    workshopSection?.visible && profile.modules.some((module) => module.id === 'official-workshops')
      ? officialWorkshopsWorld(world).workshops
      : []
  const workshops = catalogue.map((workshop) => ({
    id: workshop.id,
    title: workshop.title,
    description: workshop.description,
    mode: workshop.mode,
    audience: workshop.audience,
    age_min: workshop.age_min,
    age_max: workshop.age_max,
    capacity: workshop.capacity,
    signed_up_count: (world.labels_by_key['signed-up-for'] ?? []).filter(
      (label) => label.value === workshop.id,
    ).length,
    eligibility: Object.fromEntries(
      people.map((person) => {
        const failure = workshopEligibilityFailure(person, workshop)
        return [
          person.id,
          failure === null
            ? null
            : {
                infant: 'Babys können hier nicht teilnehmen.',
                'age-unknown':
                  'Das Alter muss eingetragen sein, damit die Altersgrenze geprüft werden kann.',
                'age-too-young': `Ab ${workshop.age_min} Jahren.`,
                'age-too-old': `Bis ${workshop.age_max} Jahre.`,
                'audience-children': 'Dieser Workshop ist für Kinder.',
                'audience-adults': 'Dieser Workshop ist für Erwachsene.',
              }[failure],
        ]
      }),
    ),
  }))
  const visibleWorkshops = new Set(workshops.map((item) => item.id))
  const rankings: Record<string, string[]> = {},
    signups: Record<string, string[]> = {},
    interests: Record<string, string[]> = {}
  for (const person of people) {
    const labels = world.labels_by_entity[person.id] ?? []
    const ranked = labels
      .filter((label) => label.key === 'prefers-workshop')
      .flatMap((label) => {
        const v = label.value
        return v &&
          typeof v === 'object' &&
          !Array.isArray(v) &&
          typeof v.workshop_id === 'string' &&
          typeof v.rank === 'number' &&
          visibleWorkshops.has(v.workshop_id)
          ? [{ id: v.workshop_id, rank: v.rank }]
          : []
      })
      .sort((a, b) => a.rank - b.rank)
    rankings[person.id] = ranked.map((item) => item.id)
    for (const [key, destination] of [
      ['signed-up-for', signups],
      ['interested-in', interests],
    ] as const)
      destination[person.id] = labels
        .filter(
          (label) =>
            label.key === key &&
            typeof label.value === 'string' &&
            visibleWorkshops.has(label.value),
        )
        .map((label) => String(label.value))
  }
  const rankingParams = profile.modules.find((module) => module.id === 'workshop-rankings')
    ?.parameters as { max_rank?: number } | undefined
  return {
    family: {
      id: familyId,
      display_name: text(familyId, 'display-name'),
      email: text(familyId, 'email'),
    },
    people,
    sections,
    preferences,
    workshops,
    max_rank: rankingParams?.max_rank ?? 3,
    rankings,
    signups,
    interests,
    can_edit_email: options.audience === 'organiser',
    can_remove_person: options.audience === 'organiser',
  }
}
