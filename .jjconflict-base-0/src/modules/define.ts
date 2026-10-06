import type { ZodType } from 'zod'
import type { ModuleContributions, ProfileModule } from '../config/define.js'

export type ModuleDefinition<Params> = {
  id: string
  requires?: readonly string[]
  enhances?: readonly string[]
  params: ZodType<Params>
  contribute(params: Params): ModuleContributions
}

/** Defines one selectable module and canonicalises its defaulted parameters at profile build time. */
export function defineModule<Params>(
  definition: ModuleDefinition<Params>,
): (parameters: unknown) => ProfileModule {
  return (parameters) => {
    const parsed = definition.params.parse(parameters)
    return {
      id: definition.id,
      requires: definition.requires ?? [],
      enhances: definition.enhances ?? [],
      parameters: parsed as Readonly<Record<string, unknown>>,
      contributions: definition.contribute(parsed),
    }
  }
}
