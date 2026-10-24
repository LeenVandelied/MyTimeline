# Issue #653 — volet FRONTEND (Sprint 111, vague 2)

fichiers de contexte lus: briefing (pack cp-frontend inline), .ai-env/context-packs/cp-frontend.md (84 l., lu en entier), .ai-env/context-packs/br-auth.md (BR-AUT-008, BR-AUT-013), .ai-env/context-packs/pit-frontend.md (grep next-themes/theme/AuthContext/storageState seulement), docs/adr/ADR-010-preference-de-theme-du-compte.md, docs/memory/sprints/sprint-111/issue-655-done.md, frontend/src/hooks/useThemeChoice.ts(+test), src/contexts/AuthContext.tsx(+test), src/services/{authService,userService,apiClient,inlineErrorHandling}.ts, src/types/{user,auth,settings}.ts, src/components/theme-provider.tsx, app/[locale]/layout.tsx, app/[locale]/{login,register}/page.tsx, backend AuthController (register ne pose pas de cookie), node_modules/next-themes/dist/index.mjs (storageKey `theme`, contexte par défaut sans throw), e2e/support/{accounts,auth}.ts, e2e/auth.setup.ts (provision), e2e/sprint-111-theme-toggle-unified.spec.ts, e2e/settings-preferences.spec.ts, e2e/sprint-99-touch-targets.spec.ts (bloc préférences), src/__tests__/e2e-rate-limit-budget.test.ts, backend/src/main/resources/application-e2e.properties, playwright.config.ts

## Résumé

