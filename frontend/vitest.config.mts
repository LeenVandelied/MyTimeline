import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

/**
 * Config Vitest — tests unitaires + composants (Next 15 / React 18 / Tailwind 4).
 * Env jsdom pour RTL. Les alias `@/*` et `@/app/*` (tsconfig.json) sont mappés
 * en dur via `resolve.alias` — on évite `vite-tsconfig-paths` (ESM-only, charge
 * mal dans une config `.ts` require-CJS, vu que package.json n'est pas `"module"`).
 * `next/font` est mocké dans vitest.setup.ts (jsdom ne charge pas les polices).
 */
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/app': r('./app'),
      '@': r('./src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'app/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**', '**/*.stories.{ts,tsx}'],
  },
})
