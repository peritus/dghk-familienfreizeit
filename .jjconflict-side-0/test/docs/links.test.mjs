import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { checkDocLinks } from '../../scripts/check-doc-links.mjs'

async function fixture(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dghk-doc-links-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const [name, contents] of Object.entries(files)) {
    const file = path.join(root, name)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, contents)
  }
  return root
}

test('resolves relative/root paths, reference links, images and encoded names', async (t) => {
  const root = await fixture(t, {
    'README.md': '[topic](docs/topic.md#hello-world)\n[ref][detail]\n\n[detail]: docs/topic.md#hello-world-1\n![image](image.svg)\n[space](<docs/a b.md>)\n[directory](docs/)\n',
    'docs/topic.md': '# Hello *world*\n# Hello `world`\n[home](/README.md)\n[local](#hello-world)\n[encoded](a%20b.md#überblick)\n',
    'docs/a b.md': '# Überblick\n',
    'image.svg': '<svg/>',
  })
  const result = await checkDocLinks(root)
  assert.deepEqual(result.errors, [])
  assert.equal(result.checked, 8)
})

test('rejects missing files, stale anchors, bad encoding and paths outside the repo', async (t) => {
  const root = await fixture(t, {
    'README.md': '[missing](absent.md)\n[anchor](topic.md#old)\n[escape](../outside.md)\n[bad](bad%FF.md)\n',
    'topic.md': '# Current\n',
  })
  const { errors } = await checkDocLinks(root)
  assert.equal(errors.length, 4)
  assert.ok(errors.some((error) => error.includes('target does not exist')))
  assert.ok(errors.some((error) => error.includes('anchor does not exist')))
  assert.ok(errors.some((error) => error.includes('escapes repository')))
  assert.ok(errors.some((error) => error.includes('invalid URL encoding')))
})

test('ignores code and external URLs; honors explicit HTML anchors and links', async (t) => {
  const root = await fixture(t, {
    'README.md': '# Main\n[external](https://example.invalid/absent)\n[mail](mailto:test@example.invalid)\n`[inline](absent.md)`\n\n```md\n[fenced](absent.md)\n```\n\n    [indented](absent.md)\n\n<a id="custom"></a>\n[custom](#custom)\n<a href="topic.md#section">topic</a>\n<!-- <a href="missing.md">ignored</a> -->\n',
    'topic.md': 'Section\n=======\n',
    'node_modules/ignored.md': '[ignored](absent.md)',
  })
  const result = await checkDocLinks(root)
  assert.deepEqual(result.errors, [])
  assert.equal(result.checked, 2)
  assert.equal(result.files, 2)
})

test('checks decision punctuation and duplicate heading suffixes', async (t) => {
  const root = await fixture(t, {
    'README.md': '# D22 — Documentation follows implementation status\n[decision](#d22--documentation-follows-implementation-status)\n# Same\n# Same\n# Same-1\n[duplicate](#same-1-1)\n',
  })
  assert.deepEqual((await checkDocLinks(root)).errors, [])
})
