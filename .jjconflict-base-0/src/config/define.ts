import { coreProfileAttentionChecks } from '../attention/catalogue.js'
import type { AttentionCheck } from '../attention/types.js'
import { composeAttention } from '../attention/engine.js'
import type { ZodType } from 'zod'
import {
  guardModuleFold,
  type KernelConfig,
  type LabelSchema,
  type ModuleEventAuthorize,
  type ModuleEventFold,
  type ModuleEventValidate,
  type PhaseEventRole,
  type ResolverDescriptor,
  type WorldCheck,
  type WorldSummaryDefinition,
} from '../events/fold.js'
import { kernelEventTypes, kernelPayloadSchemas, type JsonValue } from '../events/types.js'
import type { PreflightCheck, Rule, SolverInputContribution, SolverStage } from '../solver/types.js'
import { validateFeatures, type FeatureDefinition } from './features.js'
import {
  declaredPhases,
  validateClosedResults,
  validatePhases,
  type ClosedResultContribution,
  type PhaseDate,
  type PhaseDefinition,
} from './phases.js'

export type LocalizedText = string | Readonly<Record<string, string>>

export type ProfileEvent = {
  organiser_title?: LocalizedText
  organisation?: LocalizedText
  title: LocalizedText
  subheading: LocalizedText
  place?: LocalizedText | null
}

export type ProfilePublicLanding = {
  heading: LocalizedText
  intro: LocalizedText
  actions: readonly ProfileLandingAction[]
}

export type ProfileLandingAction = {
  id: string
  label: LocalizedText
  emphasis: 'primary' | 'secondary'
  destination: { kind: 'route'; to: string } | { kind: 'external'; href: string }
}

export type EntityScope = 'family' | 'person' | (string & {})

export type Cardinality = 'zero-or-one' | 'exactly-one' | 'zero-or-more'

export type ValueDefinition =
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'text'; max_length: number }
  | { kind: 'integer'; min?: number; max?: number }
  | { kind: 'decimal'; scale: number }
  | { kind: 'bool' }
  | { kind: 'date' }
  | { kind: 'ref'; entity_kind: string }

export type FamilyControlKind =
  | 'tri-state'
  | 'toggle'
  | 'choice'
  | 'free-text'
  | 'family-picker'
  | 'workshop-sign-up'
  | 'workshop-interest'
  | 'ranking'

export type FamilyFacing = {
  control: FamilyControlKind
  title: LocalizedText
  help?: LocalizedText | null
  scope: 'family' | 'person'
  strengths: readonly ('required' | 'preferred')[] | null
  invert: boolean
}

export type FamilyPreferenceSection = {
  key: string
  title: LocalizedText
  intro: LocalizedText | null
  traits: readonly string[]
  /** The features governing every control in the section, at most one per audience (features.md §3). */
  features: readonly string[]
  /** The governing phase, for Zieltermin and closed notices (family-preferences.md §3). */
  phase: string | null
  /** Copy shown once the phase is late; set exactly when `phase` is. */
  late_contact: LocalizedText | null
}

export type FamilyPreferenceModuleControl = {
  key: string
  section: string
  title: LocalizedText
  help: LocalizedText | null
}

export type ResponseField = {
  key: string
  scope: 'family' | 'person'
  control: 'value' | 'tri-state'
  requirement: 'requested' | 'optional'
}

export type FamilyPreferencesParams = {
  response_fields?: readonly ResponseField[]
  sections: readonly FamilyPreferenceSection[]
  module_controls: readonly FamilyPreferenceModuleControl[]
}

export type FamilyControlDefinition = {
  key: string
  control: FamilyControlKind
}

type TraitBase = {
  title: LocalizedText
  help?: LocalizedText | null
  scopes: readonly EntityScope[]
  value: ValueDefinition
  cardinality?: Cardinality
  aliases?: readonly string[]
  organiser_only?: boolean
  /**
   * Authorization-only precursor to the full `family_facing` control contract
   * (spec/modules/family-preferences.md §6): whether a family may
   * LabelSet/LabelCleared this trait's key on entities it owns. Mutually
   * exclusive with `organiser_only`.
   */
  family_writable?: boolean
  family_facing?: FamilyFacing
  sensitivity?: 'normal' | 'restricted'
  valid_for?: (entity: { label(key: string): JsonValue | undefined }) => boolean | LocalizedText
}

