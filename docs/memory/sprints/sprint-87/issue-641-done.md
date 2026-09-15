# Issue #641 — done

## Résumé
Retrait de `MobileAppSection` (promesse d'apps mobiles inexistantes) et `TimelinePreviewSection`
(doublon de la frise du hero) de la landing, DEC-S82-008. Lead a tranché : `TimelinePreviewSection`
retirée maintenant (rien n'est publié avant le merge de la PR entière du sprint).

## Commits
`af01bb9` — `:fire: chore(landing): retrait des sections app mobile et aperçu de frise (#641)`
Vérifié `git show --stat HEAD` = exactement mes 13 fichiers (aucun fichier #610).

## Fichiers
Supprimés :
- `frontend/src/components/landing/MobileAppSection.tsx`
- `frontend/src/components/landing/MobileAppSection.test.tsx`
- `frontend/src/components/landing/TimelinePreviewSection.tsx`
- `frontend/src/components/landing/TimelinePreviewSection.test.tsx`
- `frontend/public/images/mobile-app.svg`
- `frontend/public/images/timeline.svg`

Modifiés :
- `frontend/src/components/pages/HomePage.tsx` (imports + montages retirés)
- `frontend/src/components/pages/HomePage.test.tsx` (assertion `mobileApp.title` retirée)
- `frontend/public/locales/{fr,en,es,de}/common.json`
- `docs/design/audit-conformite-2026-09-07.md` (ligne #586 : note de résolution par #641)

Non modifié (hors périmètre, propriété #610/#611) : `frontend/src/styles/landing.css`
(`.timeline-preview` y reste, cf. Recommandations), `HeroSection*`, `app/[locale]/page.tsx`.
`docs/design/graphite-handoff.md` : aucune mention des sections retirées trouvée, non touché.

## Clés i18n retirées (4 locales, mêmes chemins fr/en/es/de)
- `common.landing.mobileApp.title`
- `common.landing.mobileApp.subtitle`
- `common.landing.mobileApp.ios`
- `common.landing.mobileApp.android`
- `common.landing.images.timeline`
- `common.landing.images.mobileApp`
Non touchée (autre objet, usage vérifié ailleurs) : `common.landing.images.dashboard` (#610).
Clé homonyme `"mobileApp"` à `common.json:185` (fr) = exactement `landing.images.mobileApp` ci-dessus,
pas un objet distinct — traitée. Aucune autre mention app mobile/iOS/Android/App Store/Google Play
trouvée dans `HeaderSection`, `FooterSection`, `LandingMobileMenu`, `CtaSection`, `FeaturesSection`,
`HowItWorksSection`.

## Tests
- `rtk proxy npx vitest run src/components/pages src/components/landing src/__tests__/i18n-namespaces.test.ts`
  → 11 fichiers, 62 tests, tous verts (aucun fichier orphelin, plus de test MobileApp/TimelinePreview).
- `rtk proxy npx tsc --noEmit` → 0 erreur.
- `rtk proxy npx eslint frontend/src/components/pages/HomePage.tsx frontend/src/components/pages/HomePage.test.tsx` → 0 erreur.
- `rtk proxy npm run format:check` → 1 seul warn, sur `HeroSection.tsx` (fichier #610 en cours d'édition,
  pas dans mon périmètre, non committé par moi — cf. contrainte briefing §6).
- Grep e2e post-commit (`MobileApp|TimelinePreview|mobile-app|timeline\.svg`) sur `frontend/e2e` → 0 résultat.
- `language-selector.i18n.test.ts` (PIT-S83-009, clés `common.navigation`) et
  `i18n-namespaces.test.ts`/`i18n-request-config.test.ts` (parité namespaces top-level) : aucun n'assère
  de clé sous `landing.*` — vérifié par lecture, non affectés.

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-87/briefing-641.md` — intégral.
- `docs/memory/decisions.md:768` (DEC-S82-008) — lu, §1 du briefing le cite déjà en substance.
- `.ai-env/context-packs/pit-frontend.md:1180-1185` (PIT-S83-009) — lu : porte sur `common.navigation`,
  sans rapport avec `landing.*` retiré ici.
- `.ai-env/context-packs/pit-frontend.md:597-598` (PIT-S63-006) — lu : mock `t` en `${ns}.${key}` rend un
  namespace faux indiscernable — vérifié qu'aucun test restant ne dépend d'une clé retirée par grep JSON
  direct (pas seulement lecture des mocks).
- `docs/memory/sprints/sprint-87/pit-subset-s87.md` — intégral (worktree partagé, débordement, visuel).
- `frontend/src/__tests__/i18n-namespaces.test.ts` — lu intégral, exécuté.

## Signaux mémoire
Aucun.

## Recommandations suite
- `.timeline-preview` reste dans `frontend/src/styles/landing.css` : résidu connu, propriété #611
  (pas de RECOMMAND_FOLLOWUP, déjà attribué — conforme briefing §2).
- Pas de RECOMMAND_TEST_RUNNER, pas de RECOMMAND_DB_EXPERT : périmètre XS entièrement couvert solo.

STATUS: COMPLETED
