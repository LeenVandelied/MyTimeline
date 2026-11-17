# Review batch — Sprint 64 (2 cycles)

## Cycle 1 — sur `origin/dev..HEAD` (commit `b42bd40`)

**0 CRITIQUE · 3 MAJEUR · 3 MINEUR.** Les 3 MAJEUR ont été **reconfirmés dans le code par le lead**
avant dispatch (aucun n'a été pris pour argent comptant).

| # | Fichier:ligne | Défaut |
|---|---|---|
| MAJEUR 1 | `ci.yml:332-336` | `$!` capturait le PID de **`npx`**, pas de `next start`. Le step `Stop backend and frontends` tuait donc le wrapper et **mentait** sur ce qu'il arrêtait. |
| MAJEUR 2 | `ci.yml:327-336` | Dernière commande du step = `echo >> "$GITHUB_ENV"` ⇒ **le step ne pouvait jamais échouer**, même serveur mort à la seconde 0. Coût : jusqu'à 180 s d'attente avant un diagnostic qui aurait accusé l'attente. |
| MAJEUR 3 | `ci.yml:118` | **Aucun `timeout-minutes` nulle part dans le workflow.** Préexistant, aggravé par #462 (build + 2 serveurs + `workers:1` + `retries:2`). Un serveur bloqué épinglait un runner 6 h. |
| MINEUR 4 | `playwright.config.ts:100-101` | Message d'erreur **contradictoire** : recommandait webpack pour décrire un chemin turbopack. |
| MINEUR 5 | `ci.yml:398/427` | Les 2 passes partageaient `playwright-report/` et `test-results/` — la passe 2 **écrasait** la passe 1. Adjacent à l'objet même de #461 : une preuve écrasable est une preuve fragile. |
| MINEUR 6 | `auth-guard.spec.ts:204` | `url: 'http://localhost:3000'` en dur, alors que le sprint introduit un **second port**. |

Confirmé **intact** au cycle 1 : les 4 garde-fous des vagues précédentes, l'évaluation paresseuse de
`assertWebServerEnv()` (jamais appelée sur le chemin CI), les variables posées au `next build` et
absentes des `next start` (`PIT-S58-003`), l'absence de vert-qui-ment sur la passe 2, le
`RATE_LIMIT_ENABLED: false` qui écarte le franchissement du rate-limit register par la passe 2.

## Correctifs — commit `9c774e4` (3 fichiers, +99/-11)

Les 3 MAJEUR sont traités **à la cause**, pas rattrapés : binaire direct plutôt que `pkill` en filet,
contrôle de vie plutôt que tolérance à l'échec silencieux.

**Le dev a corrigé son propre commentaire pour ne pas surclamer** : il n'a pas pu reproduire la
survie des orphelins (son essai montre bien que `$!` désignait le wrapper, mais `npm` a relayé le
SIGTERM et l'enfant est mort). Le commentaire final dit donc que le PID est faux **par
construction**, et que la survie de l'enfant dépend du relais de signal — « un détail
d'implémentation, pas un contrat ».

## Cycle 2 — sur le seul commit `9c774e4`

Motivé par `sprint-review-cycle-2-avant-pr` : au Sprint 62, c'est **dans les commits de correction
de review** qu'on a retrouvé des gardes non armées. Un correctif qui a l'air d'armer sans armer est
pire que le défaut d'origine.

**0 CRITIQUE · 0 MAJEUR · 3 MINEUR. Verdict : prêt pour PR.**

Les 6 correctifs sont **armés**, chacun vérifié sur pièce et non sur parole :

| # | Preuve apportée |
|---|---|
| MAJEUR 1 | `node_modules/.bin/next` → symlink vers `next/dist/bin/next`, shebang `#!/usr/bin/env node`, exec direct ; `next-start.js:30` appelle `startServer` **in-process**, aucun `fork` ⇒ `$!` = PID du serveur. Noms exportés = noms relus au step d'arrêt. |
| MAJEUR 2 | Shell GitHub par défaut = **`bash -e`** (aucun `shell:` dans le workflow) ; dernière commande du step = `assert_alive … \|\| exit 1` ⇒ code retour **non avalé**. Fonction appelée pour les **deux** serveurs. Le `tail … \|\| true` est interne et ne masque pas le `return 1`. |
| MAJEUR 3 | Une seule occurrence, indentation 4 espaces = niveau **job**, alignée sur `runs-on:`, dans le bloc `e2e`. Aucun autre job n'en hérite. |
| MINEUR 5 | **Nom de variable vérifié dans la source de `playwright@1.61.1`** : `reportFolderFromEnv()` lit `PLAYWRIGHT_HTML_OUTPUT_DIR \|\| PLAYWRIGHT_HTML_REPORT`, et son résultat est prioritaire. Chemins résolus **sous** les 2 `path:` d'upload, restés inchangés avec leur `if-no-files-found: warn`. |
| MINEUR 6 | `baseURL!` justifié : `playwright.config.ts` déclare toujours un `baseURL` (fallback `http://localhost:${PORT}`). |

**Aucune régression** : `workers: 1`, reporter composite, `testMatch` firefox, bloc
`upload-artifact`, `assertWebServerEnv()` en évaluation paresseuse, step `Stop` non cassé et exports
PID bien **avant** le contrôle de vie (le survivant est ramassé).

**Commentaire MAJEUR 1 : EXACT** — ni surclamé, ni sous-estimé.

## MINEUR restants, non corrigés — assumés

1. `ci.yml` — `sleep 2` + `kill -0` ne détecte que la mort dans les **2 premières secondes**. Une
   mort à t+5 s retomberait sur le step de sonde, qui sort en erreur : **diagnostic dégradé, pas
   faux vert**. Ne pas resserrer sans mesure.
2. `ci.yml` — `label` / `pid` / `log` / `port` non déclarés `local` dans `assert_alive` : fuient en
   globales du step. Sans conséquence (aucun homonyme), fragile si le step grossit.
3. **`frontend/package.json:13` — `test:e2e` porte `--pass-with-no-tests`.** Un filtre vide
   resterait **VERT** en passe 1. Préexistant et hors périmètre du commit, mais **exactement la
   famille de défauts que ce sprint combat** (« vert qui ne prouve rien »), et adjacent à #461.
   → Candidat follow-up à arbitrer en `/sprint end`.
