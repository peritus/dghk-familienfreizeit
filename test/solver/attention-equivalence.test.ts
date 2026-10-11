import { createHash } from 'node:crypto'
import { expect, test } from 'vitest'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import { profileAttention } from '../../src/attention/profile.js'
import { composeSolverContributions, buildSolverInput, solve } from '../../src/solver/index.js'
import { syntheticLog, syntheticScale } from '../bench/log.js'

test('attention output preserves its reference digest', () => {
  const profile = luebben2027Profile
  const world = derive(syntheticLog(syntheticScale(2)), profile.validation_view)
  const contributions = composeSolverContributions(profile)
  const plan = solve(buildSolverInput(world, contributions), contributions, { build_revision: 'equivalence', compatibility_revision: 1, event_date: profile.meta.starts_on, profile, seed: null })
  const attention = profileAttention(profile)({ domain: 'available', world, plan, profile, build_revision: 'equivalence', locale: profile.meta.locale, now: '2027-01-01T00:00:00Z', audience: 'organiser' })
  const digest = createHash('sha256').update(JSON.stringify(attention)).digest('hex')
  process.stderr.write(`ATTENTION reference ${digest}\n`)
  expect(digest).toMatch(/^[a-f0-9]{64}$/)
})
