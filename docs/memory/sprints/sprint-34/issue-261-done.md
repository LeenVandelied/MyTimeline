# Issue #261 — CVE MODERATE PROD frontend (done)

**Commit :** `a8b6081`

## Résumé
`next-intl ^4.0.2 → ^4.13.2` (lock résolu 4.13.2). Bump intra-major 4.x semver-compatible, peer deps OK → `next` reste 15.5.20 (aucun bump forcé), postcss racine intouché.

Élimine 2 CVE MODERATE PROD next-intl :
- open-redirect GHSA-8f24-v5vv-gm5j (`<4.9.1`)
- prototype-pollution GHSA-4c35-wcg5-mm9h (`<=4.9.1`, option `experimental.messages.precompile` non utilisée ici)

## postcss — ACCEPTÉE (pas de fix upstream)
- postcss racine = 8.5.15 (déjà patché ≥8.5.10). Résiduel = bundle interne `node_modules/next/node_modules/postcss@8.4.31`, épinglé par `next` dans TOUTES ses releases jusqu'à `next@16.2.10` (`fixAvailable:false`).
- GHSA-qx2v-qp2m-jg93. Décision de non-override documentée dans `docs/security/cve-acceptance.md` (risque pipeline CSS interne next, non vérifiable). Ré-évaluer au prochain bump next.

## Tests
- `next build` exit 0 : 4 locales `/fr /en /es /de` prérendues + middleware `localePrefix:'always'` compilé.
- Vitest **421 pass / 0 fail** (~12s inline). Gate CI `npm audit --audit-level=high` = exit 0 (seuil inchangé).
- Non-régression i18n vérifiée via build (prérendu 4 locales) + suite unit (60 composants `useTranslations`/`NextIntlClientProvider`). Pas d'E2E i18n live (→ follow-up).

## Fichiers
- `frontend/package.json`, `frontend/package-lock.json` (+710 lignes lock)
- `docs/security/cve-acceptance.md` (nouvelle section frontend)

## Signaux mémoire
- **[MEMORY:decision]** Bump next-intl 4.0→4.13.2 intra-major (>4.9.1) : zéro breaking i18n, peers OK sans toucher next ; postcss XSS non-résoluble (next pin 8.4.31 jusqu'à v16) → documenté au lieu d'override forcé.
- **[MEMORY:pitfall]** `frontend/i18n.ts` `getRequestConfig({locale})` utilise l'ancien param `locale` (déprécié next-intl 3.22, doit être `requestLocale`). Non-impactant runtime (flux principal via `app/[locale]/layout.tsx` + `loadMessages`). Latent — à migrer si usage serveur `getTranslations` s'étend.

## Recommandations suite (RECOMMAND_FOLLOWUP — hors scope durcissement)
1. E2E Playwright i18n non exécuté (stack live requise) — valider routes localisées + formats dates/nombres en E2E post-bump.
2. Migrer `i18n.ts` `getRequestConfig` de `{locale}` (déprécié) vers `requestLocale`/`hasLocale`.
- Résiduels MODERATE dev-deps (storybook/vite-plugin/ajv/js-yaml/brace-expansion) hors périmètre (gate high/critical, hérités #222).

STATUS: COMPLETED
