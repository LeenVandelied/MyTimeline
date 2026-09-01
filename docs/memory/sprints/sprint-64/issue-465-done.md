# Issue #465 — Le serveur dev meurt sous charge E2E (ECONNREFUSED)

**Sprint 64, vague 2** · priority:P2 · size:M · `epic:infrastructure`
**Issue re-scopée avant développement** (arbitrage dev, 2026-09-01) : parade documentée, pas de
cause racine. Corps réécrit + commentaire de traçabilité `#465-issuecomment-5500891018`.
**Commit :** `4b9b4c1` — `:wrench: fix(e2e): borne les workers Playwright a 1 en local (#465)`
**Diff :** 2 fichiers, +60 / -2

## Ce qui a été livré

| Fichier | Changement |
|---|---|
| `frontend/playwright.config.ts:21-77` | `workers: 1` + un commentaire de 55 lignes qui documente la parade, les mesures, et le fait que **la cause racine n'est pas connue**. |
| `docs/memory/audits/sprint-63-test-coverage.md:94` | Libellé « projet Firefox » corrigé en « suite **COMPLÈTE** `setup` + `chromium` + `firefox` », avec le raisonnement : le projet `firefox` est restreint par `testMatch` à une spec depuis le S62, il ne peut pas produire 230 tests. |

## Mesures

Poste : **10 cœurs** (`hw.ncpu` = `hw.physicalcpu`) ⇒ le défaut implicite de Playwright en local
était **5 workers**. Suite complète = 239 tests / 29 fichiers, 230 non skippés.

| `workers` | Résultat | Durée | `ECONNREFUSED` |
|---|---|---|---|
| `undefined` (≈5) | 168 passed / 62 failed | — | **62** (repris de l'audit S63, **non rejoué**) |
| `2` | 226 passed / 5 failed / 8 skipped | 4,8 min | **0** |
| **`1` — retenu** | **230 passed / 1 failed / 8 skipped** | **9,0 min** | **0** |

Le total 230 non skippés recoupe exactement le `168 + 62 = 230` de l'audit S63 — ce qui **confirme
indépendamment** la correction du libellé.

## Pourquoi 1 et pas 2, alors que 2 satisfaisait déjà l'oracle

C'est le point le plus utile de cette issue. À 2 workers, **4 des 5 échecs sont `PIT-S47-004` mot
pour mot** : `toHaveValue` attend `sh4148187640411` et reçoit `sh4148087641348`. Deux process Node
chargent `e2e/support/accounts.ts` **avant** que le projet `setup` n'ait persisté
`.auth/accounts.json` ; chacun fige alors son propre `RUN` dérivé du `pid`, et la spec compare son
identité locale au compte réellement enregistré par l'autre process.

`dependencies: ['setup']` n'y change rien : il ordonne **l'exécution**, pas le moment de **l'import
du module**.

Livrer 2 aurait donc produit 4 rouges garantis à chaque run local — l'exact contraire du but de
#465, qui est de rendre un run local **interprétable**. Coût assumé : 4,8 min → 9,0 min.

## Écart au briefing — accepté par le lead

Le briefing interdisait de toucher la branche `process.env.CI ? 1`. Les deux branches ayant
convergé sur 1, le dev a écrit `workers: 1` au lieu de `process.env.CI ? 1 : 1`.

**Comportement CI strictement inchangé** (1 avant, 1 après). Accepté : le commentaire au-dessus de
la ligne énonce explicitement que la CI valait déjà 1, ce qui préserve l'information qu'un futur
relèvement du parallélisme local devrait rétablir le ternaire. Sur ce dépôt les commentaires font
office de mémoire d'arbitrage.

## Deux limites de la preuve — à lire avant de considérer #465 comme close

1. **La mort à 5 workers n'a pas été rejouée** dans cet environnement : elle est reprise de
   l'audit S63. Le dev le justifie (re-provoquer une panne serveur n'apprend rien de plus que la
   borne) et l'écrit dans le commentaire du fichier. La parade est donc calibrée contre un symptôme
   **documenté ailleurs**, non reproduit ici.

2. **Le run de validation n'a pas utilisé le chemin qui échouait.** Les mesures ont été prises
   contre un **serveur dev externe** (`PLAYWRIGHT_BASE_URL` posé, donc `webServer` à `undefined`),
   lancé en **webpack** et non en `--turbopack` — alors que la mort documentée au S63 s'est produite
   sur le serveur **turbopack lancé par le `webServer` de Playwright**, via `npm run test:e2e`.
   Le critère d'acceptation « un run local complet sans `ECONNREFUSED` » est donc satisfait dans une
   **configuration de serveur différente de celle qui mourait**. Borner les workers reste sain et le
   commentaire est honnête, mais l'oracle n'a pas exercé le chemin par défaut.
   → Décision de re-mesure : à arbitrer par le dev.