export type PropertyTrait = TraitBase & {
  kind: 'property'
  default?: JsonValue
  copy?: Readonly<Record<string, LocalizedText>>
}

export type CapabilityTrait = TraitBase & {
  kind: 'capability'
  derive?: (entity: { label(key: string): JsonValue | undefined }) => boolean
}

export type RequirementTrait = TraitBase & {
  kind: 'requirement'
  satisfied_by?: string
  structural?: string
  strengths?: readonly ('required' | 'preferred')[]
  weight?: number
  penalty?: number
}

export type RelationTrait = TraitBase & {
  kind: 'relation'
  operator: 'groups-with' | 'separates-from'
  target: readonly string[]
  strengths?: readonly ('required' | 'preferred')[]
  weight?: number
  penalty?: number
}

export type OrderedChoiceTrait = TraitBase & { kind: 'ordered-choice'; per: string; choice: string }

export type NoteTrait = TraitBase & { kind: 'note' }

export type Trait =
  | PropertyTrait
  | CapabilityTrait
  | RequirementTrait
  | RelationTrait
  | OrderedChoiceTrait
  | NoteTrait

export type ProfileMeta = {
  id: string
  name: LocalizedText
  starts_on: string
  ends_on: string
  timezone: string
  locale: string
  fallback_locale: string
  description: LocalizedText
  public_landing: ProfilePublicLanding
  event?: ProfileEvent
  /** Advisory target dates per phase (spec/architecture/phases.md §2). */
  phase_dates?: readonly PhaseDate[]
}

export type ProfileModule = {
  id: string
  requires: readonly string[]
  enhances: readonly string[]
  parameters?: Readonly<Record<string, unknown>>
  /** Kernel-owned feature deselections of this module (profiles/contract.md §1). */
  deselected_features: readonly string[]
  contributions: ModuleContributions
}

export type ModuleContributions = {
  capability_token_prefixes?: readonly string[]
  attention_checks?: readonly AttentionCheck[]
  entity_kinds?: readonly {
    id: string
    prefix: string
    /** Whether the event payload names the id directly, or the fold computes it (modules/contract.md §3.1). Defaults to 'caller-generated'. */
    identity?: 'caller-generated' | 'derived'
  }[]
  events?: readonly {
    type: string
    payload: ZodType<JsonValue>
    fold: ModuleEventFold
    /** State-aware invariant validation run before the event folds. */
    validate?: ModuleEventValidate
    /** Who may append this event type; the module's own authorization rule (modules/contract.md §3.1). */
    authorize: ModuleEventAuthorize
  }[]
  label_keys?: readonly {
    key: string
    scopes: readonly string[]
    validate?: (value: JsonValue) => string | null
    cardinality?: Cardinality
    setup_only?: boolean
  }[]
  trait_roles?: readonly TraitRole[]
  routes?: readonly { route: string }[]
  screens?: readonly ScreenDefinition[]
  reports?: readonly { id: string }[]
  world_summaries?: readonly WorldSummaryDefinition[]
  world_checks?: readonly WorldCheck[]
  solver_input?: readonly SolverInputContribution[]
  stages?: readonly SolverStage[]
  rules?: readonly Rule[]
  preflight_checks?: readonly PreflightCheck[]
  family_controls?: readonly FamilyControlDefinition[]
  features?: readonly FeatureDefinition[]
  phases?: readonly PhaseDefinition[]
  closed_results?: readonly ClosedResultContribution[]
}

export type ScreenDefinition = {
  id: string
  route: string
  label: string
  audience: 'organiser'
}

export type TraitRole = {
  parameter: string
  kind: Trait['kind']
  scopes?: readonly string[]
  operator?: string
}

