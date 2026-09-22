# Issue #329 — auth.setup.ts : retry sur l'échec de rendu de /fr/register

> Sprint 54, vague 1. Briefing : `briefing-329.md` (40 Ko). Ancrage pré-spawn : `spawn-ref-329.txt` (`68a924c`).

## Commit

`515ab87` — `:white_check_mark: test(e2e): retente le rendu de /fr/register et distingue les causes d'échec (#329)`
3 fichiers, +229 / −9.

## Fichiers

| Fichier | Lignes | Quoi |
|---|---|---|
| `frontend/e2e/support/register-page.ts` | 1-98 (**nouveau**) | logique de retry de rendu extraite, donc testable |
| `frontend/e2e/auth.setup.ts` | 3, 36-49, 60-83, 99-118, 139-142 | consomme le helper, message d'échec réécrit, budget de timeout |
| `frontend/e2e/auth-setup-render-retry.spec.ts` | 1-71 (**nouveau**) | exerce le retry sur un 500 simulé |

## Périmètre — les deux points laissés à trancher, tranchés

- **Ligne 70 (2ᵉ `expect(register-form)` dans le `catch`)** → **TRAITÉE**. Même défaut exact que la ligne 47 : un 500 pendant le backoff jetait sans retry. Corrigée par `ensureRegisterForm(..., mode: 'recover')` — `attempt 1` = simple vérification, coût nul sur le chemin nominal.
- **Critère d'acceptation n°3 (500 transitoire simulé)** → **DÉMONTRÉ**. La logique de retry est extraite dans `support/register-page.ts` et exercée par `auth-setup-render-retry.spec.ts` via `page.route('**/fr/register')` : 500 sur la 1re requête puis `route.continue()`. Pas d'instrumentation dans le projet `setup` lui-même — y câbler un 500 casserait le provisioning réel de toutes les specs. Un 2ᵉ test couvre le **500 persistant** et vérifie que l'échec reste bruyant et bien diagnostiqué (anti-régression du signal, qui était le risque nommé par l'issue).
- **3ᵉ mode de confusion du même message (403 CORS, runbook S47 piège 2)** → **COUVERT**, au-delà du périmètre demandé. Le message ne suppose plus une cause : un listener `page.on('response')` collecte les statuts **réellement observés** sur `POST /api/auth/register`, et le message les rapporte avec une grille de lecture 429 / 403 / 409.

## Tests (mesurés, pas supposés)

- Projets `setup` : **5 passed / 0 failed** (persist + 4 provisions)
- Suite E2E complète : **108 passed / 0 failed / 0 skipped** — 154 s, stack locale montée par l'agent (backend `:8080` profil `dev,e2e`, base `eventmanager_e2e`, `RATE_LIMIT_ENABLED=false` ; front `:3100`), `--workers=1`
- `tsc --noEmit` : 0 erreur · `eslint` sur les 3 fichiers : 0 issue
- Message d'échec **provoqué pour de vrai** (429 forcé dans un run jetable, non commité, revert vérifié `git status` propre)

## Message d'échec final (les deux variantes, pour jugement de lisibilité)

Échec de **soumission** :
> `ÉCHEC DE SOUMISSION du register shared après 3 tentatives — le formulaire register s'est bien AFFICHÉ, ce n'est donc PAS un échec de rendu. statuts HTTP observés sur POST /api/auth/register: [429, 429, 429]. Lecture: 429 = rate-limit register 5/min/IP (bucket non rechargé) ; 403 = CORS refusé (le profil dev fige app.cors.allowed-origins=http://localhost:3000, cf. docs/memory/sprints/sprint-47/e2e-local-runbook.md §pièges) ; 409 = username/email déjà enregistré. Dernière erreur: <erreur Playwright>`

