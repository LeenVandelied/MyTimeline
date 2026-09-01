# Audit tests — Sprint 64

> Généré en fin de Phase 6. Un `[MISSING]` bloque la Phase 9 (PR).
> Commit auditté : `7a91688` (`sprint/64`), base `origin/dev` à `a5f4636`.

## Couverture par BR

**Aucune BR n'est impactée.** Ce sprint est **100 % outillage E2E/CI** : le diff ne touche aucun
fichier source applicatif — ni `backend/src/`, ni `frontend/src/`, ni `frontend/app/`.

| Fichier de code modifié | Nature | BR touchée |
|---|---|---|
| `.github/workflows/ci.yml` | job `e2e` (build de production, 2 serveurs, oracles, upload) | aucune |
| `frontend/playwright.config.ts` | reporter, `workers`, `assertWebServerEnv()`, `webServer` | aucune |
| `docs/memory/audits/sprint-63-test-coverage.md` | correction d'un libellé fautif | aucune |

La colonne « cross-system flow » du gabarit ne s'applique donc pas, et **aucun E2E métier n'est
requis** : il n'y a pas de flux métier nouveau ou modifié. Le sprint change **comment** les tests
tournent et **ce qu'ils laissent comme preuve**, pas ce qu'ils vérifient.

**Aucun `[MISSING]`.**

## Résultats des runs

| Suite | Résultat |
|---|---|
| `tsc --noEmit` (frontend) | **EXIT=0**, aucune erreur |
| `next build` (frontend) | **EXIT=0**, ~22 s, avec `NEXT_PUBLIC_API_URL=/api` **et** `E2E_API_PROXY_TARGET` posées **au build** (`PIT-S58-003`) |
| Lint frontend | **EXIT=0**, 0 warning / 0 error |
| Vitest frontend | **1004 / 1004**, 0 failed, 101 fichiers |
| Tests backend | **462 / 462**, 0 failed, 0 error, 0 skipped — `BUILD SUCCESS` |
| E2E (chemin par défaut, turbopack via `webServer`) | **229 passed / 2 failed / 8 skipped** en 6,8 min — **0 `ECONNREFUSED`** |

`next build` et `tsc` sont les contrôles les plus pertinents de ce sprint : l'issue #462 ajoute
`next build` au job CI `e2e`, et `next.config.mjs:61-65` porte `ignoreBuildErrors: false` +
`ignoreDuringBuilds: false`. Le job `e2e` rougira désormais sur une erreur de types ou de lint —
ce couplage est nouveau, assumé, et vérifié vert ici.

## Les 2 échecs E2E — connus, hors périmètre, suivis

`timeline.spec.ts` :: `live-region` (≈ ligne 966) et `event-outside-label` (≈ ligne 1004).

Famille de flakes de **virtualisation verticale**, diagnostiquée pendant ce sprint et suivie par
l'issue **#467** (P1, milestone Sprint 65). La suite sème une catégorie et un produit par spec sans
nettoyage, et dépasse `LANE_VIRTUALIZATION_MIN_ROWS = 60` — 76 lanes au run CI, 77 en local. La lane
semée n'est plus montée dans le DOM.

**Ni causée ni corrigée par ce sprint.** Trois observations le confirment : le run CI de la vague 1
voyait `live-region` rouge et `event-outside-label` vert ; le run local de la vague 2, l'inverse ;
la re-mesure finale, **les deux**. Le membre qui tombe dépend du volume accumulé.

⚠ **Ces 2 échecs feront rougir le check requis `e2e` sur la PR de sprint s'ils se reproduisent.**
C'est une cause connue et documentée, pas une régression du sprint.

## Ce qui n'a PAS été vérifié

- **Aucun run CI sur runner.** `ci.yml:35-39` ne déclenche que sur `pull_request` / `push` vers
  `dev` | `main` : rien ne tourne sur `sprint/64`. **La PR de sprint sera le premier vrai run** du
  job `e2e` réécrit. Restent donc non prouvés sur runner : la durée réelle du job, le comportement
  de `next build` sous `ignoreBuildErrors: false` en CI, et le maintien de **deux** `next start` en
  tâche de fond entre steps (même patron que le backend, qui fonctionne — mais jamais exercé pour
  deux process frontend).
- **La passe 2 RS256 appairée a été prouvée en local sur `:3100`**, pas `:3001` (le CORS du conteneur
  local était figé sur 3000/3100). Seul le numéro de port diffère.
- **L'oracle `curl /api/auth/me` → 401 n'a pas été rejoué pendant la fenêtre** de la re-mesure E2E
  finale. Preuve seulement indirecte que le proxy était en place : le projet `setup` (register) est
  vert et 229 tests sont passés, ce qu'un 404 aurait empêché.
- **La mort du serveur à ~5 workers n'a pas été reproduite** dans cet environnement : elle est
  reprise de l'audit S63. La parade `workers: 1` est calibrée contre un symptôme documenté ailleurs.
- Couverture JaCoCo / Vitest coverage : non demandée, non lancée.

## Ce qui a été prouvé, et comment

C'est l'apport réel de ce sprint — chaque affirmation est adossée à une mesure, pas à un run vert :

| Affirmation | Preuve |
|---|---|
| Un échec E2E en CI laisse un artefact exploitable | Échec **provoqué** sur PR jetable (run `33563972215`) : artefact de 8,9 Mo contenant `index.html` (1,1 Mo) et 4 `trace.zip` — dont 56 fichiers de trace pour le test provoqué |
| La passe 2 RS256 exerce encore le mode vérifiant | **Contrôle négatif** : 12/12 sur le serveur vérifiant, **5 rouges** sur le serveur dégradé (`Expected 307 / Received 200`) |
| Le prérendu de production ne casse pas `/_not-found` | 5 tests exposés **rejoués un par un** contre `next start`, 13/13 sur le fichier |
| `workers: 1` empêche la mort du serveur | Run complet **par le chemin par défaut** (turbopack via `webServer`) : 0 `ECONNREFUSED` |
| L'échec précoce de #427 fonctionne | 4 cas joués, dont la variable **exportée vide** (`PIT-S55-001`) : exit 1 en < 1 s |

## Conclusion

**Prêt pour la PR** au regard de cet audit. Aucun `[MISSING]`.

Réserve à porter dans le corps de la PR : le job `e2e` réécrit n'a **jamais tourné sur un runner**,
et les 2 flakes de l'issue #467 peuvent le faire rougir sans que ce soit imputable au sprint.