export type OccasionProfile<Traits extends Record<string, Trait> = Record<string, Trait>> = {
  meta: ProfileMeta
  traits: Readonly<Traits>
  modules: readonly ProfileModule[]
  validation_view: KernelConfig
}

export const enumOf = (values: readonly string[]): ValueDefinition => ({ kind: 'enum', values })

export const text = (options: { max_length: number }): ValueDefinition => ({
  kind: 'text',
  ...options,
})

export const integer = (options: { min?: number; max?: number } = {}): ValueDefinition => ({
  kind: 'integer',
  ...options,
})

export const decimal = (options: { scale: number }): ValueDefinition => ({
  kind: 'decimal',
  ...options,
})

export const bool = (): ValueDefinition => ({ kind: 'bool' })

export const date = (): ValueDefinition => ({ kind: 'date' })

export const ref = (entityKind: string): ValueDefinition => ({
  kind: 'ref',
  entity_kind: entityKind,
})

export const property = (trait: Omit<PropertyTrait, 'kind'>): PropertyTrait => ({
  kind: 'property',
  ...trait,
})

export const capability = (trait: Omit<CapabilityTrait, 'kind'>): CapabilityTrait => ({
  kind: 'capability',
  ...trait,
})

export const requirement = (trait: Omit<RequirementTrait, 'kind'>): RequirementTrait => ({
  kind: 'requirement',
  ...trait,
})

export const relation = (trait: Omit<RelationTrait, 'kind'>): RelationTrait => ({
  kind: 'relation',
  ...trait,
})

export const orderedChoice = (trait: Omit<OrderedChoiceTrait, 'kind'>): OrderedChoiceTrait => ({
  kind: 'ordered-choice',
  ...trait,
})

export const note = (trait: Omit<NoteTrait, 'kind'>): NoteTrait => ({ kind: 'note', ...trait })

export function defineOccasionProfile<Traits extends Record<string, Trait>>(input: {
  meta: ProfileMeta
  traits: Traits
  modules?: readonly ProfileModule[]
}): OccasionProfile<Traits> {
  validateMeta(input.meta)
  const modules = input.modules ?? []
  validateTraits(input.traits, input.meta)
  validateModules(modules, input.traits, input.meta)
  composeAttention(coreProfileAttentionChecks, modules)
  return { ...input, modules, validation_view: validationView(input.traits, modules) }
}

function validateMeta(meta: ProfileMeta): void {
  if (!kebab(meta.id)) throw new Error(`profile id must be kebab-case: ${meta.id}`)
  if (!meta.name || !meta.description) throw new Error('profile copy is required')
  if (!meta.starts_on || !meta.ends_on || meta.starts_on > meta.ends_on)
    throw new Error('profile dates are invalid')
  if (!meta.locale || !meta.fallback_locale) throw new Error('profile locales are required')
  validatePublicLanding(meta, meta.public_landing)
  if (meta.event) {
    if (meta.event.organiser_title) validateCopy(meta, meta.event.organiser_title)
    if (meta.event.organisation) validateCopy(meta, meta.event.organisation)
    validateCopy(meta, meta.event.title)
    validateCopy(meta, meta.event.subheading)
    if (meta.event.place) validateCopy(meta, meta.event.place)
  }
}

function validatePublicLanding(meta: ProfileMeta, landing: ProfilePublicLanding): void {
  validateCopy(meta, landing.heading)
  validateCopy(meta, landing.intro)
  if (!Array.isArray(landing.actions) || landing.actions.length === 0)
    throw new Error('public landing needs at least one action')

  const actionIds = new Set<string>()
  for (const action of landing.actions) {
    if (!kebab(action.id))
      throw new Error(`public landing action id must be kebab-case: ${action.id}`)
    if (actionIds.has(action.id)) throw new Error(`duplicate public landing action: ${action.id}`)
    actionIds.add(action.id)
    validateCopy(meta, action.label)

    if (action.emphasis !== 'primary' && action.emphasis !== 'secondary')
      throw new Error(`invalid emphasis for public landing action: ${action.id}`)

    if (action.destination.kind === 'route') {
      const { to } = action.destination
      if (
        !to.startsWith('/') ||
        to.startsWith('//') ||
        to.includes('\\') ||
        new URL(to, 'https://occasion.invalid').origin !== 'https://occasion.invalid'
      )
        throw new Error(`public landing route must be an in-app path: ${action.id}`)
    } else if (action.destination.kind === 'external') {
      let url: URL
      try {
        url = new URL(action.destination.href)
      } catch {
        throw new Error(`public landing external action needs an HTTPS URL: ${action.id}`)
      }
      if (url.protocol !== 'https:')
        throw new Error(`public landing external action needs an HTTPS URL: ${action.id}`)
    } else {
      throw new Error(`invalid destination for public landing action: ${action.id}`)
    }
  }
}

