# Issue #53 — Frontend : migrer les écrans Auth sur le DS Graphite

**Vague :** 1 (parallèle avec #49) | **Taille :** M | **Modèle :** opus/high
**Commit :** 1900fae03dc7a5fa82934ed88b39c060d6e1030c (22 fichiers, frontend-only)

## Résumé
3 écrans Auth migrés sur DS Graphite + 4e écran créé (forgot/reset), états loading/erreur/succès complets.
- Login + Register : déjà sur tokens, ajout des états.
- Forgot + Reset : créés contre le contrat #49.
- `frontend/src/lib/schemas/auth.ts` (NOUVEAU) : schémas Zod centralisés + factories i18n `create*Schema(t)`.
- `frontend/src/components/ui/spinner.tsx` (NOUVEAU, `role="status"`).
- `src/contexts/AuthContext.tsx` (rethrow login/register), `src/services/{authService,apiClient}.ts`, `src/types/auth.ts` (re-export back-compat), i18n fr/en/es/de.

## BR touchées
- BR-AUT-001 (409 username pris → erreur inline sous champ via `setError`)
- BR-AUT-003 (`RegisterSchema` 3..20 / email / ≥6 — corrige A12)
- BR-AUT-005 (forgot → message neutre quel que soit le retour)

## États & décisions
- Loading : bouton `disabled` + `aria-busy` + Spinner. Erreur serveur inline 401/409/400 (zéro page blanche). Succès Register (redirect) / Reset (message + lien).
- **Décision clé** : `apiClient` exclut les endpoints auth du handler 401 global (toast + redirect `/login`), sinon boucle visuelle sur Login. `AuthContext` relance l'erreur (après log assaini #132) pour mapping inline.

## Tests
11 RTL passés (login 401+spinner ; register 409+succès+zod ; forgot neutre BR-AUT-005 ; reset 200/400/token-absent), **zéro stderr** (MEMO-007). tsc + eslint clean.
⚠ **2 suites pré-existantes rouges, NON liées à #53** : `useCurrentUser` / `useProductsWithEvents` échouent car `@tanstack/react-query` (#48) absent de `sprint/8`. À surveiller au gate test-runner (Phase 6).

## data-testid posés (pour E2E V3)
- `login-form/username/password/submit/error`
- `register-form/email/name/username/password/confirm-password/submit/error/success`
- `forgot-form/email/submit/error/neutral`
- `reset-form/password/confirm-password/submit/error/success/go-login/missing-token`

## [MEMORY:*] signaux (à consolider en Phase 2 /sprint end)
- **[MEMORY:pitfall]** `React.use(params)` (Next async params) incassable en vitest (React 18.3.1 n'expose pas `use`). Solution : `vi.mock('react', ...{use: () => ({locale:'fr'})})` + mocker `useLocale` de next-intl (utilisé par `LanguageSelector`). Tout test de page App Router avec params async doit stubber `use`.
- **[MEMORY:pattern]** Erreurs serveur auth inline impossibles si l'intercepteur axios 401 global redirige. Solution : liste blanche d'endpoints auth exclus du handler global → les forms gèrent l'erreur localement. Anti-pattern : laisser le 401 global manger les erreurs de formulaire.
- **[MEMORY:decision]** Schémas Zod centralisés en factories i18n (`create*Schema(t)`) car messages traduits (next-intl) ; versions « brutes » sans message conservées pour la couche service (`authService.login` → `LoginSchema.parse`).
- **[MEMORY:pitfall]** Worktree partagé avec session #49 : `git -C <main-repo>` ≠ worktree. Toujours `cd` dans le worktree + stager UNIQUEMENT ses fichiers. Glob `[locale]` cassé par zsh → stager le dossier parent.

## Recommandations suite
- **RECOMMAND_FOLLOWUP** : E2E Playwright flux reset complet (email → lien tokenisé → nouveau mot de passe → login) — V3, lead. [triage M | domaine auth]
- **RECOMMAND_FOLLOWUP** : valider le rendu visuel réel clair/sombre des 4 écrans en navigateur (tokens DS gèrent le dark via `.dark` runtime, pas de `dark:` — non vérifié en navigateur). [triage S | domaine auth]
- **RECOMMAND_FOLLOWUP** : merge #48 (`@tanstack/react-query`) sur sprint/8 débloquera les 2 suites de hooks pré-cassées. [triage XS | domaine auth]

STATUS: COMPLETED
