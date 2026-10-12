import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import type { StorybookConfig } from '@storybook/react-vite'

const storybookHostname = process.env.DGHK_STORYBOOK_HOSTNAME

const addAllowedHost = (allowedHosts: string[] | true | undefined): string[] | true | undefined => {
  if (!storybookHostname || allowedHosts === true) return allowedHosts
  return [...(allowedHosts ?? []), storybookHostname]
}

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  features: {
    changeDetection: false,
  },
  core: {
    ...(storybookHostname ? { allowedHosts: [storybookHostname] } : {}),
  },
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    server: {
      ...viteConfig.server,
      ...(storybookHostname
        ? { allowedHosts: addAllowedHost(viteConfig.server?.allowedHosts) }
        : {}),
    },
    preview: {
      ...viteConfig.preview,
      ...(storybookHostname
        ? { allowedHosts: addAllowedHost(viteConfig.preview?.allowedHosts) }
        : {}),
    },
    resolve: {
      ...viteConfig.resolve,
      alias: {
        ...viteConfig.resolve?.alias,
        '@': fileURLToPath(new URL('../src/app', import.meta.url)),
      },
    },
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
  }),
}

export default config
