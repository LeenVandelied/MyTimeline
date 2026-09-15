# Issue #610 — Hero asymétrique 30/70, frise dans le panneau (Sprint 87, vague 1)

## Résumé
Hero de la landing : 2 colonnes `md:w-1/2` + image statique + frise en bande pleine largeur SOUS les colonnes
→ flex borné de la maquette en rangée à partir de `lg` (texte `flex:1 1 300px; min-width:300px; max-width:420px`,
frise `flex:1 1 460px; min-width:340px`, gap 40px), empilement en dessous. `<HeroTimelineAnimation />` (non
modifié) monté DANS un panneau bordé (filet `rule-strong`, `rounded-xl`, `bg-surface`, barre de chrome 3 pastilles
`bg-rule-strong` + filet bas `rule`). Image `dashboard-preview.svg` + `next/image` + halo CSS supprimés.

## Commits
- `0a04df6` :lipstick: feat(landing): hero asymétrique 30/70, frise dans le panneau (#610)
  `git show --stat HEAD` : 4 fichiers, tous du périmètre (`dashboard-preview.svg`, `HeroSection.test.tsx`, `HeroSection.tsx`, `landing.css`), +101/−185.
  Commit fait avec `git commit -- <4 chemins littéraux>` : l'index contenait des suppressions stagées par #641 (commit `af01bb9`, juste avant), non embarquées.

## Fichiers
- `frontend/src/components/landing/HeroSection.tsx` — mise en page, panneau, chrome, retrait `<Image>`, commentaire #56 réécrit (#610).
- `frontend/src/components/landing/HeroSection.test.tsx` — assertion `border-rule` recommentée + 3 tests (#610 montage, flex borné, #574 filet sans ombre).
- `frontend/src/styles/landing.css` — retrait `.hero-image-container`, `::before`, `@keyframes hero-halo-pulse`, règle media query (bloc `.timeline-preview` NON touché).
- `frontend/public/images/dashboard-preview.svg` — supprimé.
- `HeroSection.flex-min-size.test.tsx` — NON modifié : ses 3 tests passent tels quels ; aucune raison réelle de le changer (le plancher `min-w-min` des CTA tient, mesuré ci-dessous).

## Décisions et écarts de maquette
- **Ombre / filet (#574)** : maquette `box-shadow: var(--shadow-md)` au repos → NON appliquée. Filet 1px conservé, `box-shadow: none` mesuré (clair + sombre). Verrou unitaire ajouté (`not /shadow-/`).
- **Tier de bordure** : maquette `rule-strong` → retenu (`border-rule-strong`, exposé par `globals.css:52` `@theme`). DS readme : `rule-strong` = « Decorative, emphasised: nested panels » ; le panneau n'est l'affordance d'aucun contrôle → pas `rule-emphasis`. Mesuré `rgb(209,211,217)` = `#D1D3D9` en clair.
- **Palier de rangée = `lg` (1024)**, pas `md` : à 768 le `container` laisse 736px ; les bases 300+40+460 = 800 ne tiennent pas (la maquette `flex-wrap` empilerait de toute façon), et un texte à 300px avec h1 45px en `de` était le pire cas. En rangée : 396/556 à 1024, 420/788 à 1280, 420/1044 à 1536 (le « 30/70 » n'est atteint qu'à ~1536, conforme au flex borné de la maquette).
- **Mobile / tablette (< 1024)** : empilement texte puis panneau ; AUCUN `min-width` px sous `lg` (`min-w-0` à la place — 340px + padding déborderait à 320px). Panneau VISIBLE (il remplace l'image produit, pas un ornement) : `h-80` (320px) sous `md`, `md:h-[420px]` au-delà (hauteur maquette). `min-w-0` sur la colonne frise protège aussi contre la `min-content` d'une piste plus large que le panneau (#611).
- **Image statique** : supprimée (redondante avec la frise). Seule référence restante : `frontend/middleware.test.ts:648`, chaîne de chemin d'exemple d'un test de matcher (n'a pas besoin que le fichier existe) — hors périmètre, laissée. Clé `common.landing.images.dashboard` laissée orpheline (→ #611).
- **Hors maquette, non traité** : libellé chrome « app.mytimeline · frise » (→ #611, locales), typo/textes colonne gauche (verrou #348), `container` global non étendu à 1340px.
- **Observation** : à 1024–1279 en `fr`, le CTA primaire (406px naturel) dépasse la colonne (396px) et se replie sur plusieurs lignes (396×132 vs 406×90 à 1280) — `whitespace-normal` fait son travail, pas de débordement ; même comportement qu'en mobile avant ce diff.

## Mesures navigateur (harnais :3100, Chromium darwin, fr + de, 320/360/375/414/767/768/1023/1024/1280/1536)
`documentElement.scrollWidth === clientWidth` partout ; h1 `scrollWidth === clientWidth` partout (57px à 1024 dans 396px en `de` : pas de débordement) ; direction `column` < 1024, `row` ≥ 1024 ; panneau 320px < 768, 420px ≥ 768 ; `box-shadow: none`. Console `/fr` : seules erreurs = 401 `/api/auth/me` anonyme (badge dev « 1 Issue » = cet appel, pas le hero). Captures clair/sombre 1280 + 375 vérifiées à l'œil.

## Tests
Depuis `frontend/` :
- `rtk proxy npx vitest run src/components/landing` → 9 fichiers, **52 passés / 0 échec** (dont `HeroSection.test.tsx` 7, `HeroSection.flex-min-size.test.tsx` 3).
- `rtk proxy npx tsc --noEmit` → exit 0, 0 erreur.
- `rtk proxy npx eslint src/components/landing/HeroSection.tsx src/components/landing/HeroSection.test.tsx src/components/landing/HeroSection.flex-min-size.test.tsx` → exit 0, 0 problème.
- `rtk proxy npm run format:check` → « All matched files use Prettier code style! », exit 0 (un premier passage sur mes fichiers avait signalé `HeroSection.tsx` → corrigé par `prettier --write`).
- E2E : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test landing-mobile-overflow sprint-63-de-overflow-audit landing-typography-hierarchy landing-cta-contrast landing-header-logo landing-mobile-menu landing-auth-theme-toggle sprint-62-select-focus-indicator sprint-76-legal-visual sprint-77-theme-visual auth-guard --ignore-snapshots --reporter=line`
  → **163 passés / 1 échec** (2,8 min), oracles avant run : `/api/auth/me` 401, `/fr/login` 200.
  - `landing-mobile-overflow` : vert · `sprint-63-de-overflow-audit` : vert · `landing-typography-hierarchy` : vert (dont garde 57px à 1024 `de`) · `landing-cta-contrast` : vert · `landing-header-logo` : vert · `landing-mobile-menu` : vert · `landing-auth-theme-toggle` : vert · `sprint-62-select-focus-indicator` : vert (chromium + firefox) · `sprint-76-legal-visual` : vert · `auth-guard` : vert.
  - `sprint-77-theme-visual` : captures vertes sous `--ignore-snapshots` ; **1 rouge = `:565 armement de la comparaison`**, message « Référence absente (…/landing-hero-light-chromium-darwin.png) ». ENVIRONNEMENT, pas le diff : aucune référence darwin n'existe dans le dépôt (le garde-fou refuse de générer), rouge identique sur la base. `prepare()` a PASSÉ (hero trouvé, `h1` muté effectif — assertion `letter-spacing` verte avant le garde-fou) → pas de signal structurel.
  - Aucun `*-darwin.png` non suivi créé (vérifié `git status --untracked-files=all`). Aucune référence régénérée. Les références `landing-hero-*-chromium-linux.png` CHANGENT par construction → à régénérer par le lead dans l'image du runner CI.

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-87/briefing-610.md` — §3 « Dette #574 », §7 liste des 11 specs.
- `docs/memory/sprints/sprint-87/maquette-landing-hero.md` — §1 `flex:1 1 300px; min-width:300px; max-width:420px`, §2 `.panel { … box-shadow:var(--shadow-md) … height:420px }`.
- Sous-ensemble pit-frontend (prompt) — PIT-S12-003 (`git add` littéral), S73-001/S85-002 (chaîne flex mesurée aux paliers), S83-005 (`npm run format:check`), S77-019 (aucune référence régénérée), S81-022 (aucun `next dev` lancé).
- `.ai-env/context-packs/cp-frontend.md` — §Design system l.59-64 (« Éviter les hex inline »), §Tests l.79 (nouveaux `data-testid` doivent être cités par une spec → aucun ajouté).
- `frontend/src/styles/ds/readme.md` — l.82-86 tableau des tiers de bordure.
- `frontend/e2e/landing-mobile-overflow.spec.ts` — en-tête l.1-40 (piège TanStack Devtools, WIDTHS 320-414).
- `frontend/e2e/sprint-63-de-overflow-audit.spec.ts` — en-tête l.1-50 (PIT-S52-001 : valeur réelle seulement sous jammy).
- `frontend/e2e/landing-typography-hierarchy.spec.ts` — l.180 `column = h1.parentElement`, l.540-552 garde 57px à 1024 `de`.
- `frontend/e2e/sprint-77-theme-visual.spec.ts` — l.196-201 `landing-hero` = `section.section-animation` first.
- `frontend/src/styles/ds/tokens/colors.css` — l.68 `--color-rule-strong`, l.73 `--color-rule-emphasis`.
- `docs/memory/decisions.md` — DEC-S82-010 (breakpoints = `--breakpoint-*` Tailwind 4 ; aucun override dans le dépôt → défauts `lg`=1024, `md`=768).

## Signaux mémoire
- `[MEMORY:pitfall] Context: worktree sprint partagé, l'agent parallèle a déjà STAGÉ des suppressions (git rm) dans l'index commun. Solution: git commit -- <chemins littéraux> (sémantique --only) ne committe que ces chemins, index tiers intact. Prevention: PIT-S12-003 couvre git add -A mais pas un index déjà rempli par un tiers — un git commit nu embarque le staging de l'autre agent ; toujours passer les chemins à git commit.`
- `[MEMORY:pattern] Problem: panneau overflow:hidden destiné à contenir une piste plus large que lui, dans un flex item. Solution: min-w-0 (ou min-width px explicite) sur le flex item ; overflow:hidden sur un DESCENDANT rogne le rendu mais ne réduit pas la min-content remontée par min-width:auto. Anti-pattern: compter sur overflow-hidden du panneau pour empêcher le débordement de page.`

## Recommandations suite
- RECOMMAND_VISUAL_REFS: régénérer `landing-hero-{light,dark}-chromium-linux.png` (sprint-77-theme-visual) dans l'image du runner CI contre un build de prod, `--grep-invert "armement"` puis rejouer sans `--update-snapshots` (PIT-S77-019) — le hero a changé par construction.
- RECOMMAND_FOLLOWUP: CTA du hero replié sur 2-3 lignes entre 1024 et 1279px (colonne 396-420px < ~406-474px de libellé à `px-8 text-lg`) ; la maquette pose des boutons `lg` plus compacts — à arbitrer avec la typo du hero verrouillée par #348 [triage XS]
- Pas de RECOMMAND_TEST_RUNNER car toute la liste E2E du briefing a été jouée (163/164, seul rouge = référence darwin absente).
- Pas de RECOMMAND_DB_EXPERT car frontend seul, aucun schéma touché.
- Pas de RECOMMAND_SECURITY car aucune surface auth/données/API modifiée.
- Pas de RECOMMAND_FOLLOWUP sur `middleware.test.ts:648` car la chaîne `/images/dashboard-preview.svg` n'y est qu'un exemple de chemin d'asset pour un test de matcher, indépendant de l'existence du fichier.
- Pas de RECOMMAND_FOLLOWUP sur le `container` 1340px car le hero reste dans le `container mx-auto` global, aligné sur header et sections.

STATUS: COMPLETED
