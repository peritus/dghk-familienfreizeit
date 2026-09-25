import { parse, type Node } from '@bgotink/kdl'
import { derive, type KernelConfig } from './fold.js'
import {
  isEventType,
  kernelPayloadSchemas,
  parsePayload,
  type Event,
  type EventPayloadSchemas,
  type EventType,
} from './types.js'

const fixedTimestamp = '2026-01-01T00:00:00.000Z'
export function loadKdl(text: string, config: KernelConfig = {}): Event[] {
  const document = parse(text)
  const schemas = { ...kernelPayloadSchemas, ...config.event_payload_schemas }
  const events = document.nodes.map((node, index) => nodeToEvent(node, index + 1, schemas))
  derive(events, config)
  return events
}

export class TextFileEventSource {
  constructor(
    private readonly text: string,
    private readonly config: KernelConfig = {},
  ) {}
  load(): Event[] {
    return loadKdl(this.text, this.config)
  }
}
function nodeToEvent(node: Node, defaultSeq: number, schemas: EventPayloadSchemas): Event {
  const typeName = node.getName()
  if (!isEventType(typeName, schemas))
    throw new Error(`line ${defaultSeq}: unknown event type ${typeName}`)
  if (node.children !== null) throw new Error(`line ${defaultSeq}: child blocks are not allowed`)
  const payload: Record<string, unknown> = {}
  let seq = defaultSeq
  let at = fixedTimestamp
  let actor = 'fixture'
  let subject: string | null = null
  for (const entry of node.entries) {
    const key = entry.getName()
    if (key === null) throw new Error(`line ${defaultSeq}: positional arguments are not allowed`)
    if (key in payload || ['seq', 'at', 'actor', 'subject'].includes(key))
      throw new Error(`line ${defaultSeq}: duplicate property ${key}`)
    const value = entry.getValue()
    if (key === 'seq') seq = requireNumber(value, key)
    else if (key === 'at') at = requireString(value, key)
    else if (key === 'actor') actor = requireString(value, key)
    else if (key === 'subject') subject = value === null ? null : requireString(value, key)
    else payload[key] = value
  }
  return {
    seq,
    at: new Date(at).toISOString(),
    actor,
    subject,
    type: typeName as EventType,
    payload: parsePayload(typeName as EventType, payload, schemas),
  } as Event
}

function requireString(value: unknown, key: string): string {
  if (typeof value !== 'string') throw new Error(`${key} must be a string`)
  return value
}

function requireNumber(value: unknown, key: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw new Error(`${key} must be an integer`)
  return value
}