function validateTraits(traits: Record<string, Trait>, meta: ProfileMeta): void {
  const aliases = new Set<string>()
  for (const [key, trait] of Object.entries(traits)) {
    if (!kebab(key)) throw new Error(`trait key must be kebab-case: ${key}`)
    if (!trait.title || trait.scopes.length === 0)
      throw new Error(`trait ${key} needs title and scopes`)
    validateValue(key, trait.value)
    if (
      trait.kind === 'property' &&
      trait.default !== undefined &&
      validateValueValue(trait.value, trait.default)
    )
      throw new Error(`trait ${key} has invalid default`)
    for (const alias of trait.aliases ?? []) {
      if (!kebab(alias) || traits[alias] || aliases.has(alias))
        throw new Error(`trait alias collides: ${alias}`)
      aliases.add(alias)
    }
    if (trait.kind === 'requirement') {
      if ((trait.satisfied_by === undefined) === (trait.structural === undefined))
        throw new Error(`requirement ${key} needs exactly one satisfier`)
      if (trait.satisfied_by && traits[trait.satisfied_by]?.kind !== 'capability')
        throw new Error(`requirement ${key} needs a capability`)
    }
    for (const [name, value] of [
      ['weight', 'weight' in trait ? trait.weight : undefined],
      ['penalty', 'penalty' in trait ? trait.penalty : undefined],
    ] as const) {
      if (value !== undefined && (!Number.isInteger(value) || (name === 'penalty' && value > 0)))
        throw new Error(
          `trait ${key} ${name} must be an integer${name === 'penalty' ? ' <= 0' : ''}`,
        )
    }
    if (trait.kind === 'property' && trait.copy && trait.value.kind !== 'enum')
      throw new Error(`trait ${key} copy requires enum value`)
    if (trait.organiser_only && trait.family_writable)
      throw new Error(`trait ${key} cannot be both organiser_only and family_writable`)
    validateFamilyFacing(key, trait, meta)
    for (const evaluator of [
      trait.valid_for,
      trait.kind === 'capability' ? trait.derive : undefined,
    ])
      validateEvaluator(key, evaluator)
    validateCopy(meta, trait.title)
  }
}

