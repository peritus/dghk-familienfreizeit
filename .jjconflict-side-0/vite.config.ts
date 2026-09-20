import { fileURLToPath } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { bundleGraph } from './scripts/bundle-graph.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), bundleGraph(), ...(process.env.VITEST ? [] : [cloudflare()])],
  resolve: { alias: { '@': fileURLToPath(new URL('./src/app', import.meta.url)) } },
  build: { manifest: true },
  server: {
    host: process.env.DGHK_PREVIEW_BIND || '127.0.0.1',
    port: Number(process.env.DGHK_PREVIEW_PORT || 5173),
    allowedHosts: process.env.DGHK_PREVIEW_HOST ? [process.env.DGHK_PREVIEW_HOST] : [],
    strictPort: true,
  },
})
