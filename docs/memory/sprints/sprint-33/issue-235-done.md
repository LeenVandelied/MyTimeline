# Issue #235 — done

**Titre :** [BUG] Aligner les locales de app/[locale]/layout.tsx (fr,en) avec le middleware (fr,en,es,de)
**Statut :** COMPLETED
**Commit :** bed0d65

## Résumé
Fix 404 `/es` et `/de` : `layout.tsx` reconnaissait `['fr','en']` alors que le middleware routait
4 langues → `notFound()`. Décision **Option 1** (aligner sur 4, i18n = feature MVP).

Extrait une **source de vérité unique** `frontend/src/i18n/locales.ts` (`SUPPORTED_LOCALES` tuple
`as const` + type `Locale` + `DEFAULT_LOCALE` + garde `isSupportedLocale`) — module **pur**
(aucun fs/path → safe runtime Edge du middleware). Consolidé **5 tableaux dupliqués** trouvés au
grep (le briefing n'en annonçait que 2) : `layout.tsx`, `middleware.ts`, `app/error.tsx`,
`src/services/apiClient.ts`, `src/types/settings.ts` importent désormais la constante.
`generateStaticParams` retourne les 4 locales.

## Audit clés es/de
11 namespaces identiques ; flatten+diff = **0 clé manquante** en es/de/en. Seule différence :
`legal:disclaimerOriginalFrench` (en/es/de, absent en fr — intentionnel, disclaimer « traduit du
français »). Aucun trou à combler.

## Fichiers clés
- `frontend/src/i18n/locales.ts` (NOUVEAU — source de vérité)
- `frontend/app/[locale]/layout.tsx`, `frontend/middleware.ts`
- `frontend/app/error.tsx`, `frontend/src/services/apiClient.ts`, `frontend/src/types/settings.ts` (imports consolidés)
- `frontend/src/i18n/locales.test.ts` (NOUVEAU — 12 tests verts)

## Tests
- `locales.test.ts` : 12 tests verts (4 locales + rejets).
- `tsc --noEmit` : 0 erreur sur tout le projet.
- 2 échecs suite complète NON liés : `AccountSection.test` (`useSettings undefined` = WIP #59 concurrent) ; `console-error-guard` (`eslint-plugin-storybook` manquant — artefact node_modules partagé).

## [MEMORY] signaux
- `[MEMORY:decision]` #235 Option 1 (aligner sur 4 langues) — i18n 4 langues = feature MVP (S26 a livré es/de). Source de vérité unique `frontend/src/i18n/locales.ts`.
- `[MEMORY:pitfall]` Divergence locale récurrente : liste dupliquée dans 5 fichiers. Prévention : importer `SUPPORTED_LOCALES` de `@/i18n/locales`, jamais de tableau inline. Module doit rester PUR (pas de fs/path) car importé par le runtime Edge de `middleware.ts`.

## Recommandations suite
- `RECOMMAND_FOLLOWUP` — E2E Playwright `/es` et `/de` → 200 (harness `frontend/e2e/` VIDE, couverture actuelle = test unitaire de la constante).
- `RECOMMAND_FOLLOWUP` — investiguer l'absence de `node_modules` dans les worktrees de sprint (bloque `test-quiet.sh frontend`).

## ⚠ Infra tooling (lead)
Worktree partagé SANS `node_modules` → `./scripts/test-quiet.sh frontend` échoue (`vitest: command not found`).
Contournement dev : symlink temporaire vers `MyTimeline/frontend/node_modules` (créé, tests lancés, supprimé avant commit — jamais stagé).

STATUS: COMPLETED
