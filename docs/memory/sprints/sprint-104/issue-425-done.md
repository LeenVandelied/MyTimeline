# Issue #425 — `leading-tight` inertes sur des h2 de la landing (Sprint 104, vague 3)

## Objectif
Retirer les `leading-tight` inertes posés sur des titres `h2` de la landing : `ds/tokens/base.css` (règle `h1..h6 { line-height: var(--leading-tight) }`, hors `@layer`) les rend sans effet et ils suggèrent à tort qu'une utilitaire pilote l'interligne d'un titre.

## Fichiers modifiés
- `frontend/src/components/landing/CtaSection.tsx` : `leading-tight` retiré du `<h2>` (l.38 avant), paragraphe #425 dans le docblock.

## Décisions et écarts
- **Seule cible restante** : `CtaSection.tsx`, balise vérifiée = `<h2>` (grep `leading-tight` sur `src/components/landing/` et `app/` : plus aucune occurrence en code après ce diff ; restent 2 mentions en COMMENTAIRE dans `HeroSection.tsx:110-112`, préexistantes, classe vivante ailleurs dans le dépôt donc sans effet PIT-S48-002).
- **Critères caducs de l'issue** :
  - `TestimonialSection.tsx` — fichier supprimé (#613).
  - `FeaturesSection.tsx` — fichier supprimé (#612).
  - `MobileAppSection.tsx` — fichier supprimé (#641).
- Aucun `leading-*` retiré d'un `<p>` / `<span>` : le `<p>` du bandeau (`text-md md:text-lg`, sans `leading-*`) n'est pas touché — il est hors périmètre #425 (voir Recommandations).
- Pas de nouveau verrou : l'invariant (1.08 sur `h1..h6`) est déjà tenu par `base.css:53` et asserté par `landing-typography-hierarchy`. Donc pas de contrôle négatif à produire ; la preuve d'inertie est la mesure identique avant/après ci-dessous.

## Tests
Depuis `frontend/`, harnais du lead (`:3000`), oracles `/api/auth/me` 401, `/fr/login` 200.

### Mesure du `<h2>` du bandeau (`section.bg-accent h2`, spec jetable `zz-lead-425-measure`, supprimée), Chromium darwin
| Largeur | Locales | font-size | line-height AVANT | line-height APRÈS | hauteur AVANT / APRÈS |
|---|---|---|---|---|---|
| 375 | fr, en, es, de | 27 px | 29,16 px (1.08) | 29,16 px | 58,31 / 58,31 px |
| 768 | fr, en, es, de | 35 px | 37,8 px (1.08) | 37,8 px | 37,80 / 37,80 px |
| 1280 | fr, en, es, de | 35 px | 37,8 px (1.08) | 37,8 px | 37,80 / 37,80 px |
12/12 mesures strictement identiques.

### Commandes
- `rtk proxy npx vitest run src/components/landing` (+ `CtaSection.test.tsx`, `landing.hover-pairing.test.ts`) → 8 fichiers, **59 passés**.
- `rtk proxy npx tsc --noEmit` → exit 0 ; `rtk proxy npx next lint --file src/components/landing/CtaSection.tsx` → 0 avertissement ; `rtk proxy npx prettier --check src/components/landing/CtaSection.tsx` → exit 0.
- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy npx playwright test e2e/landing-typography-hierarchy.spec.ts e2e/landing-cta-contrast.spec.ts e2e/landing-mobile-overflow.spec.ts e2e/sprint-63-de-overflow-audit.spec.ts --ignore-snapshots --reporter=line` → **58 passés** (1er lancement : 2 échecs du projet `setup` à froid — dashboard « Chargement en cours » > 5 s — relancé une fois, vert).
- Le rejeu complet des 13 specs (198/198) a été fait sur #682, AVANT ce diff ; pour #425 seul ce sous-ensemble typo/contraste/débordement a été rejoué.
- `git status | grep darwin` → vide.

## Signaux mémoire
aucun

## Recommandations suite
- `RECOMMAND_FOLLOWUP: le <p> du bandeau CtaSection (text-md md:text-lg, sans leading-*) relève du piège documenté dans HeroSection (--text-md--line-height non émis → interligne hérité ; --text-lg--line-height = défaut Tailwind 1.5556). Non mesuré ici — à vérifier et, si besoin, poser leading-normal comme sur le sous-titre du hero.`
- Pas de RECOMMAND_DB_EXPERT : retrait d'une classe CSS inerte, aucune donnée.
- Pas de RECOMMAND_SECURITY : aucune surface sensible touchée.
- Pas de RECOMMAND_TEST_RUNNER : specs typo/contraste/débordement rejouées par l'agent (58/58).
- Pas de RECOMMAND_UI_DESIGN : rendu identique au pixel près (line-height mesuré).

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-104/briefing-682.md` — consigne #425 et extrait pit-frontend S104.
- `docs/memory/sprints/sprint-104/architect-plans.md` — l.52-56 `issue_425` (fichiers supprimés #641/#612/#613).
- `frontend/src/styles/ds/tokens/base.css` — l.45-60 (corollaire S59 « leading-tight sur h1..h6 INERTES »).
- `frontend/src/styles/globals.css` — l.132-160 (mapping `--leading-*`, canal `--tw-leading`).
- `frontend/src/components/landing/CtaSection.tsx` — l.1-45.
- `frontend/e2e/landing-typography-hierarchy.spec.ts` — l.580-660 (contrôle d'invariance thème, `want.h2`).

STATUS: COMPLETED
