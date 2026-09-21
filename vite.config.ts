import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { bundleGraph } from './scripts/bundle-graph.ts'

const buildRevision =
  process.env.BUILD_REVISION ?? process.env.CF_PAGES_COMMIT_SHA ?? revisionFromJj()
const compatibilityRevision = Number(process.env.COMPATIBILITY_REVISION ?? 1)

export default defineConfig({
  plugins: [react(), tailwindcss(), bundleGraph(), ...(process.env.VITEST ? [] : [cloudflare()])],
  resolve: { alias: { '@': fileURLToPath(new URL('./src/app', import.meta.url)) } },
  build: { manifest: true },
  define: {
    buildRevisionValue: JSON.stringify(buildRevision),
    compatibilityRevisionValue: JSON.stringify(compatibilityRevision),
  },
  server: {
    host: process.env.DGHK_PREVIEW_BIND || '127.0.0.1',
    port: Number(process.env.DGHK_PREVIEW_PORT || 5173),
    allowedHosts: process.env.DGHK_PREVIEW_HOST ? [process.env.DGHK_PREVIEW_HOST] : [],
    strictPort: true,
  },
})

function revisionFromJj(): string {
  try {
    const workingCopyIsEmpty =
      execFileSync('jj', ['log', '-r', '@', '--no-graph', '-T', 'empty'], {
        encoding: 'utf8',
      }).trim() === 'true'
    return execFileSync(
      'jj',
      ['log', '-r', workingCopyIsEmpty ? '@-' : '@', '--no-graph', '-T', 'commit_id'],
      {
        encoding: 'utf8',
      },
    ).trim()
  } catch {
    return 'development'
  }
}
