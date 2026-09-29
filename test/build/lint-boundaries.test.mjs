import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ESLint } from 'eslint'

const eslint = new ESLint()
for (const [file, source, rule] of [
  ['src/app/probe.ts', "import 'hono'", 'no-restricted-imports'],
  ['src/worker/probe.ts', "import '../app/app'", 'no-restricted-imports'],
  ['src/derive/probe.ts', 'Date.now()', 'no-restricted-globals'],
  ['src/events/fold.ts', 'Date.now()', 'no-restricted-globals'],
  ['src/solver/probe.ts', 'Math.random()', 'no-restricted-properties'],
  ['spec/profiles/probe.example.ts', 'Date.now()', 'no-restricted-globals'],
  [
    'spec/profiles/probe.example.ts',
    'export const x = { familyId: 1 }',
    '@typescript-eslint/naming-convention',
  ],
  ['src/config/probe.ts', "import 'cloudflare:workers'", 'no-restricted-imports'],
  ['src/app/organiser/probe.tsx', "import { Link } from 'wouter'", 'no-restricted-imports'],
  [
    'src/modules/room-assignment/app/probe.tsx',
    "import { organiserUrls } from '../../../../organiser/routes.js'",
    'no-restricted-syntax',
  ],
  ['src/app/organiser/probe.tsx', 'no-restricted-syntax'],
  [
    'src/derive/probe.ts',
    'export const x = { familyId: 1 }',
    '@typescript-eslint/naming-convention',
  ],
]) {
  test(`${file} rejects ${source}`, async () => {
    const [result] = await eslint.lintText(source, { filePath: file })
    assert.ok(
      result.messages.some((message) => message.ruleId === rule),
      JSON.stringify(result.messages),
    )
  })
}