## Autre échec observé, non corrigé (hors périmètre)

`timeline.spec.ts:1004 :: event-outside-label` — **persiste à 1 worker**, donc sans rapport avec le
parallélisme. Même mécanique que le flake diagnostiqué en vague 1 : artefact de ce run à
**77 lanes / 61 `list`** contre `LANE_VIRTUALIZATION_MIN_ROWS = 60`
(`frontend/src/components/timeline/virtualization.ts:80`) ⇒ la lane semée n'est jamais montée
(« element(s) not found »).

**Fait nouveau et important** : le `live-region` du diagnostic de la vague 1 est passé **VERT** sur
ce run, tandis qu'`event-outside-label` a rougi. Ce n'est donc pas un test fragile isolé mais une
**famille** — le test qui tombe dépend de l'ordre et du volume accumulé. `PIT-S54-004` citait déjà
ce comportement sous état cumulé. La suite se rapproche de la falaise et d'autres tests suivront.

## Vérifications faites par le lead

- `git show 4b9b4c1 --stat` : 2 fichiers, +60/-2, conforme.
- Commentaire de `playwright.config.ts` relu sur disque : il énonce bien « LA CAUSE RACINE N'EST
  PAS CONNUE », met en garde contre un futur abaissement silencieux de la valeur, et documente les
  mesures.
- Diff de l'audit S63 relu : correction précise, le reste du document intact.
- Le reporter #461 (ligne 22 d'origine) et le `webServer` sont intacts.

## [MEMORY:*] signaux

- **[MEMORY:pitfall]** `PIT-S47-004` est déclaré « corrigé » par la persistance de
  `.auth/accounts.json`. **C'est faux** : le correctif ordonne l'exécution, pas l'import du module.
  La course sur le `pid` revient telle quelle dès `workers >= 2`. Ne pas rouvrir le parallélisme
  local sans sortir la lecture d'identités du scope module.
- **[MEMORY:pattern]** Un oracle étroit (« 0 `ECONNREFUSED` ») peut être satisfait par une valeur
  qui dégrade la suite **autrement**. Lire la **nature** des échecs résiduels avant de figer la
  valeur ; ne pas s'arrêter au premier palier qui coche le critère.
- **[MEMORY:decision]** 1 worker en local : seule valeur mesurée où le run local est
  **interprétable**. Aligne aussi le local sur le `--workers=1` du runbook S47 que
  `scripts/test-quiet.sh e2e` contournait (`PIT-S49-006`) — la borne étant désormais dans la
  config, ce contournement n'existe plus.

## Recommandations suite

- **RECOMMAND_FOLLOWUP** — cause racine de la mort de `next dev` sous parallélisme : non cherchée
  (hors scope). La borne est un plafond, pas une explication.
- **RECOMMAND_FOLLOWUP** — sortir `RUN` / les identités du scope module de `e2e/support/accounts.ts`
  (ou lire `.auth/accounts.json` à l'usage plutôt qu'à l'import) pour rendre `workers > 1` viable et
  le run local ~2× plus rapide.
- **Environnement pour la vague 3** — le dev ne promet **aucun état**, et il a eu raison : le
  `next dev` qu'il avait laissé sur `:3000` est **mort depuis** (`curl` → 000, plus aucun
  `next-server`). Mort **propre** — exit 0 à la fin de la tâche de fond, log terminé sur des
  `✓ Compiled` nominaux, aucune trace d'erreur : ce n'est **pas** la mort sous charge de #465.
  Chronologie vérifiée, les mesures sont acquises serveur vivant : run terminé à 22:46:01 →
  `curl` 401 après le run → `curl` 401 après le commit `4b9b4c1` → mort ensuite. **Le serveur a
  survécu aux 239 tests, ce qui est exactement ce que la borne devait obtenir.**
  Illustration en direct de `PIT-S63` — ne jamais promettre un état à l'agent suivant, donner la
  commande de relance. Backends e2e conteneurisés `:8085` et `:8086` toujours up (healthy, 2 j).
  Relance :
  `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8086 npx next dev -p 3000`
  — **webpack, pas turbopack** (`PIT-S61-007`, 4 worktrees coexistent). Sonder avant toute
  conclusion : `curl :3000/api/auth/me` doit rendre **401**. `frontend/node_modules` était **absent**
  du worktree, `npm ci` a été fait.

STATUS: COMPLETED
