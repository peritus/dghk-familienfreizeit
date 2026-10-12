import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { featureBindingNames } from '../../src/config/features.js'
import { activeProfile } from '../../src/config/index.js'

const expected = featureBindingNames(activeProfile.modules)

function namesIn(text: string): readonly string[] {
  return [...new Set(text.match(/DGHK_FEATURE_[A-Z0-9_]+/g) ?? [])].sort()
}

describe('operational feature binding allowlist', () => {
  test('the Worker environment type declares exactly the composed profile bindings', () => {
    expect(namesIn(readFileSync('src/worker/environment.d.ts', 'utf8'))).toEqual(expected)
  })

  test('the development preview forwards exactly the composed profile bindings', () => {
    const tasks = JSON.parse(readFileSync('.vscode/tasks.json', 'utf8')) as {
      tasks: { label: string; args?: readonly string[] }[]
    }
    const preview = tasks.tasks.find(({ label }) => label === 'dev-preview')
    expect(namesIn(preview?.args?.join(' ') ?? '')).toEqual(expected)
  })
})