function validateModules(
  modules: readonly ProfileModule[],
  traits: Record<string, Trait>,
  meta: ProfileMeta,
): void {
  const ids = new Set<string>()
  for (const module of modules) {
    if (!kebab(module.id) || ids.has(module.id))
      throw new Error(`duplicate or invalid module: ${module.id}`)
    ids.add(module.id)
  }
  for (const module of modules) {
    for (const required of module.requires)
      if (!ids.has(required)) throw new Error(`module ${module.id} requires ${required}`)
    for (const role of module.contributions.trait_roles ?? []) {
      const key = module.parameters?.[role.parameter]
      if (typeof key !== 'string' || !traits[key])
        throw new Error(`module ${module.id} role ${role.parameter} names no trait`)
      const trait = traits[key]
      if (
        trait.kind !== role.kind ||
        (role.scopes?.some((scope) => !trait.scopes.includes(scope)) ?? false) ||
        (role.operator && trait.kind === 'relation' && trait.operator !== role.operator)
      )
        throw new Error(`module ${module.id} role ${role.parameter} has wrong trait shape`)
    }
  }
  duplicate(
    modules.flatMap((module) => module.contributions.stages?.map(({ id }) => `stage:${id}`) ?? []),
  )
  duplicate(
    modules.flatMap((module) => module.contributions.rules?.map(({ id }) => `rule:${id}`) ?? []),
  )
  duplicate(
    modules.flatMap(
      (module) => module.contributions.preflight_checks?.map(({ id }) => `preflight:${id}`) ?? [],
    ),
  )
  const labelOwners = new Map<string, string>()
  for (const module of modules) {
    for (const label of module.contributions.label_keys ?? []) {
      for (const scope of label.scopes) {
        const ownership = `${label.key}\u0000${scope}`
        const owner = labelOwners.get(ownership)
        if (owner)
          throw new Error(
            `duplicate module label ownership: ${label.key} on ${scope} (${owner}, ${module.id})`,
          )
        labelOwners.set(ownership, module.id)
      }
    }
  }
  for (const [key, trait] of Object.entries(traits)) {
    for (const scope of trait.scopes) {
      const owner = labelOwners.get(`${key}\u0000${scope}`)
      if (owner)
        throw new Error(
          `profile trait ${key} overlaps module label ownership on ${scope} (${owner})`,
        )
    }
  }
  duplicate([
    ...kernelEntityKinds.map((id) => `entity:${id}`),
    ...modules.flatMap(
      (module) => module.contributions.entity_kinds?.map(({ id }) => `entity:${id}`) ?? [],
    ),
  ])
  duplicate([
    ...kernelEventTypes.map((type) => `event:${type}`),
    ...modules.flatMap(
      (module) => module.contributions.events?.map(({ type }) => `event:${type}`) ?? [],
    ),
  ])
  duplicate([
    ...Object.values(kernelEntityKindPrefixes).map((prefix) => `prefix:${prefix}`),
    ...modules.flatMap(
      (module) => module.contributions.entity_kinds?.map(({ prefix }) => `prefix:${prefix}`) ?? [],
    ),
  ])
  duplicate(
    modules.flatMap(
      (module) => module.contributions.routes?.map(({ route }) => `route:${route}`) ?? [],
    ),
  )
  duplicate(
    modules.flatMap(
      (module) => module.contributions.screens?.map(({ route }) => `screen:${route}`) ?? [],
    ),
  )
  duplicate(
    modules.flatMap(
      (module) => module.contributions.screens?.map(({ id }) => `screen-id:${id}`) ?? [],
    ),
  )
  duplicate(
    modules.flatMap(
      (module) => module.contributions.reports?.map(({ id }) => `report:${id}`) ?? [],
    ),
  )
  const familyControlKeys = modules.flatMap(
    (module) =>
      module.contributions.family_controls?.map(({ key }) => `family-control:${key}`) ?? [],
  )
  duplicate(familyControlKeys)
  const familyControlDefinitions = new Map(
    modules.flatMap(
      (module) =>
        module.contributions.family_controls?.map((control) => [control.key, control] as const) ??
        [],
    ),
  )
  const familyPreferences = modules.find((module) => module.id === 'family-preferences')
  const familyPreferencesParams = familyPreferences?.parameters as
    | FamilyPreferencesParams
    | undefined
  validatePhases(modules, meta.phase_dates ?? [])
  validateClosedResults(modules)
  if (familyPreferencesParams)
    validateFamilyPreferences(
      familyPreferencesParams,
      traits,
      meta,
      familyControlDefinitions,
      new Set(declaredPhases(modules).keys()),
    )
  validateFeatures(
    modules,
    kernelEntityKinds,
    familyPreferencesParams?.sections.map(({ features }) => features) ?? [],
  )
}

