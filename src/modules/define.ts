import { z, type ZodType } from 'zod'
import type { ModuleContributions, ProfileModule } from '../config/define.js'

export type ModuleDefinition<Params> = {
  id: string
  requires?: readonly string[]
  enhances?: readonly string[]
  params: ZodType<Params>
  contribute(params: Params): ModuleContributions
}

const deselectedFeatures = z.array(z.string().min(1)).default([])

/**
 * Defines one selectable module and canonicalises its defaulted parameters at profile build time.
 * The kernel-owned `deselected_features` parameter is split off before the module's own schema
 * parses the rest (profiles/contract.md §1).
 */
export function defineModule<Params>(
  definition: ModuleDefinition<Params>,
): (parameters: unknown) => ProfileModule {
  return (parameters) => {
    const { deselected_features: deselected, ...own } =
      parameters && typeof parameters === 'object'
        ? (parameters as Record<string, unknown>)
        : { deselected_features: undefined }
    const parsed = definition.params.parse(
      parameters && typeof parameters === 'object' ? own : parameters,
    )
    return {
      id: definition.id,
      requires: definition.requires ?? [],
      enhances: definition.enhances ?? [],
      parameters: parsed as Readonly<Record<string, unknown>>,
      deselected_features: deselectedFeatures.parse(deselected),
      contributions: definition.contribute(parsed),
    }
  }
}
