import { defineConfig, devices } from '@playwright/test'

/**
 * Config Playwright E2E. Les specs vivent dans `e2e/` (28 fichiers `*.spec.ts`
 * au S65, ~240 tests). `webServer` démarre Next en local (réutilise un serveur
 * déjà lancé en dev).
 *
 * #470 — `npm run test:e2e` (frontend/package.json) ne porte PLUS
 * `--pass-with-no-tests` depuis le S65. À l'origine (#29, dépôt sans aucun
 * spec) le flag évitait un exit non-zéro sur suite vide légitime. Ce cas n'a
 * plus cours : la suite n'est jamais vide aujourd'hui, et le flag masquait un
 * vrai risque — un filtre de sélection qui ne matcherait aucun test laisserait
 * la passe 1 CI (.github/workflows/ci.yml) VERTE sans avoir rien exécuté. Sans
 * le flag, une suite vide fait échouer Playwright (comportement voulu).
 */
const PORT = 3000
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

/**
 * #427 — ÉCHEC IMMÉDIAT quand le `webServer` local n'a pas ses variables.
 *
 * LE DÉFAUT CORRIGÉ. `webServer` lance `npm run dev` en héritant simplement de
 * l'environnement du process Playwright. Si `E2E_API_PROXY_TARGET` ou
 * `NEXT_PUBLIC_API_URL` y manque, Next démarre SANS le rewrite `/api/*` : le
 * `POST /api/auth/register` du projet `setup` part en **404**, et le message qui
 * remonte oriente vers le rate-limit, le CORS ou un 409 — trois conclusions
 * fausses. Ce piège a fait dérailler les sprints **47, 56 et 57**
 * ([[PIT-S56-005]], [[PIT-S62-012]], [[PIT-S57-003]]) et coûtait ~40 s avant de
 * produire un symptôme trompeur. On échoue donc en < 1 s, avec la marche à suivre.
 *
 * POURQUOI PAS UN BLOC `env` DANS `webServer` (piste principale de l'issue,
 * ÉCARTÉE). Poser les variables ici les rendrait INVENTÉES : `E2E_API_PROXY_TARGET`
 * dépend du port réel du backend du poste (8080 en local nu, 8086 pour le
 * conteneur e2e frère — [[PIT-S56-004]]), et une mauvaise valeur redonne
 * exactement le 404 qu'on prétend supprimer, en plus silencieux puisque la
 * variable semblerait posée. [[PIT-S55-001]] : un défaut non vide défait le
 * garde-fou qu'il documente. On exige donc une valeur explicite du lanceur.
 * (Pour un `next build` la question ne se pose même pas : les rewrites sont
 * sérialisées dans `routes-manifest.json` AU BUILD — [[PIT-S58-003]].)
 *
 * PORTÉE. Ce garde-fou ne s'arme QUE sur le chemin où Playwright démarre Next
 * lui-même, c.-à-d. `PLAYWRIGHT_BASE_URL` absente. En CI depuis #462, cette
 * variable est posée par `ci.yml` et `webServer` vaut `undefined` : aucun effet.
 *
 * CE QU'IL N'ATTRAPE PAS : une valeur PRÉSENTE mais FAUSSE (mauvais port backend,
 * backend éteint). Seul l'oracle réseau tranche —
 * `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/auth/me`
 * doit rendre **401** ; un **404** signifie que le proxy n'est pas en place.
 */
const WEBSERVER_REQUIRED_ENV = ['NEXT_PUBLIC_API_URL', 'E2E_API_PROXY_TARGET'] as const

