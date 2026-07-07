# Issue #76 — Bus d'état réseau + bannière offline/timeout/erreur serveur

commits: [979c6d7]

## resume
Objectif : détecter perte réseau / timeout / 5xx et l'exposer via une bannière système DS + désactiver les submits offline.

Fichiers créés :
- `frontend/src/services/networkStatus.ts` — store observable framework-agnostique (timeout/server-error), alimenté par axios, consommé par React via `useSyncExternalStore`.
- `frontend/src/contexts/NetworkStatusContext.tsx` — bus React : agrège `navigator.onLine` (+ events online/offline) et le store ; expose `{isOnline,isTimeout,isServerError,isRetrying,retry}`. `retry()` = `queryClient.refetchQueries()`. Default context fail-open (pas de throw hors provider).
- `frontend/src/components/shared/OfflineBanner.tsx` — bannière DS `.mt-sysbanner`, 4 états (priorité offline>retrying>timeout>server-error), role=status (offline/retrying) / role=alert (timeout/server-error), bouton Réessayer sur timeout/server-error uniquement.
- `frontend/public/locales/{fr,en,es,de}/network.json` — namespace i18n `network` (auto-chargé par i18n.ts).
- Tests : `OfflineBanner.test.tsx` (8), + 2 tests classification dans `apiClient.test.ts`.

Fichiers modifiés :
- `frontend/src/services/apiClient.ts` — timeout global 15s ; **exemption multipart (upload avatar #215) : timeout=0** (intercepteur requête, `config.data instanceof FormData`) ; classification erreurs (ECONNABORTED→timeout, status>=500→server-error) ; `clear()` sur réponse OK.
- `frontend/app/layout.tsx` — `NetworkStatusProvider` sous `QueryProvider` + `<OfflineBanner/>` en tête (global tous écrans).
- `frontend/src/components/EventEditForm.tsx` — submit + delete `disabled` si `!isOnline` (+ title hint).
- `frontend/src/styles/ds/tokens/spacing.css` — token `--z-netbanner: 80` (> `--z-modal` 70).
- `frontend/src/styles/ds/components/i18n.css` — `.mt-sysbanner--sticky` z-index 60→`var(--z-netbanner)` (bug DS : 60 passait SOUS les sheets).
- `frontend/src/styles/globals.css` — import `ds/components/i18n.css` (classes opt-in, zéro effet de bord).

Approche timeout/onLine : navigator.onLine + events pour offline pur ; axios interceptor pour timeout/5xx ; uploads multipart exemptés du timeout pour ne pas casser #215.

Tests : 383/383 frontend verts, 0 stderr. tsc OK, eslint OK sur fichiers #76.

## [MEMORY:*] signaux
- [MEMORY:pattern] Problem: bus d'état réseau reliant axios (module) à React sans coupler. Solution: store observable `subscribe/getSnapshot` + `useSyncExternalStore` côté contexte ; retry via `queryClient.refetchQueries()`. Anti-pattern: écrire l'état réseau dans un contexte depuis l'intercepteur axios (impossible hors React).
- [MEMORY:pitfall] Context: timeout axios global. Solution: exempter les requêtes multipart (`config.data instanceof FormData` → timeout=0) sinon uploads longs (#215) requalifiés en timeout. Prevention: tout timeout global doit exclure les uploads.
- [MEMORY:decision] Context: z-index bannière réseau. Decision: nouveau token `--z-netbanner:80` > `--z-modal:70` ; le `.mt-sysbanner--sticky` du DS était à 60 (sous les sheets) — corrigé. Why: contrat DS « au-dessus des sheets ».
- [MEMORY:pitfall] Context: warnings act() en test avec state réseau. Solution: reset store/navigator en `beforeEach` uniquement (composant démonté), résoudre le refetch mocké explicitement dans `act(async)`.

## recommandations suite
- RECOMMAND_FOLLOWUP: E2E offline réel (mode avion Playwright) non couvert — `frontend/e2e/` toujours vide. Unit RTL couvre les 4 états + retour online.
- Câblage submit limité à `EventEditForm` (formulaire événement, écran principal cible). Autres formulaires (auth) hors scope #76.
- Pas de RECOMMAND_TEST_RUNNER (383 tests, 14s < 3min).
- Note intégration : le worktree partagé contient aussi les fichiers non commités de #57 (StateScreen/EmptyState/errors.json/ProductList.tsx) — NON inclus dans mon commit. Le build `next build` échoue actuellement sur un lint de `StateScreen.test.tsx` (périmètre #57), indépendant de #76.

## data-testid ajoutés
- `network-banner` (div bannière, porte `data-state`)
- `network-banner-retry` (bouton Réessayer, timeout/server-error uniquement)

STATUS: COMPLETED
