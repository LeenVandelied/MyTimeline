# Issue #163 — DONE

**Titre :** [FEATURE] E2E Playwright golden-path + job CI
**Vague :** V3 | **Taille :** M | **Modèle :** opus-high
**Commits :** 952533a, 07ab0d3 (proxy/userId/JWT), b7d0d02 (fix event couplé ProductDrawer)
**Note recovery :** subagent crashé 2× (API Error: Overloaded). Travail partiel finalisé par le lead ; le subagent d'origine a ensuite repris et complété (fix ProductDrawer + run E2E local 5/5 vert).

## Résumé
Golden path E2E full-stack : inscription → connexion → produit + événement (single) → vérif timeline. Plus job CI `e2e` qui lève la stack complète.

## Fichiers
- `frontend/e2e/golden-path.spec.ts` (NEW, 1 test, data-testid uniquement)
- `.github/workflows/ci.yml` (nouveau job `e2e` ; jobs backend/frontend inchangés)
- testids ajoutés (runtime) :
  - dashboard : `dashboard`, `dashboard-products-count`
  - produits : `add-product-button`, `product-drawer-form`, `product-name-input`, `product-category-trigger`, `product-category-option-${id}`, `product-first-event-date`, `product-submit`
  - timeline : `timeline-calendar`, `timeline-resource-row`, `timeline-resource-title`, `timeline-event`
  - auth : réutilise ceux de S8 #53 (register-*/login-*)

## Design job CI `e2e`
- Postgres 16 en service container (DB `eventmanager`, user `eventuser`, healthcheck pg_isready).
- Backend : `mvnw -DskipTests package` puis `java -jar` en fond, profil `dev`, port 8080, env DB_* + JWT_SECRET explicites. Flyway rejoue V1..Vn.
- Readiness poll sur `GET /api/auth/me` (401 = up) avant Playwright, timeout ~90s.
- Frontend lancé par le `webServer` Playwright (`npm run dev`), `NEXT_PUBLIC_API_URL=http://localhost:8080/api` au runtime.
- `npx playwright install --with-deps chromium`. Upload report + backend.log en cas d'échec.
- Ne modifie pas les jobs existants, n'active pas la branch protection.

## Workaround catégorie (documenté dans le spec)
Aucune catégorie seedée par Flyway + pas d'UI de création de catégorie → un user neuf a 0 catégorie et ne peut pas créer de produit via l'UI seule. Le spec seed 1 catégorie via `page.request.post('/api/categories')` (cookie JWT du login UI partagé) — setup de test, hors parcours UI.

## Vérifications (lead)
- `tsc --noEmit` : OK
- `npm run lint` : OK (après revert d'un churn auto-généré `next-env.d.ts`)
- `next build` : OK (warning bénin workspace-root multi-lockfiles)
- `playwright test --list` : 1 test collecté OK
- ✅ **Run E2E complet exécuté en local : 5/5 verts** (stack complète : Postgres Docker isolé :55432 + backend jar profil dev + next dev proxy) — validé par le subagent d'origine après reprise. Nécessitait le fix `b7d0d02` (sans lui, l'event couplé n'était jamais envoyé → assertion `timeline-event` KO). Le job CI `e2e` reste le gate canonique sur la PR.

## [MEMORY:*] signaux
- [MEMORY:pattern] E2E full-stack en CI GitHub Actions : Postgres service container + backend jar en fond (profil dev, DB_*/JWT_SECRET explicites) + readiness poll sur endpoint 401 + frontend via webServer Playwright. NEXT_PUBLIC_* lu au runtime en `next dev`.
- [MEMORY:pitfall] `next dev`/`next build` réécrit `next-env.d.ts` (ajout `/// <reference path="./.next/types/routes.d.ts" />`) → casse `npm run lint` (@typescript-eslint/triple-slash-reference). Revert le fichier avant commit.
- [MEMORY:pitfall] E2E full-stack cross-port (:3000→:8080) : cookie JWT `SameSite=Lax` PAS envoyé sur POST/PATCH/DELETE cross-site XHR (GET passe) → 401 sur création. Fix : proxy Next `rewrites` same-origin gaté par `E2E_API_PROXY_TARGET`.
- [MEMORY:pitfall] CI backend E2E : `JwtService` fait `Decoders.BASE64.decode(secret)` → `JWT_SECRET` DOIT être Base64 valide ≥32 octets, sinon `generateToken` lève → login 500. Secret CI = chaîne Base64 (pas de `-`/`_`).
- [MEMORY:bug] `ProductCreationRequest.userId` `@NotNull` + `@Valid` sur le `@RequestBody` (ProductController:50) validé AVANT `request.setUserId(path)` (ligne 68) → body POST /products sans `userId` = 400. Le front DOIT inclure `userId` dans le body (backend le réécrit depuis le path = pas d'élévation). **Vérifié contre le code (finding review "dead code" = FAUX positif).**
- [MEMORY:bug] `ProductDrawer` event couplé cassé : `zodResolver(schema.pick({name,category}))` STRIPPE `firstEventDate` de `values` passé à onSubmit → event jamais envoyé (produit créé sans event, silencieux). Fix : `form.getValues('firstEventDate')` (état RHF brut). Anti-pattern : lire dans onSubmit un champ absent du schéma resolver.

## Recommandations suite
- RECOMMAND_FOLLOWUP: pas d'UI de création de catégorie — un user neuf ne peut pas créer de produit sans seed API. Envisager une catégorie système seedée par Flyway OU une UI de création de catégorie. [triage M | domaine categories]
- RECOMMAND_FOLLOWUP: backend `ProductServiceImpl.createProduct` NPE potentielle si `getEvents()==null` (BR-PRO-005 non gardé) → 500 sur create produit SANS event. Null-guard à ajouter côté backend. [triage S | domaine products]
- RECOMMAND_FOLLOWUP: quirk UX register → `/auth/me` 401 → redirect interceptor vers login (course visible). Sans impact E2E. [triage S | domaine auth]
- RECOMMAND_FOLLOWUP (review front-reviewer): `EventContent.tsx` `if (data.color)` skip l'update sur color vide (pré-existant) ; `next.config.mjs` `E2E_API_PROXY_TARGET` sans validation format URL (acceptable, var CI interne). [triage XS | domaine events]
- RECOMMAND_FOLLOWUP: surveiller le 1er run du job `e2e` sur la PR (canonique ; local déjà 5/5 vert). [triage S | domaine transversal]

STATUS: COMPLETED