function validateFamilyFacing(key: string, trait: Trait, meta: ProfileMeta): void {
  const familyFacing = trait.family_facing
  if (!familyFacing) return
  if (trait.kind === 'note') throw new Error(`trait ${key} cannot be family-facing`)
  if (trait.organiser_only)
    throw new Error(`trait ${key} cannot be organiser_only and family-facing`)
  if (!trait.scopes.includes(familyFacing.scope))
    throw new Error(`trait ${key} family-facing scope is not declared by the trait`)
  if (!familyFacing.title) throw new Error(`trait ${key} family-facing title is required`)
  validateCopy(meta, familyFacing.title)
  if (familyFacing.help) validateCopy(meta, familyFacing.help)
  if (!Array.isArray(familyFacing.strengths)) return
  if ('strengths' in trait) {
    for (const strength of familyFacing.strengths)
      if (!(trait.strengths ?? []).includes(strength))
        throw new Error(`trait ${key} family-facing strength is not allowed by the trait`)
  } else if (familyFacing.strengths.length > 0) {
    throw new Error(`trait ${key} family-facing strengths require a requirement or relation`)
  }
}

function validateFamilyPreferences(
  params: FamilyPreferencesParams,
  traits: Record<string, Trait>,
  meta: ProfileMeta,
  familyControls: ReadonlyMap<string, FamilyControlDefinition>,
  phases: ReadonlySet<string>,
): void {
  const sections = new Map<string, FamilyPreferenceSection>()
  for (const section of params.sections) {
    if (!kebab(section.key) || sections.has(section.key))
      throw new Error(`family preference section is duplicate or invalid: ${section.key}`)
    sections.set(section.key, section)
    validateCopy(meta, section.title)
    if (section.intro) validateCopy(meta, section.intro)
    if (section.phase !== null && !phases.has(section.phase))
      throw new Error(`family preference section names undeclared phase: ${section.phase}`)
    if ((section.phase === null) !== (section.late_contact === null))
      throw new Error(
        `family preference section ${section.key} needs late copy exactly with a phase`,
      )
    if (section.late_contact) validateCopy(meta, section.late_contact)
  }
  const occurrences = new Map<string, number>()
  for (const section of params.sections) {
    for (const traitKey of section.traits) {
      const trait = traits[traitKey]
      if (!trait) throw new Error(`family preference section names no trait: ${traitKey}`)
      if (!trait.family_facing)
        throw new Error(`family preference section names non-family-facing trait: ${traitKey}`)
      occurrences.set(traitKey, (occurrences.get(traitKey) ?? 0) + 1)
    }
  }
  for (const [traitKey, trait] of Object.entries(traits)) {
    if (trait.family_facing && occurrences.get(traitKey) !== 1)
      throw new Error(`family-facing trait must appear in exactly one section: ${traitKey}`)
  }
  const responseKeys = new Set<string>()
  for (const response of params.response_fields ?? []) {
    const trait = traits[response.key]
    if (
      responseKeys.has(response.key) ||
      !trait?.family_facing ||
      trait.family_facing.scope !== response.scope ||
      (response.control === 'tri-state') !== (trait.family_facing.control === 'tri-state') ||
      occurrences.get(response.key) !== 1
    )
      throw new Error(`invalid response field: ${response.key}`)
    responseKeys.add(response.key)
  }
  for (const [key, trait] of Object.entries(traits))
    if (trait.family_facing?.control === 'tri-state' && !responseKeys.has(key))
      throw new Error(`tri-state response declaration missing: ${key}`)
  const moduleControlKeys = new Set<string>()
  for (const control of params.module_controls) {
    if (moduleControlKeys.has(control.key))
      throw new Error(`family preference module control is duplicate: ${control.key}`)
    moduleControlKeys.add(control.key)
    if (!sections.has(control.section))
      throw new Error(`family preference module control names no section: ${control.section}`)
    if (!familyControls.has(control.key))
      throw new Error(`family preference module control is not contributed: ${control.key}`)
    validateCopy(meta, control.title)
    if (control.help) validateCopy(meta, control.help)
  }
}

const kernelEntityKinds = ['family', 'person']

/** Reserved kernel entity-kind id prefixes; see D27 and `src/events/fold.ts`. */
const kernelEntityKindPrefixes: Readonly<Record<string, string>> = {
  family: 'fam_',
  person: 'per_',
}

