# Issue #616 — Landing : largeur maximale 1340 px

## Objectif

Plafonner la landing à 1340 px (handoff : `max-width:1340px;margin:0 auto`) au lieu des 1536 px du `container` Tailwind au-delà de `2xl`, via un token unique, sans impact hors landing ; statuer sur `rounded-full` pour les cercles décoratifs.

## Fichiers modifiés

- `frontend/src/styles/globals.css` — `@theme { --container-landing: 1340px; }` + `@utility container-landing` (`@apply container` + `margin-inline:auto` + `@media (width >= --theme(--container-landing)) { max-width: --theme(--container-landing) }`).
- `frontend/src/components/landing/{HeaderSection,HeroSection,HowItWorksSection,CtaSection,FooterSection}.tsx` — `container mx-auto` → `container-landing` (1 ligne chacun) ; commentaires `HeaderSection.tsx:60` et `HeroSection.tsx:57` mis à jour (ne nomment plus `container`).
- `frontend/src/styles/ds/tokens/spacing.css` — commentaire de `--radius-pill` élargi aux cercles vrais.
- `frontend/src/styles/ds/readme.md` — même précision dans « Borders & cards » (le readme disait « pill reserved for switches », il aurait contredit le token).
- `frontend/e2e/sprint-104-landing-container.spec.ts` — nouvelle spec (5 tests).

## Décisions et écarts

