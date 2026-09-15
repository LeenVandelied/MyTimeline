# Issue #284 — Spec E2E des cas d'échec du flux reset-password — DONE

**Sprint :** 45 · **Vague :** 2 · **Taille :** S · **Modèle :** opus/medium · **Domaine :** auth
**Commit :** `4e86503`

## Objectif

Couvrir les cas d'échec du flux reset-password, absents de l'E2E nominal (#145, Sprint 37).

## Livré

`frontend/e2e/reset-password-failures.spec.ts` (204 l., **seul fichier touché**), 2 tests :

1. **Ancien mot de passe rejeté** — reset OK → login avec l'ANCIEN mdp → 401 + `login-error`, pas de dashboard.
2. **Token rejoué** — reset OK → rejeu du MÊME token → **400 générique** (BR-AUT-012) + `reset-error`,
   puis login avec le mdp du 1er reset → 200 (prouve l'absence d'effet de bord du rejeu).

**1 compte frais dédié par test** (`e2eold` / `e2erpl`, via `uniqueIdentity` de `support/auth.ts`).
Token capté via `waitForResetToken` livré par #283. `forgot-password.spec.ts` non modifié.

## Décision clé — pourquoi la spec n'est pas un faux vert

L'UI rend le **même** `data-testid` d'erreur (`reset-error` / `login-error`) pour un rejet métier **et**
pour un 429 de lockout. Une spec basée sur le seul message passerait donc au vert **sous lockout** —
c'est-à-dire réussirait pour la mauvaise raison, exactement le risque que l'issue #284 nomme.

→ Les assertions portent sur le **statut HTTP réel** : `page.waitForResponse(...)` posé **avant** le click,
puis assertion du code exact (400/401). Un 429 produit alors un diff explicite au lieu d'un faux succès.

Budget par compte : 1 forgot, ≤2 reset, 1 login — sous toutes les limites.
Helper `registerFreshUser` dupliqué localement **à dessein** : importer depuis un `*.spec.ts` enregistrerait
les tests 2× ; `registerAndLogin` ouvrirait une session non voulue.

## Vérifications

**FAIT** — `tsc --noEmit` exit 0 ; `eslint` exit 0 ; `prettier --check` exit 0 (après `--write`, le 1er
check échouait) ; `playwright test --list` collecte bien les 2 tests (exit 0). Lecture réelle des pages
`reset-password/page.tsx`, `login/page.tsx`, du `RateLimitingFilter`, du controller (200/400 confirmés)
et du job CI e2e.

**NON FAIT** — ⚠ **aucune exécution E2E** (stack down en local, conformément au briefing). Les statuts
200/400/401 et la stabilité des sélecteurs ne seront validés qu'en **CI**. Pas de run vitest, pas de
`next build`.

## [MEMORY:*] signaux

- `[MEMORY:pattern]` Un E2E de cas d'échec peut passer au vert **pour la mauvaise raison** (429 lockout au
  lieu du rejet métier) parce que l'UI rend le même `data-testid` d'erreur. Solution : poser
  `page.waitForResponse(...)` **avant** le click et asserter le statut HTTP exact. Anti-pattern : se
  contenter de `expect(getByTestId('x-error')).toBeVisible()`.
- `[MEMORY:decision]` Lockout #141 : le job CI e2e pose déjà `RATE_LIMIT_ENABLED=false` (`ci.yml` l.174),
  le `RateLimitingFilter` est intégralement bypassé en e2e. L'isolation 1 compte/test est **conservée
  malgré tout**, pour que la spec survive au retrait de cette variable.
- `[MEMORY:pitfall]` `frontend/.eslintcache` est **tracké par git** : tout run eslint local le
  modifie/supprime et pollue le working tree partagé d'un sprint. → `git checkout --` après lint, ou le
  sortir du suivi.

## Recommandations suite

**RECOMMAND_TEST_RUNNER** — sur le job CI `e2e` après merge : c'est le seul gate réel de cette spec,
budgéter 1-2 itérations.
Piège à surveiller au 1er run rouge : si `submitResetPassword` renvoie 429 dès le **premier** appel, la
cause est `RATE_LIMIT_ENABLED` non transmis, **pas** la spec.

**RECOMMAND_FOLLOWUP** — `frontend/.eslintcache` versionné devrait être gitignore (3e signalement du
sprint : les 3 agents l'ont rencontré).

STATUS: COMPLETED