Échec de **rendu** :
> `ÉCHEC DE RENDU de /fr/register (shared) après 3 tentative(s) dont 2 page.reload() — dernier statut HTTP: 500. Ce n'est PAS un rate-limit register 429 : le formulaire ne s'est JAMAIS affiché, aucun POST /api/auth/register n'a donc été tenté. Piste n°1 — 500 du serveur de dev Next (InvariantError…) : vérifier curl … puis REDÉMARRER le next dev (cf. runbook). Dernière erreur: …`

## ⚠ Prémisse du briefing INFIRMÉE — le retry 429 existant était structurellement mort

Le briefing (et l'issue, et le runbook S47) présentent la boucle `REGISTER_RETRIES` comme fonctionnelle : elle ne l'était pas.

Budget Playwright par défaut = **30 s**. Un seul cycle de retry coûte 8 s (attente `login-form`) + 20 s (`REGISTER_BACKOFF_MS`) = **28 s** → la 2ᵉ soumission dépassait **toujours** le budget. Mesuré : **4/4 `provision` en `Test timeout of 30000ms exceeded`, zéro ligne de diagnostic**. Le retry 429 documenté depuis le S47 n'a donc jamais pu s'exécuter au-delà de la 1re tentative.

Corrigé par `PROVISION_TIMEOUT_MS = 150_000`. Sans ce correctif, le nouveau message d'échec de cette issue n'aurait jamais été atteint non plus.

Trois écarts mineurs relevés au passage :
- `auth.setup.ts:14` dit « 3 comptes » ; `accounts.ts:140` en déclare **4** (SHARED / PWD / DEL / PROD). Commentaire périmé, **non corrigé** (hors périmètre).
- Table du briefing : les déclarations `setup(...)` vont de 86 à **102**, pas 101.
- Piège de mesure confirmé sur soi-même : un 1er run complet a donné 4 provisions rouges qui ont failli être imputées au rate-limit — en réalité backend **et** front étaient morts (`lsof` : plus aucun port). Ne jamais conclure sur le texte de l'erreur.

## [MEMORY:pitfall] Un backoff de retry qui dépasse le timeout du test rend le retry inatteignable

Tout `waitForTimeout` de backoff impose un `test.setTimeout()` explicite, sinon **le retry ET son message d'échec sont tous deux inatteignables** — le test meurt sur le budget par défaut avant d'y arriver, sans aucun diagnostic. Prévention : budget = (tentatives × attente) + (backoffs) + marge, écrit en commentaire à côté de la constante.

## [MEMORY:pattern] Message d'échec E2E qui rapporte les statuts mesurés au lieu de supposer la cause

Problème : un message qui affirme une cause HTTP en dur (« 429 probable ») a confondu **3 causes distinctes** (429 rate-limit, 403 CORS, 500 rendu) pendant deux sprints. Solution : `page.on('response')` collecte les statuts réels de l'endpoint ; le message les rapporte accompagnés d'une grille de lecture. Anti-pattern : la cause en dur.

## Pack

`pack_lu: OUI` — `cp-frontend.md` §« Tests (Vitest + RTL) — pièges », complété par le runbook S47 §« Instabilités du serveur de dev ».

## Recommandations suite

**`RECOMMAND_FOLLOWUP`** — `frontend/e2e/auth.setup.ts:128` : `expect(dashboard).toBeVisible()` sans timeout explicite (5 s par défaut) a échoué une fois sur une compilation à froid de `/fr/dashboard` par `next dev`. Aligner sur un timeout explicite comme le reste du fichier. [triage XS | domaine auth]

- `RECOMMAND_TEST_RUNNER` : **non** — suite mesurée par l'agent lui-même (108/0).
- `RECOMMAND_SECURITY` : **non** — le fichier touche le parcours d'inscription en test, mais aucun contrôle d'accès, aucun secret, aucune donnée personnelle réelle (comptes E2E générés).
- `RECOMMAND_DB_EXPERT` : **non** — zéro migration, zéro schéma.
- `RECOMMAND_UI_DESIGN` : **non** — aucun changement d'interface.

STATUS: COMPLETED
