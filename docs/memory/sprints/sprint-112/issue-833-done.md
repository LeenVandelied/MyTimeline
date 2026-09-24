# Issue #833 — Pas de toast d'erreur global sur l'échec de PUT /api/me/preferences

## Commits
- `1b604fa5` :sparkles: feat(theme): plus de toast global sur l'échec de PUT /me/preferences (#833) — auteur/message vérifiés (`git log --format='%h %an %s' -3`) ; le commit voisin `00da5ecf` est celui de #768.

## Résumé
- Objectif : faire taire le toast global « erreur serveur » de l'intercepteur (`apiClient.ts`) quand `PUT /me/preferences` échoue, puisque `persistThemeChoice` absorbe déjà l'échec (thème local conservé, log assaini).
- MESURE préalable (lecture de l'intercepteur, `frontend/src/services/apiClient.ts`) : l'intercepteur ne toaste QUE sur 400, 401, 403 et 500 (égalité stricte). **Aucune branche 409 → un 409 ne toaste pas, avec ou sans option** (figé par test : témoin 409 sans opt-out = 0 toast). Idem 502/503/504 et 429 : pas de toast.
- Décision : le type `InlineHandledStatus` passe de `403` à `403 | 500`, PAS `409`. Motif : le contrat écrit dans `inlineErrorHandling.ts` exige que chaque statut du type soit lu dans sa branche de l'intercepteur ; un 409 n'y serait lu nulle part. Le critère « aucun toast sur 409 » est tenu par l'absence de branche, et verrouillé par un test sur la chaîne réelle (si une branche 409 toastante apparaît, il rougit).
- Fichiers : `frontend/src/services/inlineErrorHandling.ts` (type + constante gelée `HANDLES_SERVER_ERROR_INLINE` = `[500]`), `frontend/src/services/apiClient.ts` (branche 500 : `if (!handlesStatusInline(error.config, 500))`), `frontend/src/services/userService.ts` (`updatePreferences(payload, options?)`, option fournie par l'appelant, jamais posée dans le service), `frontend/src/contexts/AuthContext.tsx` (`persistThemeChoice` passe l'option ; seul appelant).
- Le bus réseau (#76, `networkStatusStore.reportServerError`) reste alimenté sur un 500 opt-out : la bannière `OfflineBanner` « erreur serveur » peut toujours apparaître (hors périmètre « toast », voir follow-up).
- Mutation d'armement : option retirée de `AuthContext.tsx` → le test 500 de la chaîne réelle rougit (1 toast « Erreur serveur. Veuillez réessayer plus tard ») ; restauré ensuite (3 passés / 1 échoué sous mutation).
- fichiers de contexte lus: `docs/memory/sprints/sprint-112/briefing-833.md`, `frontend/src/services/inlineErrorHandling.ts`, `frontend/src/services/inlineErrorHandling.test.ts`, `frontend/src/services/apiClient.ts`, `frontend/src/services/apiClient.test.ts`, `frontend/src/services/userService.ts`, `frontend/src/services/userService.test.ts`, `frontend/src/services/networkStatus.ts`, `frontend/src/contexts/AuthContext.tsx`, `frontend/src/contexts/AuthContext.theme.test.tsx`, `frontend/src/contexts/NetworkStatusContext.tsx`, `frontend/src/components/categories/CategoryDrawer.forbidden.test.tsx`

## Tests
- `npx vitest run` ciblé (9 fichiers : nouveau `AuthContext.themeSaveToast.test.tsx`, `AuthContext.theme.test.tsx`, `AuthContext.test.tsx`, `apiClient.test.ts`, `inlineErrorHandling.test.ts`, `userService.test.ts`, `apiClient.multipart.test.ts`, `CategoryDrawer.forbidden.test.tsx`, `ProductDrawer.forbidden.test.tsx`) : 58 passés / 0 échec.
- `npx vitest run` suite complète : 2274 passés / 0 échec.
- `npx tsc --noEmit` : 0 erreur. `rtk proxy npx next lint --file …` (8 fichiers) : aucun warning/erreur (le « Errors: 1 » affiché sous RTK = bannière de dépréciation `next lint`, faux). `rtk proxy npx prettier --check` (8 fichiers) : conforme.
- Nouveaux tests : chaîne réelle (bascule → `persistThemeChoice` → `updatePreferences` → `apiClient` → intercepteur, seul `apiClient.defaults.adapter` remplacé) sur 500 et 409 : 0 toast, `setTheme('dark')` unique, préférence du compte inchangée, log « Theme preference save failed » ; témoins même route sans opt-out : 500 → 1 toast, 409 → 0 toast ; unitaires intercepteur : 500+[500] → 0 toast, 403+[500] → toast conservé ; `HANDLES_SERVER_ERROR_INLINE` gelé et sans effet sur 403.
- `AuthContext.theme.test.tsx` : 5 assertions `toHaveBeenCalledWith` mises à jour pour le 2e argument (l'option).
- NON vérifié : aucun E2E (Playwright interdit dans cette vague) ; rendu réel du toast dans un navigateur non observé ; le 500 réel du backend sur cette route non provoqué.

## Critères d'acceptation
- [x] Aucun toast d'erreur global sur 500 ou 409 de `PUT /api/me/preferences` — fait : 500 via opt-out, 409 par absence de branche (mesuré + figé) ; preuve `AuthContext.themeSaveToast.test.tsx` (it.each 500/409) + mutation d'armement rouge.
- [x] Comportement silencieux de `persistThemeChoice` inchangé — fait : seul l'appel change (2e argument) ; tests existants `AuthContext.theme.test.tsx` verts (dont « échec du PUT : thème local conservé… ») + nouveau test qui vérifie `setTheme` unique et préférence du compte non modifiée.
- [x] Test Vitest couvrant l'absence de toast sur 500 et 409 — fait : `frontend/src/contexts/AuthContext.themeSaveToast.test.tsx`.

## Signaux mémoire
- [MEMORY:decision] Context: #833 demandait d'étendre `inlineHandledStatuses` à 500 ET 409. Decision: type élargi à `403 | 500` seulement ; 409 non ajouté. Why: l'intercepteur n'a aucune branche 409 (aucun toast) et le contrat de `inlineErrorHandling.ts` veut que chaque statut du type soit lu dans sa branche ; le 409 est tenu par un test sur la chaîne réelle qui rougira si une branche 409 toastante apparaît.
- [MEMORY:pattern] Problem: un test « aucun toast » sur un statut que l'intercepteur ne toaste jamais (409) est vacant par construction. Solution: l'écrire quand même mais le libeller comme garde-fou de non-régression, avec un témoin « même statut sans opt-out = 0 toast » qui documente la mesure. Anti-pattern: présenter ce test comme preuve de l'opt-out.

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun schéma touché.
- Pas de RECOMMAND_SECURITY : aucun changement d'auth ni de log ; le 401 reste redirigé (le type exclut 401, test unitaire existant vert).
- Pas de RECOMMAND_UI_DESIGN : aucun rendu modifié, un toast en moins.
- Pas de RECOMMAND_TEST_RUNNER : couvert en Vitest sur la chaîne réelle ; aucun E2E n'assère aujourd'hui l'absence de toast sur cette route (non vérifié par grep exhaustif des specs, hors périmètre `e2e/**`).
- RECOMMAND_FOLLOWUP: un 500 de `PUT /me/preferences` alimente encore le bus réseau (#76) → la bannière `OfflineBanner` « erreur serveur » peut s'afficher pour un échec sans conséquence ; décider si l'opt-out doit aussi couvrir `reportServerError` pour cette requête [XS | frontend]
- RECOMMAND_FOLLOWUP: #831 (backend, même vague) semble ajouter une limite de débit par utilisateur sur les préférences (`PreferencesUserRateLimitIntegrationTest` non suivi vu dans le working tree) ; un 429 n'a aucune branche dans l'intercepteur (0 toast, 0 bannière), à confirmer que c'est le comportement voulu côté bascule de thème [XS | frontend]

STATUS: COMPLETED