function assertWebServerEnv(): void {
  // Une variable EXPORTÉE VIDE (`E2E_API_PROXY_TARGET=`) est traitée comme
  // absente : elle ne produit aucun rewrite, seulement l'illusion d'être posée
  // ([[PIT-S55-001]]).
  const missing = WEBSERVER_REQUIRED_ENV.filter((name) => (process.env[name] ?? '') === '')
  if (missing.length === 0) return

  throw new Error(
    [
      `E2E — variable(s) manquante(s) pour le serveur Next que Playwright va démarrer : ${missing.join(', ')}.`,
      '',
      'Sans elles, `next dev` ne pose PAS le rewrite `/api/*` : le POST /api/auth/register du projet',
      '`setup` part en 404, et le diagnostic accuse ensuite le rate-limit, le CORS ou un 409 — trois',
      'conclusions fausses qui ont coûté les sprints 47, 56 et 57.',
      '',
      'DEUX FAÇONS DE REPARTIR (remplacer 8080 par le port RÉEL du backend) :',
      '',
      '  1) Laisser Playwright démarrer Next — ce chemin (`webServer` ci-dessous) :',
      '       cd frontend && NEXT_PUBLIC_API_URL=/api \\',
      '         E2E_API_PROXY_TARGET=http://localhost:8080 npm run test:e2e',
      '     ⚠ passe par `npm run dev`, donc `next dev --turbopack`. En WORKTREE (plusieurs',
      '       lockfiles), turbopack infère un mauvais workspace root : toutes les pages',
      '       rendent 500 et AUCUNE spec ne tourne (PIT-S61-007). Dans ce cas, prendre 2).',
      '',
      "  2) Viser un serveur DÉJÀ lancé (Playwright n'en démarre alors aucun) :",
      '       NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 \\',
      '         npx next dev -p 3000      # webpack — la recette diffère de 1) EXPRÈS : elle',
      '                                   # contourne le --turbopack de `npm run dev`.',
      '       PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test',
      '',
      'ORACLE AVANT TOUTE AUTRE HYPOTHÈSE — 401 = proxy OK, 404 = proxy absent :',
      `       curl -s -o /dev/null -w '%{http_code}\\n' ${baseURL}/api/auth/me`,
    ].join('\n'),
  )
}

