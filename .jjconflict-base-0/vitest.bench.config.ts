import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

/**
 * Benchmarks are deliberately outside `vitest.config.ts`. They measure cost
 * rather than assert behavior, they take minutes rather than seconds, and CI
 * must not gate on wall-clock timings from a shared runner. Run them with
 * `pnpm run bench`.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'bench',
      include: ['test/bench/**/*.bench.ts'],
      testTimeout: 1_800_000,
      hookTimeout: 1_800_000,
      // One file at a time: parallel workers compete for CPU and make the
      // reported medians meaningless.
      fileParallelism: false,
    },
  }),
)
