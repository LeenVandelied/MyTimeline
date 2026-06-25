import { defineConfig, devices } from '@playwright/test'

/**
 * Config Playwright E2E.
 * La config DOIT exister même sans test (cf. #29) — `npm run test:e2e` doit
 * tourner. Les specs vivent dans `e2e/`. `webServer` démarre Next en local
 * (réutilise un serveur déjà lancé en dev). Désactivé en l'absence de specs ?
 * Non : la config reste valide ; sans fichier `*.spec.ts`, Playwright sort 0.
 */
const PORT = 3000
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer démarré uniquement si on n'utilise pas un baseURL externe.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
