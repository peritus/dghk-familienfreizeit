import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
        test: { name: 'worker', include: ['test/worker/**/*.test.ts'], setupFiles: ['./test/worker/setup.ts'] },
      },
      {
        extends: true,
        test: { name: 'app', environment: 'jsdom', include: ['test/app/**/*.test.tsx'] },
      },
      {
        extends: true,
        test: { name: 'kernel', include: ['test/events/**/*.test.ts'] },
      },
    ],
  },
}))
