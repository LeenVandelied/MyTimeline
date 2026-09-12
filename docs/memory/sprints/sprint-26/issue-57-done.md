# Issue #57 — Pages d'états système (404/403/500/vide/loading) clair+sombre

commits: [959a4673070aa9420de28655a971e7b1fc03029d]

## resume
Objectif: écrans d'état custom Next.js App Router, locale-aware, clair+sombre (tokens Graphite).

Créés:
- `frontend/app/[locale]/not-found.tsx` — 404, `'use client'` (useLocale/useTranslations fiables sans params), lien retour `/${locale}/home`.
- `frontend/app/[locale]/error.tsx` — crash boundary `'use client'` props `{error,reset}`. Branche 403 (isForbiddenError) vs 500. 403=accès refusé sans retry ; 500=retry via `reset()` + retour accueil.
- `frontend/app/error.tsx` — filet global racine `'use client'`. Hors NextIntlClientProvider → messages inlinés 4 locales, locale déduite de l'URL, fallback fr.
- `frontend/app/[locale]/dashboard/loading.tsx` — Suspense fallback, LoadingSkeleton variant list.
- `frontend/src/components/shared/StateScreen.tsx` — coquille plein page pure (code/title/desc/actions), classes action exportées.
- `frontend/src/components/shared/EmptyState.tsx` — état vide pur, props (title/desc/icon/action), `role=status`, variante compact.
- `frontend/src/components/shared/LoadingSkeleton.tsx` — skeleton variants list/cards/timeline, `role=status`+`aria-busy`, label sr-only.
- `frontend/src/lib/state-errors.ts` — `isForbiddenError` (message/digest match `403|forbidden`).

Intégrations réelles:
- `ProductList.tsx` (dashboard) : `<p>` vide remplacé par `<EmptyState compact>` (testid `dashboard-product-list-empty` préservé).
- `dashboard/loading.tsx` : LoadingSkeleton en écran de chargement réel.

i18n: `errors.json` étendu (notFound/forbidden/crash) dans fr/en/es/de.

Approche locale-aware: liens retour préfixés `/${locale}/home` partout (localePrefix:'always'). not-found/error lisent locale via next-intl (dans le provider) ; global error via 1er segment URL.

Tests: 37 nouveaux (EmptyState, LoadingSkeleton, StateScreen, state-errors, not-found, error 500+403+reset, global error locale/reset). Suite frontend complète: 383 pass / 54 fichiers / 15.6s. tsc strict ✓. eslint ✓.

## [MEMORY:*] signaux
[MEMORY:pattern] Problem: écran état App Router locale-aware sans `params` (not-found.tsx n'en reçoit pas). Solution: not-found/error en `'use client'` + `useLocale()` (rendus DANS NextIntlClientProvider du [locale]/layout). Anti-pattern: getTranslations/getLocale sans locale explicite (ce repo passe toujours locale explicite → inférence non fiable).
[MEMORY:pattern] Problem: filet `app/error.tsx` global hors provider i18n. Solution: messages inlinés 4 locales + locale via `window.location.pathname.split('/')[1]`. Anti-pattern: useTranslations hors NextIntlClientProvider (throw).
[MEMORY:decision] Context: 403 sans `forbidden.tsx` natif (Next 15.2 exige `experimental.authInterrupts`). Decision: branche 403 dans error.tsx via `isForbiddenError` (message/digest). Why: évite un flag expérimental.

## recommandations suite
- RECOMMAND_FOLLOWUP: build `next build` échoue au PRERENDER statique de pages auth (/fr/login, /reset-password) — PRÉ-EXISTANT (base sans mes changements échoue identique, /en/reset-password). Hors #57. À investiguer (pages auth non exportables statiquement / env manquant).
- Note hors scope #57 (probablement #76 parallèle): `docs/memory/sprint-history.md` modifié dans le worktree (non commité par moi). `src/services/apiClient.test.ts` (#135) a un lint `_onFulfilled` unused qui apparaît si `.eslintcache` invalidé — hors périmètre.
- Pas de RECOMMAND_TEST_RUNNER (383 tests < 500, 15.6s < 3min).
- Pas de RECOMMAND_DB_EXPERT/SECURITY (frontend pur, aucune BR).

## data-testid ajoutés
- `not-found-screen`, `not-found-home-link`
- `error-screen`, `forbidden-screen`, `error-retry`, `error-home-link`
- `global-error-screen`, `global-error-retry`, `global-error-home-link`
- `state-screen` (défaut), `state-screen-code`
- `empty-state` (défaut ; `dashboard-product-list-empty` réutilisé dans ProductList)
- `loading-skeleton` (défaut), `loading-skeleton-item`, `dashboard-loading-skeleton`

STATUS: COMPLETED
