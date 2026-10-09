import process from 'node:process'
import { expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { authorizeEventBatch } from '../../src/auth/authorization.js'
import { derive } from '../../src/events/fold.js'
import { familyForEmail } from '../../src/auth/principal.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import type { World } from '../../src/events/fold.js'
import { syntheticLog, syntheticScale } from '../bench/log.js'

/**
 * The request-path counterpart to `work-budgets.test.ts`, counting the same way
 * and for the same reason: what regresses here is how often a request walks the
 * label store, and that is deterministic where a millisecond budget is not.
 *
 * Both paths below used to be linear in the whole log per call — one per
 * authenticated request, one per event in an append batch — so both counts grew
 * with the occasion's history rather than with the work being asked for.
 */
const profile = luebben2027Profile

/** Counts element reads, so a scan of the whole array costs its length. */
function countingWorld(world: World, onRead: () => void): World {
  const proxy = <T>(items: readonly T[]): readonly T[] =>
    new Proxy(items as T[], {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/.test(property)) onRead()
        return Reflect.get(target, property, receiver) as unknown
      },
    })
  const labelsByKey = {
    ...world.labels_by_key,
    email: proxy(world.labels_by_key.email ?? []),
  }
  const entitiesByKind = {
    ...world.entities_by_kind,
    family: proxy(world.entities_by_kind.family ?? []),
  }
  return {
    ...world,
    labels: proxy(world.labels),
    families: proxy(world.families),
    persons: proxy(world.persons),
    labels_by_key: labelsByKey,
    entities_by_kind: entitiesByKind,
  }
}

/**
 * `PersonUpdated` is the event that actually reaches the family lookup. A
 * family principal may not write any label in this profile, so `LabelSet` is
 * refused before the lookup runs, and `PersonUpdated` exercises both halves of
 * it: the family-kind check misses for a person id, and the `member-of` label
 * is then resolved.
 */
function personDraft(personId: string, familyId: string, seq: number): Event {
  return {
    seq,
    at: '2027-01-01T00:00:00Z',
    actor: 'family@example.test',
    subject: null,
    type: 'PersonUpdated',
    payload: {
      person_id: personId,
      family_id: familyId,
      given_name: 'Ada',
      family_name: 'Letzte',
      birthdate: '1990-01-01',
      role: 'adult',
    } as JsonValue,
  }
}

/**
 * Both paths now read only through `labels_by_key`, `labels_by_entity` and
 * `entities_by_kind`, so neither touches an unindexed collection at all and the
 * measured count is zero. The budgets allow a few incidental reads rather than
 * pinning exactly zero, while staying orders of magnitude below a scan.
 *
 * The fixtures deliberately use the *last* family. Against the first one, a
 * reverted `families.some(...)` would match on its first element and the
 * regression would not show up in the count at all.
 */
const budgets = {
  authorize_batch_reads: 8,
  family_for_email_reads: 8,
}

test('authorizing an append batch does not scan the log per event', () => {
  const world = derive(syntheticLog(syntheticScale(2)), profile.validation_view)
  const family = world.families[world.families.length - 1]!
  expect(world.entity_kind_by_id[family.id]).toBe('family')
  const member = (world.labels_by_key['member-of'] ?? []).find(
    (label) => label.value === family.id,
  )!
  let reads = 0
  const counting = countingWorld(world, () => (reads += 1))
  const events = Array.from({ length: 10 }, (_, index) =>
    personDraft(member.entity_id, family.id, world.head_seq + index + 1),
  )

  expect(
    authorizeEventBatch(
      { kind: 'family', email: 'last@example.test', family_id: family.id },
      events,
      counting,
      profile.validation_view,
    ),
  ).toBe(true)

  process.stderr.write(`\nREQUEST authorize_batch reads: ${reads}\n`)
  // Ten events against a log of thousands of labels: a per-event scan of the
  // store would be orders of magnitude above this.
  expect(reads).toBeLessThanOrEqual(budgets.authorize_batch_reads)
})

test('resolving a family by email does not scan the log', () => {
  const world = derive(syntheticLog(syntheticScale(2)), profile.validation_view)
  let reads = 0
  const counting = countingWorld(world, () => (reads += 1))

  const last = world.families.length - 1
  expect(world.family_id_by_email[`f${last}@example.test`]).toBe(`fam_${last}`)
  expect(familyForEmail(counting, `f${last}@example.test`)).toBe(`fam_${last}`)

  process.stderr.write(`REQUEST family_for_email reads: ${reads}\n`)
  expect(reads).toBeLessThanOrEqual(budgets.family_for_email_reads)
})
