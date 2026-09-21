# #733 — Un 403 affiche « session expirée » et déconnecte — DONE

Commit : `:bug: fix(auth): un 403 affiche « accès refusé » sans déconnecter (#733)`

## Résumé

Arbitrage dev appliqué : un 403 affiche un toast « Accès refusé » **sans redirection**.
- `apiClient.ts`, branche 403 : plus de `window.location.href`, plus de prise du verrou `isRedirecting`. Log assaini conservé (url/method/data, jamais les headers). Branche 401 strictement inchangée.
- Commentaire de justification dans la branche : sources backend du 403 vérifiées dans le code — `ProductController` et `CategoryController` (`ResponseEntity.status(FORBIDDEN)`), `EventController` (`throw new AccessDeniedException`), `SecurityConfig.accessDeniedHandler` (règle `hasAuthority("ROLE_USER")`) ; un jeton absent ou expiré passe par `authenticationEntryPoint` → 401 ; `csrf.disable()` → pas de 403 CSRF.
- Clé renommée `errors.auth.forbiddenRedirect` → `errors.auth.forbidden` dans les 4 locales, `API_ERROR_KEYS.forbidden` et le repli FR. Libellés : « Accès refusé : vous n'avez pas l'autorisation d'effectuer cette action. » / « Access denied: you are not allowed to perform this action. » / « Acceso denegado: no tiene permiso para realizar esta acción. » / « Zugriff verweigert: Sie sind nicht berechtigt, diese Aktion auszuführen. »
- Le groupe `errors.forbidden` (title/description/backHome, utilisé par `app/[locale]/error.tsx`) n'a pas été touché. `errors.auth.forbidden` (chaîne) et `errors.forbidden` (objet) sont à des chemins différents, sans collision.
- Commentaire `e2e/sprint-95-toast-overlap.spec.ts` (l.96-99) mis à jour, commentaire seul. Relu : la spec utilise un 400 et ne dépend pas d'une redirection sur 403 (aucun `403`/`toHaveURL`/`login` dans le fichier).
- `/usr/bin/grep -rn forbiddenRedirect frontend` (hors node_modules/.next) → 0.

Appelants qui dépendaient de l'effet de bord (`/usr/bin/grep -rn 403 frontend/src frontend/app`) : **aucun**. Ceux qui traitent le 403 le font dans leur `catch` sans supposer de navigation : `ProductDrawer.tsx:232` (`setSubmitError(t('errors.forbidden'))`), `CategoryDrawer.tsx:214`, `TimelineEditHost` (erreur affichée, dialog maintenu ouvert — test l.400), `useSetEventArchived`, `useArchiveProduct`/`useUpdateProduct`/`useUpdateCategory` (rejet relayé pour affichage inline). Avant le correctif, la redirection différée de 1,5 s écrasait ces messages inline ; ils restent maintenant visibles. Les autres occurrences sont des commentaires, `state-errors.ts` (error boundary, indépendant de l'intercepteur) et des tests.

## Fichiers