Flux d'arbitrage (connexion explicite seulement, `AuthContext.login`) :
1. `loginService` → `loadUser(applyAccountThemeAtLogin)` : `/api/auth/me` lu ; si `themePreference !== null`, `setTheme(pref)` est appelé AVANT la publication du user (même tour, rendu groupé) → l'écran de login, qui navigue dès que `user` existe, ne peint jamais le thème local avant celui du compte. Aucun PUT.
2. Après publication : `adoptLocalThemeAtLogin` — compte `null` + clé `localStorage['theme']` présente et valide → `PUT /api/me/preferences` avec ce choix (attendu dans `login`, ne lève pas) ; compte `null` sans choix local → rien.
3. Montage (`GET /api/auth/me` sur cookie) : AUCUN arbitrage.
4. Ensuite : `useThemeChoice.setThemeChoice` = `setTheme(choice)` puis persisteur injecté (`ThemePersistenceContext`, fourni par `AuthProvider`) → PUT si authentifié et valeur ≠ valeur attendue du compte. Échec : `console.error('Theme preference save failed', safeErrorMessage)`, thème local conservé, pas de toast propre (l'intercepteur global `apiClient` peut toaster un 500/400 comme pour toute route — non bloquant, 401 = redirection login normale).
5. Logout : thème local non touché.

Choix :
- Persistance par CONTEXTE injecté plutôt que `useAuth()` dans `useThemeChoice` : les bascules sont rendues hors `AuthProvider` en tests unitaires (theme-toggle, AppShell, dashboard-mobile…) où `useAuth` lève ; défaut `null` = local seul. Aucun wrapper de test existant à modifier.
- Application sans réécriture via `useApplyAccountTheme` exportée du même module (le garde-fou « seul écrivain » de #655 reste vert : seul `useThemeChoice.ts` appelle `setTheme`).
- `accountThemeRef` (valeur confirmée OU en vol) + numéro de séquence : l'aller-retour rapide (sombre en vol → retour à la valeur confirmée) n'est pas sauté, et une réponse périmée n'écrase pas la valeur connue ; réponse ignorée si la session a changé (id).
- `storageKey` imposé et retiré des props de `ThemeProvider` (`THEME_STORAGE_KEY = 'theme'`, identique à l'actuel).
- Valeur de contexte d'`AuthProvider` mémoïsée (`useMemo`) : le fournisseur s'abonne désormais au contexte next-themes, sans mémo chaque bascule re-rendrait tous les `useAuth()`.

Fichiers : `frontend/src/contexts/AuthContext.tsx`, `src/hooks/useThemeChoice.ts`, `src/components/theme-provider.tsx`, `src/types/{user,auth,settings}.ts`, `src/services/userService.ts`, `src/components/settings/PreferencesSection.tsx` (commentaire) ; e2e : `e2e/sprint-111-theme-account-preference.spec.ts` (nouveau), `e2e/support/theme-preference.ts` (nouveau), `e2e/sprint-111-theme-toggle-unified.spec.ts`, `e2e/settings-preferences.spec.ts`, `e2e/support/accounts.ts` (commentaire budget) ; `src/__tests__/e2e-rate-limit-budget.test.ts` (ancrages) ; `backend/src/main/resources/application-e2e.properties` (commentaires BUDGET seulement) ; docs : ADR-010 § 6 + Conséquences, BR-AUT-013, cp-frontend.

Écarts au briefing :
- **`backend/**` touché** : `application-e2e.properties`, COMMENTAIRES seulement (lignes `BUDGET register 13/23`, `BUDGET login 14/26` + paragraphes explicatifs), aucun plafond modifié. Obligatoire : `e2e-rate-limit-budget.test.ts` recompte les émissions depuis les specs et rougit si ces lignes mentent. Isolé dans le commit e2e `a9f1695f`.
- **Register n'arbitre pas** : `POST /auth/register` ne pose aucun cookie et l'écran renvoie vers /login → un PUT y serait 401. L'arbitrage a lieu au login qui suit (documenté ADR/BR).
- **E2E : 1 test, 1 compte neuf, 2 connexions** au lieu de 3 scénarios (a/b/c). Le budget `login` au pire cas CI passe de 20 à 26 pour un plafond de 30 ; 3 connexions (29) ou 4 (32, > plafond) étaient hors budget. Les critères (b) et (c) sont tenus par le 2e appareil, qui porte un choix local EXPLICITE contraire au compte (compte `dark` posé par l'arbitrage du (a), pas par un PUT `light` via `request`). L'appareil « vierge » emprunte la même branche de code ; branches couvertes une à une en unitaire.
- **Spec #655 : ni compte dédié ni restauration** (restauration à `null` impossible par l'API, compte dédié = budget register/login) → le PUT est répondu DANS LE NAVIGATEUR par `keepThemeOffSharedAccount` (UserResponse réel relu par `GET /api/auth/me` + valeur demandée) ; la spec vérifie en plus que chaque bascule émet bien le PUT (`['dark','light']`). Même traitement pour `settings-preferences.spec.ts` (seul autre écrivain du thème sous `SHARED`).

## Commits

- `6fbaa74a` ✨ feat(theme): préférence de thème du compte arbitrée à la connexion (#653) — 14 fichiers frontend (src)
- `a9f1695f` ✅ test(e2e): préférence de thème du compte sur compte neuf, compte partagé préservé (#653) — 7 fichiers (dont `backend/src/main/resources/application-e2e.properties`, commentaires)
- `1166cdf6` 📝 docs(auth): arbitrage du thème à la connexion explicite seulement, volet front (#653) — ADR-010, br-auth.md, cp-frontend.md
(`git show --stat` vérifié pour chacun : uniquement mes fichiers. Note : `97d4d8a2` — fix backend V16 — est apparu sur la branche entre le démarrage et mes commits, pas de moi.)

## Tests

- Ciblés : `AuthContext.theme.test.tsx` 14/14 (nouveau), `useThemeChoice.test.tsx` 17/17 (+6), `types/user.test.ts` 11/11 (+8), `AuthContext.test.tsx` 6/6, `userService.test.ts` 3/3, `useCurrentUser.test.tsx` 2/2, `e2e-rate-limit-budget.test.ts` 37/37.
- Armement (mutations temporaires, restaurées, `cmp` vérifié) : comparer à `user.themePreference` au lieu de la valeur en vol → 1 rouge (aller-retour) ; retirer le contrôle de séquence → 1 rouge ; arbitrer au montage → 5 rouges.
- Suite vitest complète : 171 fichiers, 2267 tests, 0 échec. Lignes stderr seulement dans DeleteConfirmDialog(.intl), AccountSection, exportService (déjà signalées par #655, hors surface).
- `npx tsc --noEmit` : 0 erreur (specs e2e comprises). `npm run lint` : 0. `npx eslint` e2e touchés : 0. `rtk proxy npx prettier --check` sur les 20 fichiers : conformes.
- NON exécutés (interdits) : Playwright, `next build`.

## Specs E2E à jouer par le lead

Créée :
- `frontend/e2e/sprint-111-theme-account-preference.spec.ts` (compte neuf `th…`, 1 register + 2 logins, 2 contextes)

Modifiées :
- `frontend/e2e/sprint-111-theme-toggle-unified.spec.ts` (PUT intercepté + assertion `['dark','light']`)
- `frontend/e2e/settings-preferences.spec.ts` (idem, test thème)

Impactées (code touché : AuthContext / useThemeChoice / ThemeProvider / UserSchema) — à jouer :
- `auth.setup.ts` (login de provision passe par l'arbitrage : compte `null`, contexte vierge → aucune écriture attendue)
- `golden-path.spec.ts`, `forgot-password.spec.ts`, `reset-password-failures.spec.ts` (connexions par formulaire, comptes neufs → arbitrage sans choix local : aucun PUT)
- `landing-auth-theme-toggle.spec.ts` (bascules anonymes : aucun PUT)
- `sprint-73-tablet-sidebar.spec.ts`, `sprint-77-theme-visual.spec.ts`, `sprint-99-touch-targets.spec.ts`, `settings-navigation.spec.ts`, `sprint-96-auth-banner-overlap.spec.ts` (surfaces de bascule)
- `auth-signature.spec.ts` (passe 2 CI, relit `shared.json`)
- `settings-profile.spec.ts`, `sprint-99-touch-targets.spec.ts` (mocks `/api/auth/me` qui étendent la VRAIE réponse → `themePreference` présent) ; `sprint-96-auth-banner-overlap.spec.ts` (mock 500, pas de parse)

Inventaire SHARED (`/usr/bin/grep -ln SHARED e2e/*.ts`) : auth-guard, auth-signature, settings-account, settings-breakpoints, settings-mobile, settings-navigation, settings-preferences, settings-profile, settings-security, sprint-111-theme-toggle-unified, sprint-63-de-overflow-audit, sprint-66-mobile-keyboard, sprint-73-tablet-sidebar, sprint-99-touch-targets.
- Connexion par formulaire avec `SHARED` : **seul `auth.setup.ts`** (les 14 autres restaurent la session par storageState → aucun arbitrage, décision S111). Les connexions par formulaire hors setup (golden-path, forgot-password, reset-password-failures) utilisent des comptes neufs.
- Écrivains du thème sous `SHARED` : `sprint-111-theme-toggle-unified` (bascules shell/tiroir) et `settings-preferences` (`pref-theme-option-dark/light`) → désormais interceptés. `sprint-99-touch-targets` ouvre le Select `pref-theme` sans choisir (Escape) ; `settings-navigation` ne fait que le voir.
- Risque résiduel sans interception : passe 2 CI (`auth.setup.ts` rejoué contre le même backend) → la préférence de `SHARED` serait appliquée au login de provision et écrite dans `shared.json` (le storageState porte `localStorage`). Seul `auth-signature.spec.ts` le lirait (thème indifférent).
- Specs qui vérifient le thème / captures sous `SHARED` : sprint-73-tablet-sidebar, sprint-99-touch-targets, sprint-111-theme-toggle-unified, settings-preferences — toutes par storageState → non affectées par la préférence du compte.

## Signaux mémoire

- [MEMORY:decision] Context: #653 front, où arbitrer la préférence de thème du compte. Decision: à la connexion explicite (`AuthContext.login`) seulement, jamais à la restauration de session ; préférence du compte appliquée AVANT publication du user (pas de flash, l'écran de login navigue sur `user`) ; compte `null` sans choix local → aucune écriture ; `register` n'arbitre pas (pas de session). Why: lecture littérale d'ADR-010 temps 2 ; ~20 specs E2E fixent le thème par localStorage sous la session SHARED — un arbitrage au montage les rendrait dépendantes de l'ordre ; envoyer `system` à défaut fabriquerait un choix jamais exprimé. Conséquence assumée : un appareil connecté ne suit un changement fait ailleurs qu'à la reconnexion.
- [MEMORY:decision] Context: brancher la persistance serveur dans `useThemeChoice` sans coupler le hook à `useAuth` (qui lève hors provider). Decision: `ThemePersistenceContext` (défaut `null` = local seul) fourni par `AuthProvider` ; `useApplyAccountTheme` réservé à `AuthProvider` pour appliquer sans réécrire. Why: aucun wrapper de test à adapter, garde-fou « seul écrivain » (#655) conservé.
- [MEMORY:pattern] Problem: dédupliquer un PUT idempotent sur la valeur serveur CONFIRMÉE saute l'aller-retour rapide (A en vol, retour à B confirmé → sauté, serveur finit sur A). Solution: comparer à la valeur attendue (confirmée OU dernière en vol), + numéro de séquence pour ignorer les réponses périmées, + remise à la valeur confirmée sur échec du dernier PUT. Anti-pattern: `if (user.pref === choice) return`.
- [MEMORY:pitfall] Context: une spec E2E qui ajoute une connexion par formulaire ou un register. Solution: `src/__tests__/e2e-rate-limit-budget.test.ts` la recompte et exige la mise à jour des lignes `BUDGET` de `backend/src/main/resources/application-e2e.properties` (+ ancrages `perFile`). Prevention: un briefing « frontend only / ne pas toucher backend/** » qui demande une spec E2E avec comptes neufs impose EN FAIT une retouche de ce fichier backend ; login au pire cas CI = 26/30 après #653 : 2 connexions de plus dépassent le plafond.
- [MEMORY:pitfall] Context: specs qui basculent le thème sous le compte SHARED depuis #653. Solution: `keepThemeOffSharedAccount(page)` (`e2e/support/theme-preference.ts`) répond au PUT dans le navigateur. Prevention: une préférence posée ne revient jamais à `null` par l'API ; la passe 2 CI rejoue `auth.setup.ts` et écrirait la préférence dans `shared.json` (storageState = cookies + localStorage).

## Recommandations suite

- RECOMMAND_FOLLOWUP: le budget `login` E2E est à 26/30 au pire cas CI après #653 ; toute nouvelle spec avec connexion par formulaire le dépasse — décider d'un plafond e2e relevé (propriété + `RateLimitE2eProfileIntegrationTest`) ou d'un helper de login par storageState dédié [triage S | backend+e2e]
- RECOMMAND_FOLLOWUP: l'intercepteur global `apiClient` toaste un 500 sur `PUT /api/me/preferences` (bascule de thème) — acceptable (non bloquant) mais bruyant pour une préférence d'affichage ; envisager un opt-out par requête (`inlineHandledStatuses`, aujourd'hui typé 403 seul) [triage XS | frontend]

STATUS: COMPLETED