export default defineConfig({
  testDir: './e2e',
  // Purge `.auth/accounts.json` d'un run précédent avant le projet `setup`
  // (identités partagées setup <-> specs régénérées à chaque run). Cf. e2e/global-setup.ts.
  globalSetup: './e2e/global-setup.ts',
  // Libère le verrou de run posé par le globalSetup (un seul run Playwright à la
  // fois par worktree — `e2e/.auth/` est partagé). Cf. e2e/support/run-lock.ts.
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // #469 — POURQUOI le parallélisme local est ROUVERT à 2 (il valait 1 depuis #465).
  //
  // HISTORIQUE EN DEUX TEMPS, à ne pas relire à l'envers.
  //
  // 1) #465 (S64) a borné les workers à 1 en LOCAL pour un motif de CHARGE.
  //    `docs/memory/audits/sprint-63-test-coverage.md` documente un run local complet
  //    à 168 passed / 62 failed dont la TOTALITÉ des échecs porte
  //    `NS_ERROR_CONNECTION_REFUSED` / `ECONNREFUSED ::1:3000` — le `next dev` local
  //    était mort en cours de run. Un SEUL serveur sert TOUS les workers, et
  //    `undefined` laissait Playwright en prendre la moitié des cœurs (5 sur 10).
  //    ⚠ LA CAUSE RACINE DE CETTE MORT N'EST TOUJOURS PAS CONNUE (fuite mémoire ?
  //    plafond de descripteurs ?) : elle n'a jamais été cherchée, ni au S64 ni ici.
  //    La borne reste un PLAFOND, pas une explication. Si le serveur remeurt parce
  //    que la suite a grossi, c'est la cause racine qu'il faut ouvrir — PAS cette
  //    valeur qu'il faut rebaisser une fois de plus en silence.
  //
  // 2) #465 n'est cependant PAS descendu de 2 à 1 pour la charge : à 2 workers,
  //    « 0 ECONNREFUSED » était DÉJÀ atteint. Il est descendu à 1 parce que 4 des
  //    5 échecs restants étaient [[PIT-S47-004]] — une course d'IDENTITÉS E2E, sans
  //    aucun rapport avec la charge. #469 corrige cette course à la source
  //    (`e2e/support/accounts.ts` : graine unique `E2E_RUN_ID` posée par le
  //    `globalSetup` AVANT le fork des workers + résolution paresseuse des
  //    identités), ce qui rend 2 de nouveau tenable. La borne de charge, elle,
  //    reste en vigueur : on ne remonte PAS au-delà de 2, seule valeur > 1 pour
  //    laquelle « 0 ECONNREFUSED » a été MESURÉ.
  //
  // ÉTAT DE LA VALIDATION #469 — À LIRE AVANT DE CROIRE CETTE VALEUR.
  //
  // Le mécanisme d'identités est corrigé et PROUVÉ : sur un run instrumenté, les 4
  // process workers (4 `pid` distincts) portent tous la MÊME graine
  // (`[e2e] identités — worker N (pid …) : E2E_RUN_ID=…`), et les specs `settings-*`
  // passent. Ce que la valeur 2 attend encore, c'est la preuve exigée par l'issue :
  // DEUX runs complets CONSÉCUTIFS verts sur les 4 specs `settings-*`.
  //
  // Mesures disponibles à ce jour (suite complète, 240 tests, serveur dev externe,
  // backend conteneur `:8086`) :
  //
  //   run 1 -> 231 passed / 1 failed / 8 skipped en 7 min 04 — `settings-*` VERTES,
  //            l'unique échec est `timeline-mobile.spec.ts:366` (hors périmètre)
  //   run 2 -> 227 passed / 5 failed / 8 skipped en 7 min 38 — `settings-*` ROUGES
  //
  // ⚠ LE RUN 2 A ÉTÉ INVALIDÉ, ET LA RAISON EST INSTRUCTIVE. Il portait la signature
  // `Expected sh7100651484725 / Received sh7238353220892`, soit MOT POUR MOT
  // [[PIT-S47-004]]. Ce n'en est pourtant pas : les DEUX valeurs sont des graines de
  // `globalSetup` complètes, appartenant à DEUX runs Playwright qui tournaient EN
  // MÊME TEMPS dans ce worktree — et aucun des deux garde-fous d'`accounts.ts` (graine
  // absente, identités divergentes) n'a levé, ce qu'une graine non propagée aurait
  // déclenché. Deux runs simultanés partagent `e2e/.auth/` : identités ET cookies
  // `storageState`. Le second run réauthentifie les specs du premier sur SES comptes.
  // D'où le verrou de run (`e2e/support/run-lock.ts`) qui refuse désormais le second.
  //
  // ✅ REJOUÉ ET ACQUIS (lead, S65, machine au repos, verrou de run actif). Les 2 runs
  // complets CONSÉCUTIFS exigés par #469 :
  //     run 1 — 232 passed / 0 failed / 8 skipped en 3 min 59
  //     run 2 — 232 passed / 0 failed / 8 skipped en 3 min 11
  // Un vérificateur a été ajouté à la mesure : le log de chaque run ne contient qu'UN
  // bloc `Running N tests using M workers`, ce qui atteste qu'aucune campagne
  // concurrente ne l'a pollué — c'est précisément le contrôle qui manquait au run
  // invalidé ci-dessus. Les 4 specs `settings-*` sont vertes sur les DEUX runs.
  // Repère : 9 min 0 à `workers: 1` (S64) → 3-4 min ici.
  //
  // ⚠ ACQUIS EN LOCAL SEULEMENT. La CI reste à 1 (`process.env.CI ? 1 : 2`) : le runner
  // tourne sur UNE IP et le budget `register` de la suite est DÉJÀ au plafond
  // (5 par run vs 5/min/IP, cf. `e2e/support/accounts.ts`). Rien ne démontre que le
  // parallélisme y tiendrait — ne pas le supposer.
  //
  // La borne de charge héritée de #465 reste par ailleurs en vigueur : on ne monte pas
  // au-delà de 2, seule valeur > 1 pour laquelle « 0 ECONNREFUSED » a été mesuré.
  workers: process.env.CI ? 1 : 2,
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
  // #294 — TOLÉRANCE DU DIFF VISUEL. Première clé `expect` de ce fichier : avant ce
  // sprint le dépôt ne comparait aucun rendu (0 `toHaveScreenshot`, 0 répertoire
  // `*-snapshots`, 0 PNG de référence). Seule spec concernée aujourd'hui :
  // `e2e/sprint-77-theme-visual.spec.ts` (hero de la landing + 4 écrans d'auth,
  // clair et sombre). Nomenclature laissée au DÉFAUT Playwright — les références
  // vivent dans `e2e/sprint-77-theme-visual.spec.ts-snapshots/` et se nomment
  // `{arg}-{projectName}-{platform}.png`, donc `…-chromium-linux.png`.
  //
  // ── LA VALEUR N'EST PAS UN CHIFFRE ROND CHOISI AU JUGÉ ──────────────────────────
  //
  // BRUIT MESURÉ : **0 pixel**. Trois runs complets consécutifs de la spec (11 tests)
  // contre des références fraîches, `maxDiffPixelRatio: 0`, même poste, même serveur
  // `next dev` : 11/11 verts à chaque fois. Le rendu est bit-à-bit reproductible une
  // fois neutralisé l'habillage dépendant de l'environnement (cf. `ENV_CHROME_CSS`
  // dans la spec — c'est LUI qui a rendu ce 0 possible, pas la tolérance).
  //
  // PLAFOND MESURÉ : la plus petite régression TYPOGRAPHIQUE simulée sur le hero
  // (1280 x 747 px = 956 160 px) produit **11 226 px de diff, soit un ratio 0.0117**
  // (un `letter-spacing: 0.010em` sur le `h1`). Mesures du sweep de calibration :
  //
  //     letter-spacing h1 0.035em (mutation du contrôle négatif) : 11 878 px (0.0124)
  //     letter-spacing h1 0.010em                                : 11 226 px (0.0117)
  //     font-size du sous-titre +1px                             : 125 522 px (0.1313)
  //     token `--color-accent` remplacé (fond du CTA primaire)   :  34 711 px (0.0363)
  //     `border-radius` du CTA 8px -> 4px                        :      45 px (0.00005)
  //
  // On retient **0.002**. C'est ~6x au-dessus du bruit constaté (0) et ~6x SOUS la
  // plus petite régression typographique mesurée : la marge existe dans les deux sens,
  // et le contrôle négatif de la spec l'atteste à chaque run.
  //
  // CE QUE CETTE VALEUR NE VOIT PLUS, ET QU'IL FAUT ASSUMER : une régression pesant
  // moins de 0.2 % de la surface capturée — 1 912 px sur le hero, 350 px sur la plus
  // petite carte d'auth (448 x 391). Le `border-radius` du sweep (45 px) EST dans cet
  // angle mort. Le resserrer à 0 le couvrirait, au prix d'aucune marge du tout face à
  // un environnement de rendu qu'on n'a pas pu mesurer (cf. ci-dessous).
  //
  // ── CE QUE LA TOLÉRANCE NE PEUT PAS SAUVER (à lire avant de la remonter) ─────────
  //
  // Les références sont générées en conteneur `mcr.microsoft.com/playwright:v1.61.1-jammy`
  // (Ubuntu 22.04) et la CI tourne sur `ubuntu-latest` (24.04 « noble »). Playwright
  // nomme les DEUX `linux` : les références SERONT donc bien comparées en CI, il n'y
  // aura pas d'erreur explicite « référence manquante ». Si les deux distributions
  // rastérisaient le texte différemment, le diff porterait sur des MILLIERS de pixels
  // — l'ordre de grandeur des mutations ci-dessus. AUCUNE valeur raisonnable de
  // `maxDiffPixelRatio` n'absorbe cela : au-delà de ~0.02 la spec ne peut plus rien
  // détecter et devient un test qui ne peut plus échouer. Ce qui absorbe le bruit de
  // rastérisation, c'est `threshold` (écart de couleur PAR PIXEL, défaut 0.2), pas le
  // ratio. Donc : si la CI rougit sur ces références, la réponse n'est PAS de monter
  // ce ratio, c'est de RÉGÉNÉRER les références sur l'image qui correspond au runner.
  // Recette : `docs/memory/sprints/sprint-77/issue-294-done.md`.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      // Explicite alors que c'est le DÉFAUT : c'est le paramètre qui absorbe le
      // bruit d'antialiasing (écart YIQ toléré par pixel), et donc le premier
      // qu'on serait tenté de toucher. Le laisser implicite invitait à le
      // confondre avec le ratio ci-dessus, qui ne joue pas le même rôle.
      threshold: 0.2,
    },
  },
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
  // webServer demarre uniquement si on n'utilise pas un baseURL externe.
  // #427 — `assertWebServerEnv()` s'execute AVANT la construction de l'objet :
  // sur ce chemin (et sur lui seul), l'absence de `NEXT_PUBLIC_API_URL` /
  // `E2E_API_PROXY_TARGET` fait echouer le chargement de la config en < 1 s au
  // lieu d'un 404 silencieux 40 s plus tard.
  // ⚠ En CI depuis #462, `PLAYWRIGHT_BASE_URL` est TOUJOURS posee (deux
  // `next start` de production, un par mode d'authentification) : cette branche
  // est devenue exclusivement LOCALE. C'est precisement pourquoi #427 n'est pas
  // caduque — le defaut qu'elle corrige survit entier sur le poste de dev.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : (assertWebServerEnv(),
      {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }),
})
