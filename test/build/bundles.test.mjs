import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { gzipSync } from 'node:zlib'

const client = 'dist/client'
const graph = JSON.parse(await readFile(join(client, '.vite/bundle-graph.json'), 'utf8'))
const workerGraph = JSON.parse(
  await readFile('dist/dghk_familienfreizeit/.vite/bundle-graph.json', 'utf8'),
)
const manifest = JSON.parse(await readFile(join(client, '.vite/manifest.json'), 'utf8'))

function closure(file, visited = new Set()) {
  if (visited.has(file)) return visited
  const chunk = graph.find((item) => item.file === file)
  assert.ok(chunk, `Missing chunk: ${file}`)
  visited.add(file)
  for (const imported of chunk.imports) closure(imported, visited)
  return visited
}

const entry = graph.find((item) => item.entry)
assert.ok(entry, 'Browser entry must exist')
const family = closure(entry.file)
const organiser = graph.find((item) =>
  item.modules.some((id) => id.endsWith('src/app/organiser/organiser-app.tsx')),
)

test('family static import closure excludes organiser, solver and Worker code', () => {
  const modules = graph.filter((item) => family.has(item.file)).flatMap((item) => item.modules)
  assert.ok(modules.some((id) => id.endsWith('src/app/app.tsx')))
  for (const id of modules)
    assert.doesNotMatch(
      id,
      /src\/(app\/organiser|solver|derive|worker)\/|src\/modules\/[^/]+\/worker\//,
    )
  assert.ok(organiser, 'Organiser must have a separate lazy chunk')
  assert.ok(!family.has(organiser.file))
  assert.ok(
    graph.some((item) => family.has(item.file) && item.dynamic_imports.includes(organiser.file)),
  )
})

test('Worker bundle contains no browser modules', () => {
  const modules = workerGraph.flatMap((item) => item.modules)
  assert.ok(modules.some((id) => id.endsWith('src/worker/index.ts')))
  for (const id of modules)
    assert.doesNotMatch(id, /src\/app\/|src\/modules\/[^/]+\/app\/|node_modules\/react(?:-dom)?\//)
})

test('compressed family, incremental organiser and CSS assets stay within budgets', async (t) => {
  assert.ok(organiser)
  const incremental = [...closure(organiser.file)].filter((file) => !family.has(file))
  const css = [...new Set(Object.values(manifest).flatMap((item) => item.css ?? []))]
  assert.ok(css.length > 0, 'Tailwind stylesheet must be emitted')
  for (const [label, files, budget] of [
    ['family JS', [...family], 150 * 1024],
    ['organiser incremental JS', incremental, 200 * 1024],
    ['CSS', css, 32 * 1024],
  ]) {
    const bytes = (
      await Promise.all(
        files.map(async (file) => gzipSync(await readFile(join(client, file))).length),
      )
    ).reduce((sum, size) => sum + size, 0)
    t.diagnostic(`${label}: ${bytes} gzip bytes / ${budget}`)
    assert.ok(bytes <= budget, `${label} exceeds budget: ${bytes} > ${budget}`)
  }
})
