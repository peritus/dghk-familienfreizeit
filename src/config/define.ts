import type { KernelConfig, LabelSchema, ResolverDescriptor } from '../events/fold.js'
import type { JsonValue } from '../events/types.js'

export type LocalizedText = string | Readonly<Record<string, string>>

export type EntityScope = 'family' | 'person'

export type Cardinality = 'zero-or-one' | 'exactly-one' | 'zero-or-more'

export type ValueDefinition =
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'text'; max_length: number }
  | { kind: 'integer'; min?: number; max?: number }
  | { kind: 'decimal'; scale: number }
  | { kind: 'bool' }
  | { kind: 'date' }
  | { kind: 'ref'; entity_kind: string }

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
}

export type RelationTrait = TraitBase & {
  kind: 'relation'
  operator: 'groups-with' | 'separates-from'
  target: readonly string[]
  strengths?: readonly ('required' | 'preferred')[]
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
  deadlines?: Readonly<Record<string, string>>
}

export type ProfileModule = {
  id: string
  requires: readonly string[]
  enhances: readonly string[]
  parameters?: Readonly<Record<string, unknown>>
  contributions: ModuleContributions
}

export type ModuleContributions = {
  entity_kinds?: readonly { id: string }[]
  events?: readonly { type: string }[]
  label_keys?: readonly {
    key: string
    scopes: readonly string[]
    validate?: (value: JsonValue) => string | null
  }[]
  trait_roles?: readonly TraitRole[]
  routes?: readonly { route: string }[]
  reports?: readonly { id: string }[]
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
  validateModules(modules, input.traits)
  return { ...input, modules, validation_view: validationView(input.traits, modules) }
}

function validateMeta(meta: ProfileMeta): void {
  if (!kebab(meta.id)) throw new Error(`profile id must be kebab-case: ${meta.id}`)
  if (!meta.name || !meta.description) throw new Error('profile copy is required')
  if (!meta.starts_on || !meta.ends_on || meta.starts_on > meta.ends_on)
    throw new Error('profile dates are invalid')
  if (!meta.locale || !meta.fallback_locale) throw new Error('profile locales are required')
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
    if (trait.kind === 'property' && trait.copy && trait.value.kind !== 'enum')
      throw new Error(`trait ${key} copy requires enum value`)
    if (trait.organiser_only && trait.family_writable)
      throw new Error(`trait ${key} cannot be both organiser_only and family_writable`)
    for (const evaluator of [
      trait.valid_for,
      trait.kind === 'capability' ? trait.derive : undefined,
    ])
      validateEvaluator(key, evaluator)
    validateCopy(meta, trait.title)
  }
}

function validateModules(modules: readonly ProfileModule[], traits: Record<string, Trait>): void {
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
        (role.operator && trait.kind === 'relation' && trait.operator !== role.operator)
      )
        throw new Error(`module ${module.id} role ${role.parameter} has wrong trait shape`)
    }
  }
  duplicate(
    modules.flatMap(
      (module) => module.contributions.entity_kinds?.map(({ id }) => `entity:${id}`) ?? [],
    ),
  )
  duplicate(
    modules.flatMap(
      (module) => module.contributions.events?.map(({ type }) => `event:${type}`) ?? [],
    ),
  )
  duplicate(
    modules.flatMap(
      (module) => module.contributions.routes?.map(({ route }) => `route:${route}`) ?? [],
    ),
  )
  duplicate(
    modules.flatMap(
      (module) => module.contributions.reports?.map(({ id }) => `report:${id}`) ?? [],
    ),
  )
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
    family_writable: trait.family_writable,
    validate: (value) => validateValueValue(trait.value, value),
  }))
  for (const module of modules)
    for (const key of module.contributions.label_keys ?? []) schemas.push(key)
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
    }))
  return { label_schemas: schemas, aliases, resolver_descriptors: resolverDescriptors }
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
