# Issue #442 — E2E du conflit 409 au désarchivage (BR-EVE-015)

**Vague :** 1 (parallèle avec #446 et #447) | **Taille :** S | **Commit :** `cd4c6b3`
*(2 fichiers, +113/-1 — vérifié par le lead via `git show --stat`)*

## Objectif

Couvrir le chemin 409 de `useSetEventArchived.ts` (invalidation de `queryKeys.products.all` même en
conflit, pour éviter la boucle de re-clics avec une `version` périmée). La logique existait depuis
#307 / BR-EVE-015 et n'avait **jamais** été exercée.

## Ce qui a été livré

- `frontend/e2e/sprint-61-archived-events.spec.ts` — un `describe` `#442`, 1 test (+102 l.)
- `frontend/src/components/products/ProductDetailView.tsx:419` — `data-testid` +
  `data-kind={conflict|generic}` sur le `<p role="alert">` (le `role` est conservé)

Scénario : deux contextes navigateur sur le même compte. A modifie par API le **`title`** de
l'événement archivé (version N→N+1, l'événement **reste archivé**) ; B, page ouverte en vue
« archivés », clique désarchiver avec la version N → **409 réel** → message inline → re-fetch →
2ᵉ clic **200**.

**Le choix de conception qui rend le test possible** : A bump un champ **tiers** (`title`), pas
`archived`. Un désarchivage par A ferait disparaître le bouton de B au re-fetch, et le 4ᵉ critère
(« le 2ᵉ clic réussit ») deviendrait intestable. Bonus : le titre écrit par A, absent du DOM de B
avant le conflit, sert de **preuve observable** du re-fetch.

## Spec exécutée — oui, et l'oracle a été armé

Commande : le runner Playwright ciblé sur `sprint-61-archived-events.spec.ts`,
`--project=chromium --workers=1` → `EXIT=0`, **11 passed / 0 failed** (5 setup + 6 chromium),
nouveau test en 1,1 s.

Environnement : backend conteneur `mytimeline-e2e-backend-e2e-1` (:8086, `APP_CORS_ALLOWED_ORIGINS`
inclut `:3000`), `next dev` webpack sur :3000, `E2E_API_PROXY_TARGET=:8086`.
**Oracle proxy vérifié AVANT le run** : `/api/auth/me` = **401** (et non 404) — c'est précisément le
contrôle que `PIT-S62-012` impose et dont l'absence avait fait conclure « BLOQUANT » à tort au S62.

**Contrôle négatif** : copie temporaire de la spec sans le PATCH concurrent → **1 failed** sur
`expect(status).toBe(409)`. Le 409 vient donc bien de la péremption de version, pas d'un artefact.
Copie supprimée.

Aussi : `tsc --noEmit` 0 erreur ; `eslint` 0 issue sur les 2 fichiers ;
`vitest ProductDetailView.test.tsx` **15/15** (le composant modifié reste couvert).

## Critères d'acceptation — 3 tenus, 1 honnêtement dégradé

| # | Critère | Statut |
|---|---|---|
| 1 | Version périmée simulée | ✅ `bump.status()===200`, `version` différente, `archived===true`, puis PATCH de B en **409** |
| 2 | Message de conflit inline | ✅ `toBeVisible()` sur le testid + `data-kind="conflict"` — pas d'accroche sur du texte traduit |
| 3 | Données re-fetchées | ⚠️ **couvert par proxy, pas par mesure directe.** `GET /api/users/{id}/products` observé à 200 après le 409, et la ligne affiche le titre écrit par A. L'invalidation de `queryKeys.products.all` elle-même **n'est pas observable en E2E** — l'agent refuse de prétendre l'asserter |
| 4 | 2ᵉ clic OK sans boucle | ✅ 2ᵉ PATCH **200**, `archived=false` serveur, ligne et message disparus |

Le critère 3 est exactement le point que le briefing demandait de ne pas cocher à tort. Il ne l'est
pas.

## Écarts au plan

- **L'architect s'est trompé** : son mini-plan annonce « 7 tests » dans la spec S61. Il y en avait
  **5**. L'issue disait 5 — elle avait raison. *Recompté par le lead sur `origin/dev` : 5.*
- **L'issue s'est trompée** sur « rien à développer » : le `<p role="alert">` n'avait aucun testid.
  Arbitrage rendu : testid **ajouté** plutôt que `getByRole('alert')` seul, qui serait ambigu si un
  autre alert apparaissait — et sans lui le check coverage-E2E de la CI n'aurait rien à citer.
- **Information pour #441 (vague 2)** : le chemin de conflit du désarchivage passe par le namespace
  **`products.detail`** (`unarchiveConflict` / `unarchiveError`,
  `public/locales/fr/products.json:169-170`), **pas** par `ConflictDialog`. Confirmé,
  `ConflictDialog.tsx` ni lu en écriture ni touché.

## Non vérifié — déclaré par l'agent

- Suite E2E complète (174 specs) **non rejouée** — seul ce fichier. Aucune régression mesurée
  ailleurs.
- `next build` **non lancé** : `.next` partagé avec 2 agents parallèles, un build aurait tué leur
  environnement (`PIT-S62-009`). Lint + tsc sur les fichiers touchés à la place.
- Firefox / WebKit hors périmètre (le projet `firefox` est restreint à une autre spec).
- Le run a tourné contre le backend conteneur d'un **autre** projet compose (`mytimeline-e2e`,
  :8086, up 13 h), pas contre un stack provisionné par l'agent.

## Signaux mémoire

- `[MEMORY:pattern]` — E2E d'un conflit optimiste sur un flux à **un seul booléen** : le contexte
  concurrent doit bumper un champ **tiers**, jamais le champ testé, sinon le re-fetch supprime
  l'affordance et « le 2ᵉ clic réussit » devient intestable. Le champ tiers rendu sert en prime de
  preuve observable du re-fetch. Anti-pattern : asserter l'invalidation du cache TanStack depuis
  Playwright.
- `[MEMORY:pitfall]` — le hook `warn-test-delegation.sh` (PreToolUse) tue la commande **entière**,
  y compris un `cat <<EOF` qui ne fait qu'**écrire** un fichier contenant la chaîne d'invocation
  Playwright. Le fichier n'est jamais créé et l'échec suivant (« no such file ») oriente vers un
  faux diagnostic. Prévention : écrire ces fichiers avec l'outil `Write`, jamais par heredoc Bash.
  **Rejoué par le lead** en écrivant ce même artefact : le heredoc a bien été tué, l'outil `Write`
  passe. Piège confirmé deux fois.

## Recommandations suite

Négations explicites : pas de `RECOMMAND_TEST_RUNNER` (6 tests, 27,8 s, exécutés et verts), pas de
`RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` (aucun schéma ni surface d'auth).

`RECOMMAND_FOLLOWUP:` `next build` non joué sur ce diff faute de `.next` isolé — à couvrir par la CI
avant merge. [triage XS | domaine infrastructure]

**Environnement laissé debout et re-sondé après coup** (`/api/auth/me` = 401) : `next dev` :3000 +
backend :8086, réutilisables par #446.

STATUS: COMPLETED