/** Maps each module event that opens, closes, or reopens a phase to the fact the fold records. */
function phaseEventRoles(modules: readonly ProfileModule[]): Record<string, PhaseEventRole> {
  const roles: Record<string, PhaseEventRole> = {}
  for (const module of modules)
    for (const phase of module.contributions.phases ?? [])
      if (phase.opens.kind === 'event') roles[phase.opens.event] = { role: 'open', phase: phase.id }
  for (const module of modules)
    for (const result of module.contributions.closed_results ?? []) {
      roles[result.close_event] = { role: 'close', area: result.area }
      roles[result.reopen_event] = { role: 'reopen', area: result.area }
    }
  return roles
}

function validationView(
  traits: Record<string, Trait>,
  modules: readonly ProfileModule[],
): KernelConfig {
  const schemas: LabelSchema[] = Object.entries(traits).map(([key, trait]) => ({
    key,
    aliases: trait.aliases,
    scopes: trait.scopes,
    cardinality: trait.cardinality,
    family_writable: trait.family_facing !== undefined || trait.family_writable === true,
    sensitivity: trait.sensitivity,
    valid_for: trait.valid_for,
    validate: (value) => validateValueValue(trait.value, value),
  }))
  for (const module of modules)
    for (const key of module.contributions.label_keys ?? [])
      schemas.push({
        ...key,
        family_writable: (module.contributions.family_controls ?? []).some(
          (control) =>
            (control.control === 'workshop-sign-up'
              ? 'signed-up-for'
              : control.control === 'workshop-interest'
                ? 'interested-in'
                : control.key) === key.key,
        ),
      })
  for (const [key, trait] of Object.entries(traits))
    if (trait.family_facing?.control === 'tri-state') {
      if (schemas.some((s) => s.key === `response-${key}`))
        throw new Error(`response marker collision: ${key}`)
      schemas.push({
        key: `response-${key}`,
        scopes: [trait.family_facing.scope],
        cardinality: 'zero-or-one',
        family_writable: trait.family_facing !== undefined || trait.family_writable === true,
        sensitivity: trait.sensitivity,
        governed_control: key,
        validate: (value) => (value === true ? null : 'response marker must be true'),
      })
    }
  const aliases = Object.fromEntries(
    schemas.flatMap((schema) => (schema.aliases ?? []).map((alias) => [alias, schema.key])),
  )
  const resolverDescriptors: ResolverDescriptor[] = Object.entries(traits)
    .filter(
      ([, trait]) =>
        trait.kind === 'requirement' ||
        trait.kind === 'relation' ||
        trait.kind === 'ordered-choice',
    )
    .map(([key, trait]) => ({
      key,
      operator: trait.kind === 'relation' ? trait.operator : trait.kind,
      scopes: trait.scopes,
      kind:
        trait.kind === 'requirement' || trait.kind === 'relation' || trait.kind === 'ordered-choice'
          ? trait.kind
          : undefined,
      satisfied_by: trait.kind === 'requirement' ? trait.satisfied_by : undefined,
      structural: trait.kind === 'requirement' ? trait.structural : undefined,
      weight: 'weight' in trait ? trait.weight : undefined,
      penalty: 'penalty' in trait ? trait.penalty : undefined,
    }))
  const capabilityDescriptors = Object.entries(traits).flatMap(([key, trait]) =>
    trait.kind === 'capability' ? [{ key, scopes: trait.scopes, derive: trait.derive }] : [],
  )
  const moduleEventPayloadSchemas: Record<string, ZodType<JsonValue>> = {}
  const eventFoldDispatch: Record<string, ModuleEventFold> = {}
  const eventAuthorizeDispatch: Record<string, ModuleEventAuthorize> = {}
  const eventValidateDispatch: Record<string, ModuleEventValidate> = {}
  for (const module of modules) {
    const allowedKinds = new Set(module.contributions.entity_kinds?.map(({ id }) => id) ?? [])
    const allowedLabelKeys = new Set(module.contributions.label_keys?.map(({ key }) => key) ?? [])
    for (const event of module.contributions.events ?? []) {
      moduleEventPayloadSchemas[event.type] = event.payload
      eventFoldDispatch[event.type] = guardModuleFold(
        module.id,
        allowedKinds,
        allowedLabelKeys,
        event.fold,
      )
      eventAuthorizeDispatch[event.type] = event.authorize
      if (event.validate) eventValidateDispatch[event.type] = event.validate
    }
  }
  const entityKindPrefixes: Record<string, string> = { ...kernelEntityKindPrefixes }
  for (const module of modules)
    for (const { id, prefix } of module.contributions.entity_kinds ?? [])
      entityKindPrefixes[id] = prefix
  const tokenConsumers = modules.flatMap((module) =>
    (module.contributions.capability_token_prefixes ?? []).map((prefix) => ({
      prefix,
      consumer: module.id,
    })),
  )
  for (const token of tokenConsumers)
    if (
      !token.prefix ||
      tokenConsumers.some(
        (other) =>
          other !== token &&
          (other.prefix.startsWith(token.prefix) || token.prefix.startsWith(other.prefix)),
      )
    )
      throw new Error(`ambiguous capability token prefix: ${token.prefix}`)
  return {
    capability_token_consumers: tokenConsumers,
    label_schemas: schemas,
    aliases,
    resolver_descriptors: resolverDescriptors,
    capability_descriptors: capabilityDescriptors,
    world_summaries: modules.flatMap((module) => module.contributions.world_summaries ?? []),
    world_checks: modules.flatMap((module) => module.contributions.world_checks ?? []),
    event_payload_schemas: { ...kernelPayloadSchemas, ...moduleEventPayloadSchemas },
    event_fold_dispatch: eventFoldDispatch,
    event_authorize_dispatch: eventAuthorizeDispatch,
    event_validate_dispatch: eventValidateDispatch,
    entity_kind_prefixes: entityKindPrefixes,
    phase_event_roles: phaseEventRoles(modules),
  }
}

