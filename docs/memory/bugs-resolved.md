# Bugs résolus — MyTimeline

> Bugs notables corrigés, avec cause racine + fix. 4 lignes max par entrée.

## BUG-S4-001 — `/auth/refresh` : oracle d'énumération de compte (404 vs 401)
`refreshToken` renvoyait `404 "User not found"` quand le username d'un token signé valide n'existait pas en base, distinct du `401` token invalide → un attaquant énumère les comptes via tokens forgés (OWASP API3 / WSTG-IDNT-04). Fix : 401 avec body générique byte-identique au cas token expiré/invalide (`{"error":"token expiré ou invalide"}`), aucune ré-émission. (Sprint 4, review PR #113, commit 36772b4) — ⚠️ le même oracle subsiste sur `/me` (hors scope S4).

## BUG-S13-001 — `/api/auth/me` acceptait un token révoqué/déconnecté (révocation contournable)
`JwtFilter` bypasse `/api/auth/**` (BR-AUT-011) ; `AuthController.getUserDetails` validait signature+expiration mais PAS `isSessionActive(jti)` → un token révoqué (logout, DELETE session) lisait encore `/me` (200). Comme le frontend `AuthContext` déduit l'état d'auth de `/me`, la révocation de #73 était vidée de sa substance. Fix : `extractJti` + `isSessionActive` après `validateToken`, avant `ok()` → 401 si révoqué (commit fd91d9f). Clôt le « oracle subsiste sur /me » noté dans [[BUG-S4-001]]. (Sprint 13, review PR #176)

## BUG-S15-001 — POST /users/{id}/products sans `userId` au body → 400
`ProductCreationRequest.userId` est `@NotNull` et le `@RequestBody` a `@Valid` (`ProductController:50`) → la Bean Validation s'exécute AVANT `request.setUserId(path)` (ligne 68). Un body sans `userId` échoue en 400. Le front DOIT inclure `userId` dans le body (`productService.createProduct`) ; le backend le réécrit depuis le path (pas d'élévation de privilège). Vérifié contre le code (un finding review "dead code" était un FAUX positif). (Sprint 15 #163)

## BUG-S15-002 — `ProductDrawer` : événement couplé jamais envoyé (zodResolver strippe le champ)
`onSubmit` lisait `values.firstEventDate`, mais `zodResolver(schema.pick({name,category}))` STRIPPE les clés hors schéma des `values` passées à onSubmit → l'événement couplé n'était jamais envoyé (produit créé sans event, silencieux). Fix : `form.getValues('firstEventDate')` (état RHF brut, non filtré). Anti-pattern : lire dans onSubmit un champ absent du schéma resolver. (Sprint 15 #163)

## BUG-S16-001 — Bump Next 15.2→15.5 (#161) casse le preset Storybook Vite
Le bump `next` 15.2.4→15.5.20 (caret, fix CVE #161) supprime `next/dist/build/webpack/plugins/define-env-plugin.js`, requis par `vite-plugin-storybook-nextjs@1.1.5` (transitif de `@storybook/experimental-nextjs-vite@8.6`) → `build-storybook` échoue en `CriticalPresetLoadError` AVANT le parsing des stories. Résolu par migration Storybook 8.6→10 (cf. [[DEC-S16-001]]). Règle : après tout bump `next`, relancer `build-storybook` — vitest ne couvre pas le preset SB. (Sprint 16 #46)

## BUG-S22-001 — `next build` lint casse sur `nameConflict` useState non lu (CategoryDrawer)
`CategoryDrawer.tsx` (#62) : `nameConflict` géré par `useState` mais jamais LU dans le JSX (le 409 est surfacé via `form.setError('name')`) → `@typescript-eslint/no-unused-vars` → `next build` rouge. Invisible tsc/vitest. Fix (#68, commit `e6bd60f`) : consommer la valeur en `aria-invalid={nameConflict}` sur le champ nom (lint OK + a11y correcte, zéro changement comportement). (Sprint 22 #62→#68)

## BUG-S22-002 — Suppression catégorie liée depuis `CategoryDrawer` : impasse 409 (réassignation absente)
`CategoryDrawer` instanciait `DeleteConfirmDialog variant="category"` SANS `linkedProductsCount` → défaut 0 → `needsReassign=false` → aucun `<Select>` de réassignation → supprimer une catégorie AVEC produits liés depuis le drawer heurtait `CategoryInUseException` (409) sans cible possible (backend exige `reassignToCategoryId`). `CategoriesView` le faisait bien. Détecté par `/review-pr` (raté au batch `/sprint start`). Fix (commit `116f419`) : threader `linkedProductsCount` `CategoriesView → CategoryDrawer → DeleteConfirmDialog` + test régression. (Sprint 22 #62, review PR#217)

## BUG-S27-001 — `SessionController` self-DoS : `revokeOtherSessions` via Bearer révoque TOUTES les sessions (jti cookie-only)
Après l'unification de l'identité en S27 #93 (`CallerResolver` accepte cookie OU Bearer), `SessionController` extrayait encore le `jti` COURANT du cookie SEUL. Client Bearer-only → `currentJti=null` → `SessionServiceImpl.revokeOtherSessions(userId, null)` → `revokeAllByUserIdExcept(userId, null)`, code path IDENTIQUE à `revokeAllSessions` → révoque toutes les sessions du user, y compris celle de l'appel (self-DoS ; `GET /api/sessions` : aucune session marquée « courante »). Détecté par `/review-pr 238` (security-expert indépendant), raté par la review intra-sprint. Fix (commit `e2580d1`) : helper `resolveToken(cookie, authHeader)` répliquant `JwtFilter` (cookie prioritaire, sinon `Bearer` substring(7)) sur `getActiveSessions` + `revokeOtherSessions` + garde `AnonymousAuthenticationToken` sur `CallerResolver` + 4 tests. Règle générale : [[PIT-S27-001]]. (Sprint 27 #93, review PR#238)
