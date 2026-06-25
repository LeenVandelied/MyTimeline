import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/experimental-nextjs-vite'

/**
 * Config Storybook 8.x — framework `@storybook/experimental-nextjs-vite`.
 *
 * ⚠ DÉCISION (pitfall) : le builder webpack5 (`@storybook/nextjs`) PLANTE avec
 * Next 15.2 au `Cache.shutdown` (`Cannot read properties of undefined (reading
 * 'tap')`) — le webpack bundlé par Next entre en conflit avec le builder, même
 * en forçant le cache mémoire. On bascule sur le framework **Vite** officiel
 * (`experimental-nextjs-vite`, supporté Next 14/15) : pas de webpack5, build OK,
 * et même moteur (Vite) que Vitest → config cohérente. Next/font, next/image,
 * alias et Tailwind 4 restent gérés par le framework.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/experimental-nextjs-vite',
    options: {},
  },
  staticDirs: ['../public'],
  docs: {
    autodocs: 'tag',
  },
  core: {
    disableTelemetry: true,
  },
  // Alias `@/*` (tsconfig paths) : non résolus auto par le framework Vite en
  // mode dev → on les mappe explicitement (mêmes cibles que vitest.config.mts).
  viteFinal: async (viteConfig) => {
    viteConfig.resolve ??= {}
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias as Record<string, string> | undefined),
      '@/app': fileURLToPath(new URL('../app', import.meta.url)),
      '@': fileURLToPath(new URL('../src', import.meta.url)),
    }
    return viteConfig
  },
}

export default config
