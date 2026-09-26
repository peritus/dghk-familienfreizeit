import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: ['src/solver/**/*.ts', 'src/modules/room-assignment/index.ts'],
        thresholds: { lines: 98, functions: 98, statements: 98, branches: 80 },
      },
      projects: [
        {
          extends: true,
          plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
          test: {
            name: 'worker',
            include: ['test/worker/**/*.test.ts'],
            setupFiles: ['./test/worker/setup.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'app',
            environment: 'jsdom',
            include: ['test/app/**/*.test.tsx'],
            setupFiles: ['./test/app/setup.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'kernel',
            include: ['test/events/**/*.test.ts', 'test/solver/**/*.test.ts'],
          },
        },
        {
          extends: true,
          test: { name: 'config', include: ['test/config/**/*.test.ts'] },
        },
      ],
    },
  }),
)
