import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/nextjs-vite'

/**
 * Config Storybook 10 — framework `@storybook/nextjs-vite` (builder Vite).
 *
 * ⚠ DÉCISION (pitfall) : le builder webpack5 (`@storybook/nextjs`) PLANTE avec
 * Next 15.2 au `Cache.shutdown` (`Cannot read properties of undefined (reading
 * 'tap')`) — le webpack bundlé par Next entre en conflit avec le builder. On
 * reste sur le framework **Vite** officiel (`nextjs-vite`, ex-`experimental-
 * nextjs-vite` dé-préfixé en SB9+, compatible Next 15.5 — CVE #161) : pas de
 * webpack5, build OK, même moteur (Vite) que Vitest → config cohérente.
 * Next/font, next/image, alias et Tailwind 4 restent gérés par le framework.
 *
 * SB10 : addon-essentials/interactions fusionnés dans le core ; `docs.autodocs`
 * retiré (autodocs via tag `autodocs` sur les stories). Imports stories
 * `@storybook/react` → `@storybook/react-vite` (le helper de test `@storybook/test`
 * a été retiré à la migration SB10, plus référencé ici).
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],

  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },

  staticDirs: ['../public'],

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