function validateValue(key: string, value: ValueDefinition): void {
  if (
    value.kind === 'enum' &&
    (value.values.length === 0 || value.values.some((item) => !kebab(item)))
  )
    throw new Error(`trait ${key} has invalid enum vocabulary`)
  if (value.kind === 'text' && value.max_length < 1)
    throw new Error(`trait ${key} has invalid text length`)
  if (value.kind === 'decimal' && (!Number.isInteger(value.scale) || value.scale < 0))
    throw new Error(`trait ${key} has invalid decimal scale`)
}

function validateValueValue(value: ValueDefinition, candidate: JsonValue): string | null {
  if (value.kind === 'enum')
    return typeof candidate === 'string' && value.values.includes(candidate)
      ? null
      : 'invalid enum value'
  if (value.kind === 'text')
    return typeof candidate === 'string' && candidate.length <= value.max_length
      ? null
      : 'invalid text value'
  if (value.kind === 'integer')
    return typeof candidate === 'number' &&
      Number.isInteger(candidate) &&
      (value.min === undefined || candidate >= value.min) &&
      (value.max === undefined || candidate <= value.max)
      ? null
      : 'invalid integer value'
  if (value.kind === 'decimal')
    return typeof candidate === 'number' && Number.isFinite(candidate)
      ? null
      : 'invalid decimal value'
  if (value.kind === 'bool') return typeof candidate === 'boolean' ? null : 'invalid boolean value'
  if (value.kind === 'date')
    return typeof candidate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(candidate)
      ? null
      : 'invalid date value'
  return typeof candidate === 'string' ? null : `invalid ${value.entity_kind} reference`
}

function validateCopy(meta: ProfileMeta, copy: LocalizedText): void {
  if (typeof copy !== 'string' && (!copy[meta.locale] || !copy[meta.fallback_locale]))
    throw new Error('localized copy misses profile locale')
}

function validateEvaluator(key: string, evaluator: unknown): void {
  if (typeof evaluator !== 'function') return
  if (
    /\b(Date|Math\.random|fetch|process|eval)\b/.test(Function.prototype.toString.call(evaluator))
  )
    throw new Error(`trait ${key} evaluator is impure`)
}

function duplicate(items: readonly string[]): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item)) throw new Error(`duplicate contribution: ${item}`)
    seen.add(item)
  }
}

function kebab(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
}
