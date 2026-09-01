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
  // Purge `.auth/accounts.json` d'un run précédent avant le projet `setup`
  // (identités partagées setup <-> specs régénérées à chaque run). Cf. e2e/global-setup.ts.
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // #461 — POURQUOI un reporter COMPOSITE en CI, et pas `github` seul.
  // Le reporter `github` n'écrit RIEN sur disque : il se contente de poster des
  // annotations dans l'interface Actions. `playwright-report/` restait donc vide
  // ou absent, et l'artefact uploadé par ci.yml était inexploitable — deux agents
  // du Sprint 63 ont conclu « indéterminé » sur un échec faute de contexte.
  // On garde donc `github` (annotations inline sur la PR) et on lui ADJOINT `html`,
  // qui écrit le rapport consultable dans `playwright-report/`. Les traces
  // (`trace: 'on-first-retry'`, plus bas) atterrissent, elles, dans
  // `test-results/` : ci.yml doit uploader LES DEUX dossiers.
  // `open: 'never'` interdit toute tentative d'ouverture de navigateur sur le runner.
  // Le reporter local reste `list` — inchangé.
  // ⚠ Le typage ne protège RIEN ici : `ReporterDescription` accepte `[string, any]`
  // (reporters tiers), donc `['html', { open: 'jamais' }]` compile aussi — vérifié
  // par contrôle négatif au S64. Seul un run réel atteste ce bloc.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    // Projet `setup` : provisionne UNE fois les comptes E2E fixes (register+login)
    // et sauvegarde leur storageState. Anti rate-limit register (5/min/IP) : les
    // specs réutilisent ces cookies via `test.use({ storageState })` au lieu de
    // register par test. Ne se rejoue PAS sur retry de test. Cf. e2e/auth.setup.ts.
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // N'exécute les specs qu'après provisioning des comptes.
      dependencies: ['setup'],
    },
    // Projet `firefox` VOLONTAIREMENT RESTREINT (#414, Sprint 62).
    //
    // POURQUOI il existe : #414 devait « rejouer la sonde sur Firefox 151 » et
    // « ne pas régresser sur WebKit », alors que ce fichier ne déclarait que
    // `setup` et `chromium` — le critère d'acceptation était INEXÉCUTABLE.
    //
    // POURQUOI il est restreint par `testMatch` à une seule spec : les 174 E2E
    // existantes n'ont JAMAIS tourné sur Gecko. Les exposer d'un coup à un
    // moteur jamais exercé transforme le sprint en chasse aux faux positifs
    // (sélecteurs, timings d'animation, `scrollIntoView`), pour un bénéfice nul
    // sur l'issue traitée. On ouvre donc le moteur là où la question se pose —
    // le rendu du focus d'un `Select` Radix — et nulle part ailleurs.
    //
    // Élargir ce `testMatch` est une DÉCISION DE SPRINT, pas un détail : chaque
    // spec ajoutée ici doit avoir été jouée verte sur Gecko au préalable.
    //
    // WebKit reste HORS PÉRIMÈTRE (#414) : non ajouté, donc non vérifié.
    {
      name: 'firefox',
      testMatch: /sprint-62-select-focus-indicator\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
      // Même dépendance que `chromium` : les comptes E2E sont provisionnés une
      // fois (anti rate-limit register, cf. projet `setup` ci-dessus) et leur
      // `storageState` est réutilisé tel quel — le cookie JWT n'est pas lié au
      // moteur.
      dependencies: ['setup'],
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
