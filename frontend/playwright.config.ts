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
  // #465 — POURQUOI les workers sont BORNÉS en local. C'est une PARADE, PAS un
  // correctif de cause racine.
  //
  // ⚠ LA CAUSE RACINE N'EST PAS CONNUE. Pourquoi `next dev` meurt sous charge
  // parallèle (fuite mémoire ? plafond de descripteurs ? limite de connexions ?)
  // n'a PAS été cherché : l'issue #465 a été explicitement re-scopée pour livrer
  // une borne mesurée, pas un diagnostic. On borne donc la charge en dessous du
  // seuil où la mort a été observée, sans prétendre l'avoir expliquée. Le serveur
  // peut remourir si la suite grossit, ou sur une machine différente. Si ça
  // arrive, c'est la cause racine qu'il faut ouvrir — PAS cette valeur qu'il faut
  // baisser une fois de plus en silence.
  //
  // LE SYMPTÔME : `docs/memory/audits/sprint-63-test-coverage.md` documente un run
  // local complet à 168 passed / 62 failed, dont la TOTALITÉ des échecs porte
  // `NS_ERROR_CONNECTION_REFUSED` / `ECONNREFUSED ::1:3000` — le `next dev` local
  // était mort en cours de run. Un SEUL serveur sert TOUS les workers, et
  // `undefined` laissait Playwright en prendre la moitié des cœurs (5 sur les
  // 10 cœurs du poste de mesure). Ces 62 échecs ne disaient rien sur le code.
  // ⚠ Cette mort à 5 workers est REPRISE DE L'AUDIT, elle n'a pas été rejouée
  // ici : re-provoquer une panne serveur n'apprenait rien de plus que la borne.
  //
  // CE QUI A ÉTÉ MESURÉ (S64, poste 10 cœurs, suite COMPLÈTE `setup` + `chromium`
  // + `firefox` = 239 tests, serveur dev externe via `PLAYWRIGHT_BASE_URL`) :
  //
  //   workers=2 -> 226 passed / 5 failed / 8 skipped en 4,8 min — 0 ECONNREFUSED
  //   workers=1 -> 230 passed / 1 failed / 8 skipped en 9,0 min — 0 ECONNREFUSED
  //
  // POURQUOI 1 ET PAS 2, alors que 2 satisfait déjà le critère « zéro
  // ECONNREFUSED » : à 2 workers, 4 des 5 échecs sont les specs `settings-*` et
  // c'est [[PIT-S47-004]] MOT POUR MOT — `toHaveValue` attend `sh4148187640411`
  // et reçoit `sh4148087641348`. Deux process Node distincts chargent
  // `e2e/support/accounts.ts` AVANT que le projet `setup` n'ait persisté
  // `.auth/accounts.json` ; chacun fige alors son propre `RUN` (dérivé du `pid`),
  // et la spec compare son identité locale au compte réellement enregistré par
  // l'autre process. `dependencies: ['setup']` n'y change rien : il ordonne
  // l'exécution, pas le moment de l'import du module. Borner à 2 aurait donc
  // livré une config qui produit 4 rouges GARANTIS à chaque run local — soit
  // exactement le contraire du but de #465, qui est de rendre un run local
  // INTERPRÉTABLE. À 1 worker ces 4 échecs disparaissent, ce qui confirme la
  // contention comme cause. Le coût assumé est la durée : 4,8 min -> 9,0 min.
  //
  // POURQUOI PLUS DE TERNAIRE : la branche CI valait déjà 1, la branche locale
  // vaut maintenant 1 — les deux ont convergé. **Le comportement de la CI est
  // INCHANGÉ** (elle tournait à 1, elle tourne à 1). Cette valeur aligne aussi le
  // local sur le `--workers=1` du runbook S47, que `scripts/test-quiet.sh e2e`
  // contournait en lançant `npm run test:e2e` sans drapeau ([[PIT-S49-006]]) :
  // la borne étant désormais DANS la config, ce contournement n'existe plus.
  //
  // Reste hors périmètre : le dernier échec (`timeline.spec.ts` ::
  // `event-outside-label`) n'est PAS un problème de workers — il persiste à 1.
  // C'est le flake structurel de virtualisation verticale diagnostiqué au S64
  // (`docs/memory/sprints/sprint-64/diagnostic-rouge-latent-timeline.md`) : la
  // suite sème une catégorie et un produit par spec sans nettoyage, l'artefact
  // de CE run montre 77 lanes pour un `LANE_VIRTUALIZATION_MIN_ROWS = 60`, donc
  // la lane semée n'est jamais montée. Borner les workers ne le corrige pas.
  workers: 1,
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
