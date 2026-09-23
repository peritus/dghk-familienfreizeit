import {
  canonicalJson,
  kernelPayloadSchemas,
  parseEvent,
  type Event,
  type EventPayloadSchemas,
  type JsonValue,
} from './types.js'

export type EventDraft = Omit<Event, 'seq'>

export class StaleHeadError extends Error {
  constructor(
    public readonly expected: number,
    public readonly actual: number,
  ) {
    super(`stale event head: expected ${expected}, actual ${actual}`)
  }
}

type EventRow = {
  seq: number
  at: string
  actor: string
  type: string
  subject: string | null
  payload: string
}

export async function readEvents(db: D1Database, untilSeq?: number): Promise<Event[]> {
  const query =
    untilSeq === undefined
      ? 'SELECT seq, at, actor, type, subject, payload FROM event ORDER BY seq'
      : 'SELECT seq, at, actor, type, subject, payload FROM event WHERE seq <= ?1 ORDER BY seq'
  const result =
    untilSeq === undefined
      ? await db.prepare(query).all<EventRow>()
      : await db.prepare(query).bind(untilSeq).all<EventRow>()
  return result.results.map((row) =>
    parseEvent({
      seq: row.seq,
      at: row.at,
      actor: row.actor,
      type: row.type,
      subject: row.subject,
      payload: JSON.parse(row.payload),
    }),
  )
}

export async function eventHead(db: D1Database): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(MAX(seq), 0) AS head FROM event')
    .first<{ head: number }>()
  return row?.head ?? 0
}

export async function appendEvents(
  db: D1Database,
  expectedHead: number,
  drafts: readonly EventDraft[],
  schemas: EventPayloadSchemas = kernelPayloadSchemas,
): Promise<Event[]> {
  if (drafts.length === 0) return []
  const actual = await eventHead(db)
  if (actual !== expectedHead) throw new StaleHeadError(expectedHead, actual)
  const events = drafts.map((draft, index) =>
    parseEvent({ ...draft, seq: expectedHead + index + 1 }, schemas),
  )
  const statements = events.map((event) =>
    db
      .prepare(
        'INSERT INTO event(seq, at, actor, type, subject, payload) SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE (SELECT COALESCE(MAX(seq), 0) FROM event) = ?7',
      )
      .bind(
        event.seq,
        event.at,
        event.actor,
        event.type,
        event.subject,
        canonicalJson(event.payload as JsonValue),
        event.seq - 1,
      ),
  )
  try {
    const results = await db.batch(statements)
    if (results.some((result) => result.meta.changes !== 1))
      throw new StaleHeadError(expectedHead, await eventHead(db))
  } catch (error) {
    if (error instanceof StaleHeadError) throw error
    throw error
  }
  return events
}