- `frontend/src/services/apiClient.ts` — branche 403 réécrite + commentaire de justification ; JSDoc `loginUrlForCurrentLocale` « 401/403 » → « 401 ».
- `frontend/src/services/apiErrorMessages.ts` — clé `auth.forbidden`, repli FR, JSDoc de `API_ERROR_KEYS` réécrite (l'avertissement « libellé historique faux » n'a plus lieu d'être).
- `frontend/public/locales/{de,en,es,fr}/errors.json` — clé renommée + libellé.
- `frontend/src/services/apiClient.test.ts` — +2 tests 403.
- `frontend/src/services/apiErrorMessages.test.ts` — +1 test (libellé « accès refusé » dans les 4 locales, sans mention de session/redirection), commentaire du test « 403 ≠ 401 » actualisé.
- `frontend/src/services/ApiErrorTranslatorBridge.intl.test.tsx` — 2 références de clé.
- `frontend/e2e/sprint-95-toast-overlap.spec.ts` — commentaire uniquement.

## Tests

- Ciblé `src/services/` + `src/__tests__/i18n-namespaces.test.ts` : 8 fichiers, **60/60 verts**.
- Nouveaux tests : (1) 403 → 1 toast `/accès refusé/i`, sans `/session|connexion/i` ; `setHref` jamais appelé après 5000 ms de faux timers ; puis un 401 → 2e toast `/session a expiré/i` et `setHref('/es/login')` à 1500 ms (verrou non pris). (2) Deux 403 d'affilée → 2 toasts, 0 redirection (avant, le verrou rendait le 2e muet). (3) Libellé 403 : motif « accès refusé » et aucun motif session/expiration/connexion/redirection dans chacune des 4 locales.
- PIT-S95-006 : grep des regex de test citant l'ancien libellé → la seule, `apiClient.test.ts:66` `/session a expiré/i`, concerne le 401, elle reste valide.
- Suite complète `npx vitest run` (lue via `rtk proxy`) : **1955 passés, 1 échoué, 7 ignorés (1963) ; 2 fichiers rouges sur 153**, tous deux sans rapport avec ces changements, dus à l'environnement (voir Écarts).
- `tsc --noEmit` : 0 erreur sur les fichiers modifiés. Les seules erreurs viennent de `*.stories.tsx` et de `palette-color-picker.test.tsx`, pour la même cause d'environnement.
- Prettier (binaire direct `./node_modules/.bin/prettier --check`) : conforme après `--write` sur `apiErrorMessages.test.ts`.
- Lint `next lint --file` : **NON EXÉCUTABLE** — `Cannot find package 'eslint-plugin-storybook'` (environnement). Non vérifié.

## Écarts d'énoncé

- L'énoncé recommande de viser la page « accès refusé » (groupe `errors.forbidden`). L'arbitrage dev choisit le toast seul, sans navigation : appliqué, groupe non touché.
- Le briefing ne cite que `ProductController`/`EventController` comme sources du 403 ; `CategoryController` en émet aussi (l.113/136/146). Il est ajouté au commentaire.
- **Environnement, pré-existant** : `frontend/node_modules`, un symlink vers le repo principal, contient `vitest@2.1.9` alors que `package.json` (identique sur `dev`) exige `^3.2.7`. `eslint-plugin-storybook` est absent. D'où le rouge de `console-error-guard.test.ts` (import eslint), de `palette-color-picker.test.tsx` (`toHaveBeenCalledExactlyOnceWith`, API vitest 3), les erreurs tsc des stories, et un lint impossible. Le cp-frontend annonce aussi « Vitest ^2.1.9 », ce qui n'est plus à jour. La CI (install propre) fait foi pour ces deux fichiers.
- `frontend/next-env.d.ts` apparaît modifié dans le working tree : ce n'est pas moi (probablement le `next build` de l'autre agent). Je ne l'ai pas commité.

## Signaux mémoire

- [MEMORY:pitfall] Contexte : le `node_modules` symlinké du worktree sprint vient du repo principal, qui n'a pas été réinstallé depuis le passage à vitest 3 / storybook 10 (vitest 2.1.9 installé contre `^3.2.7` demandé). Solution : lire les échecs `toHaveBeenCalledExactlyOnceWith`, `eslint-plugin-storybook` et `@storybook/react-vite Meta` comme environnementaux, et comparer avec `node -p "require('./node_modules/vitest/package.json').version"`. Prévention : au `/sprint start`, vérifier que la version installée de vitest satisfait `package.json` avant de briefer les agents, sinon `npm ci` dans le repo principal.
- [MEMORY:decision] Contexte : #733. Décision : un 403 = toast « accès refusé » sans redirection ni verrou `isRedirecting` ; clé `errors.auth.forbidden` distincte de `errors.forbidden` (écran d'erreur). Pourquoi : le backend n'émet un 403 qu'à un utilisateur authentifié (ownership, `hasAuthority`), le CSRF est désactivé et l'expiration produit un 401.

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête touché.
- Pas de RECOMMAND_SECURITY : le 403 ne déconnecte plus mais le serveur refuse toujours l'accès ; le log assaini est inchangé (pas d'en-têtes).
- Pas de RECOMMAND_TEST_RUNNER : Vitest exécuté en direct ; aucun E2E ne dépend d'une redirection 403 (vérifié par lecture).
- Pas de RECOMMAND_UI_DESIGN : même composant toast, seul le libellé change.
- RECOMMAND_FOLLOWUP: sur un 403, `ProductDrawer`/`CategoryDrawer`/`TimelineEditHost` affichent l'erreur inline ET l'intercepteur affiche le toast « accès refusé ». C'est un double signalement, contraire à la règle « un seul signalement » posée par #713 pour le 400. Il était auparavant masqué par la redirection. Piste : liste d'opt-out 403 sur le modèle de `INLINE_VALIDATION_ENDPOINTS`. [S | frontend]
- RECOMMAND_FOLLOWUP: réinstaller `frontend/node_modules` dans le repo principal (vitest 2.1.9 installé contre `^3.2.7` demandé, `eslint-plugin-storybook` absent) ; la suite locale compte 2 fichiers rouges et le lint est impossible. [XS | tooling]

fichiers de contexte lus: docs/memory/sprints/sprint-101/briefing-A-733-735.md → « ARBITRAGE DEV #733 (tranché) » ; docs/memory/sprints/sprint-95/issue-713-done.md → l.51 « `errors.auth.forbiddenRedirect` — 403, clé DÉDIÉE » ; backend SecurityConfig.java → l.102 `csrf.disable()`, l.181 `accessDeniedHandler` ; EventController.java → l.60 `throw new AccessDeniedException("forbidden")` ; e2e/sprint-95-toast-overlap.spec.ts → l.96 « Le 400 est le »

STATUS: COMPLETED