- **Option (a) retenue** (utilitaire dédié), pas (b) `container max-w-(--container-landing)` : en (b), `container` et `max-w-*` posent tous deux `max-width` dans la même couche, l'issue dépend de l'ordre de tri Tailwind et des `@media` imbriquées de `container` — non déterministe à la lecture. En (a), le CSS compilé (vérifié par `@tailwindcss/node` compile) émet les paliers de `container` PUIS `@media (width >= 1340px) { max-width: var(--container-landing) }` : la dernière règle gagne à ≥1340, y compris sur le palier 1536.
- **Seuil à 1340, pas au palier `2xl`** : un simple `min(palier, 1340)` aurait laissé 1280 entre 1340 et 1535 et n'aurait atteint 1340 qu'à ≥1536. Le seuil 1340 donne le comportement de la maquette (fluide jusqu'au plafond au-dessus de 1340) tout en gardant le rendu strictement identique sous 1340.
- **Token dans `@theme` (non `inline`)**, namespace `--container-*` : une seule valeur, lue par `--theme()` dans le seuil `@media` (qui ne peut pas lire de variable runtime) et en `var()` dans la déclaration. Effet de bord : l'utilitaire `max-w-landing` devient disponible (non utilisé).
- **Mesures avant/après** (Chromium headless, `.container`/`.container-landing`, largeurs arrondies) :

  | viewport | landing avant | landing après | `/fr/privacy` avant | après |
  |---|---|---|---|---|
  | 375 | 375 | 375 | 375 | 375 |
  | 1024 | 1024 | 1024 | 1024 | 1024 |
  | 1280 / 1339 | 1280 | 1280 | 1280 | 1280 |
  | 1340 / 1440 | 1280 | **1340** | 1280 | 1280 |
  | 1536 / 1920 | 1536 | **1340** | 1536 | 1536 |

  Écart voulu : entre 1340 et 1535, la landing passe de 1280 à 1340 (conforme maquette).
- **`rounded-full`** : décision du lead appliquée — PAS de nouveau token, commentaire élargi (cercles vrais : icônes, chiffres d'étape, avatars, jalons). Relevé : sur la landing, seuls les 3 points de chrome `size-[9px] rounded-full` (`HeroSection.tsx:140-142`) l'utilisent encore ; l'énoncé (icônes de features, avatars) date d'avant le S103 (FeaturesSection et témoignages retirés). `rounded-full` Tailwind 4 ne lit pas `--radius-pill` (`calc(infinity*1px)`).
- **Écart d'énoncé** : `frontend/tailwind.config.ts` existe (l'énoncé dit le contraire), sans `container`/`theme` — déjà relevé par l'architect.
- **Hors périmètre, non traité** : la maquette pose `padding:40px 40px 64px` sur le conteneur, la landing garde `px-4` (16 px). Voir recommandations.

## Tests

- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy npx playwright test e2e/sprint-104-landing-container.spec.ts --ignore-snapshots --reporter=line` → 10 passed (5 tests + 5 setup).
- Contrôle négatif 1 : token passé à `1536px` → test « 1340 px et centré » ROUGE (Received 1536, difference 196), restauré → vert.
- Contrôle négatif 2 : `HeroSection` remis à `container mx-auto` → 4 ROUGES (`toHaveCount(5)`), restauré → 10 passed.
- Auto-contrôle intégré à la spec : `max-width:none !important` injecté → largeur > 1340 constatée.
- Specs à rejouer (liste grep du briefing, 11 + la nouvelle) : `auth-guard landing-auth-theme-toggle landing-cta-contrast landing-header-logo landing-mobile-menu landing-mobile-overflow landing-typography-hierarchy sprint-103-use-case-frieze sprint-62-select-focus-indicator sprint-63-de-overflow-audit sprint-76-legal-visual sprint-104-landing-container` → **168 passed (4.7 min)**, 0 échec, contre `next dev` du lead.
- Vitest : `src/components/landing src/components/pages` 68/68 ; suite complète `rtk proxy npx vitest run` 157 fichiers / 2004 tests verts.
- `rtk proxy npx tsc --noEmit` exit 0 ; `next lint --file` (5 composants + spec) : 0 warning ; `prettier --check` (9 fichiers) exit 0.
- `git status | grep darwin` : vide.
- Non vérifié : rendu Linux CI (références `toHaveScreenshot` ignorées sur darwin — `landing-hero-*` peuvent bouger à ≥1340 px si une capture est prise à cette largeur ; à trancher par la CI).

## Signaux mémoire

- [MEMORY:pattern] Problem: plafonner un conteneur Tailwind 4 à une valeur hors paliers sans toucher `container` global. Solution: `@utility x { @apply container; margin-inline:auto; @media (width >= --theme(--token)) { max-width: --theme(--token) } }` avec le token dans `@theme` namespace `--container-*` ; la règle du seuil vient après les paliers dans le CSS émis, donc gagne. Anti-pattern: `container max-w-(--token)` (deux `max-width` concurrents, issue dépendante du tri) ou `max-w-[…]` répété.

## Recommandations suite

- RECOMMAND_FOLLOWUP: aligner le padding horizontal de la landing sur la maquette (`40px`, `px-4` actuel = 16 px) — impact sur les budgets de largeur mobiles (landing-mobile-overflow, header-logo) [triage S | frontend]
- RECOMMAND_FOLLOWUP: vérifier en CI Linux que les références `landing-hero-*` / `sprint-77-theme-visual` ne sont pas prises à une largeur ≥1340 px (elles bougeraient de 60 px) [triage XS | frontend]
- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY : changement purement CSS de mise en page.
- Pas de RECOMMAND_TEST_RUNNER : suites landing et Vitest complètes déjà jouées (168 E2E, 2004 unitaires).
- Pas de RECOMMAND_UI_DESIGN : valeur 1340 px dictée par le handoff, rendu inchangé sous 1340 px, décision `rounded-full` arbitrée par le lead.

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-104/briefing-616.md` — lu via le prompt (inline identique, 346 lignes sur disque non relues en entier) ; décisions du lead appliquées (option a/b, pas de nouveau token radius).
- `.ai-env/context-packs/pit-frontend.md` — grep `container` : l.346 (`container` plafonne à 736 px utiles, nav masquée), l.1305 (PIT-S87 frise 1640 px / balayage overflow).
- `frontend/playwright.config.ts` — l.52 `assertWebServerEnv`, projets `setup`/`chromium` l.281-290.
- `docs/memory/sprints/sprint-103/issue-612-done.md` — titre « Frise de cas d'usage à 4 jalons » (FeaturesSection retirée) ; corps NON LU en détail.
- `docs/memory/sprints/sprint-103/issue-613-done.md` — titre « Retirer la section témoignages » ; corps NON LU en détail.
- `docs/memory/sprints/sprint-103/maquette-landing-frise-cas-usage.md` — l.10 `max-width:1340px;margin:0 auto;padding:40px 40px 64px`.
- `frontend/src/styles/ds/tokens/spacing.css` — l.23 « never pill on containers », l.29 `--radius-pill` « reserve for switches / true pills only ».
- `frontend/src/styles/ds/readme.md` — l.78 « pill reserved for switches ».

STATUS: COMPLETED
