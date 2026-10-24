# Issue #612 — Frise de cas d'usage à 4 jalons au lieu de deux sections redondantes

**Sprint :** 103 · **Agent :** B (`fullstack-dev`, opus) · **Date :** 2026-09-22
**Commit :** `2f5edd2f` (sur `ee44f21e`, #613)

## Résumé

Objectif : une seule section explicative — « Comment ça marche » en frise de cas d'usage (ligne + 4 jalons à pastilles de la palette curatée), `FeaturesSection` supprimée.

Fichiers clés :
- `frontend/src/components/landing/HowItWorksSection.tsx` — réécrit. Tableau typé `MILESTONES: {key, role: EventPaletteRole}[]` (sky, periwinkle, grass, amber), pastilles peintes `style={{ backgroundColor: var(--evt-<role>) }}`, `<ol>` sémantique, testids `landing-frieze`, `landing-frieze-milestone` (+ `data-role`), `landing-frieze-dot`, `landing-frieze-rule`, `landing-frieze-tag` (grep préalable `landing-frieze|frieze|use-case` sur `src e2e` = 0). `id="how-it-works"` et `section-animation` conservés (`useSectionAnimation` toujours appelé par `HomePage`).
- Filet : un segment PAR jalon prolongé sur la gouttière (`sm:-right-7` = gap 28 px ; `-bottom-8` = gap 32 px en vertical) + `overflow-hidden` sur la liste → un seul mécanisme pour les 3 dispositions, sans calcul « dernier de rangée ». Halo pastille = `shadow-[0_0_0_4px_var(--color-bg)]` (le `ring-4 ring-bg` initial était refusé par le garde-fou DEC-S58-001 qui interdit `ring-*` en `.tsx`).
- Supprimés : `FeaturesSection.tsx`, `FeaturesSection.test.tsx` ; CSS mort `.feature-card` (+ palier 768 px) dans `landing.css`, `.card-gradient-border` (+ `::before`, `:hover::before`, `@keyframes card-halo-rotate`) et `.feature-icon` dans `animations.css` (grep : seul consommateur = `FeaturesSection`).
- Ancres `#features` retirées : `HeaderSection.tsx` `navLinks` (donc aussi `LandingMobileMenu`, même liste), `FooterSection.tsx`. `HomePage.tsx` : rendu + JSDoc.
- i18n 4 locales (`frontend/public/locales/{fr,en,es,de}/common.json`, script node, sérialisation vérifiée identique avant modif) : `landing.howItWorks` = `eyebrow/title/subtitle/milestones.{reminder,recurrence,coverage,deadline}.{tag,title,text}` ; supprimés `landing.features.*`, `landing.howItWorks.step1..4`, `landing.navigation.features`, `landing.footer.features`.
- Tests : `HowItWorksSection.test.tsx` (11 tests dont résolution RÉELLE des clés dans les 4 locales via `NextIntlClientProvider` + `onError`), `HomePage.test.tsx` (mock namespace-aware, test « plus de `#features` + toute ancre interne a sa cible »), `HeaderSection.test.tsx`, `FooterSection.test.tsx`, `landing-palette.test.ts` (`.feature-card/.feature-icon/.card-gradient-border` → 0 déclaration), commentaire de `ds-type-scale.test.ts` corrigé.
- E2E : nouvelle `frontend/e2e/sprint-103-use-case-frieze.spec.ts` ; `landing-typography-hierarchy.spec.ts` adaptée ; `support/contrast.ts` (`menu/ancre-2` retirée) + `landing-mobile-menu.spec.ts:525` → `toHaveCount(1)` + `toHaveAttribute('href','#how-it-works')`.

Tableau « feature d'origine → où elle vit désormais » :

| Feature d'origine (`landing.features.*`) | Où elle vit |
|---|---|
| `timeline` — visualiser échéances et engagements sur une timeline | Titre de section (« La même frise, du rappel à l'échéance ») + jalon `coverage` (« Visualisez les couvertures » : barres pleines sur la frise) |
| `reminders` — rappels, ne plus manquer une échéance | Jalon `reminder` (« Vous êtes prévenu à temps ») |
| `organization` — grouper par projet et catégorie | Jalon `deadline`, texte : « … tout converge sur une seule vue, rangé par produit et par catégorie » (absent de la maquette, ajouté) |
| (ancien `howItWorks.step1..4` : compte, projets, échéances, rester organisé) | Parcours d'onboarding remplacé par les cas d'usage de la maquette ; « récurrence » (jalon `recurrence`) est nouveau |

Paliers DS vs maquette (aucun token inventé) :

| Élément | Maquette | Retenu |
|---|---|---|
| Surtitre | mono 11 px, .16em, `ink-muted` | `text-2xs` (13) `tracking-widest` (.16em exact) `leading-normal` |
| h2 | display 35 px/600, gauche | `text-lg md:text-xl` (27/35 — 35 exact dès `md`, 27 conservé sous `md` pour la spec typo) ; graisse 600 de `base.css` (l'ancien `font-bold` retiré) ; `max-w-2xl` (672 ≈ 680) `text-balance` |
| Paragraphe | 16 px `ink-muted`, max 560, mb 44 | `text-sm` (17, équidistant 15/17) `leading-normal`, `max-w-xl` (576), `mb-11` (44) |
| Pastille | 14×14, radius 4, halo 4 px `--color-bg` | `size-3.5` (14), `rounded-xs` (3 px, équidistant 3/5), halo exact |
| Ligne | 1 px `rule-strong`, `top:11px` | identique (`sm:top-[11px]`) |
| Étiquette | mono 10.5 px, .08em, **accent** | `text-2xs` (13) `tracking-wider` (.1em, équidistant .06/.1) **`text-ink-muted`** (A1) |
| Titre jalon | display 18 px/600 | `text-sm` (17) |
| Texte | 14 px/1.5 `ink-muted` | `text-xs` (15) `leading-normal` (1.5) |
| Grille | 4 col, gap 28 | `lg:grid-cols-4`, `sm:gap-x-7` (28) |

Disposition (A2, MESURÉE) — probe Playwright jetable, grille forcée à 4 colonnes, 4 locales : à 640 px colonne 131 px (titres sur 2-3 lignes, étiquettes sur 2 lignes dans les 4 locales), à 768-1023 px colonne 163 px (le `container` plafonne à 768 jusqu'à `lg`) : étiquettes encore sur 2 lignes en fr/es/en/de. À 1024 px (colonne 227) et 1280 (291) en 4 colonnes réelles : étiquettes sur 1 ligne partout. Aucun débordement dans aucun cas. Décision : **< 640 vertical ; 640-1023 = 2×2 (une ligne par rangée) ; ≥ 1024 = 4 colonnes.**

Écarts d'énoncé :
- **Voix** : le brief dit « vouvoiement » ; FR vouvoie, DE vouvoie (Sie), EN neutre, mais **ES tutoie déjà** tout le produit (`hero.title` « Organiza tu vida ») → ES rédigé en tú pour rester cohérent. Terminologie « frise » par locale reprise de `hero.timeline.chrome` (frise / timeline / cronología / Zeitleiste).
- **La maquette place la ligne à `top:11px`** avec une pastille 0-14 : la ligne passe dans le tiers bas de la pastille, pas en son centre (visible sur capture 1280). Recopié tel quel ; en vertical, le filet est centré. À trancher à la vérification navigateur du lead.
- Les clés `common.footer.{features,howItWorks,…}` (racine, hors `landing`) étaient orphelines AVANT le sprint (cf. #613) : non touchées ici, laissées au follow-up de l'agent A pour une purge unique.
- Le dernier segment vertical (< 640 px) court jusqu'au bas du 4ᵉ jalon (la maquette horizontale court aussi jusqu'au bord droit) — choix, pas un défaut mesuré.

## Tests

- Vitest ciblé `HowItWorksSection.test.tsx` : 11 passed.
- Vitest complet `rtk proxy npx vitest run` : **156 fichiers / 2001 tests passed** (157/1998 avant : −1 fichier `FeaturesSection.test.tsx`).
- `rtk proxy npx tsc --noEmit` → 0 ; `npx next lint --file` ×13 → « No ESLint warnings or errors » ; `rtk proxy npx prettier --check` ×19 fichiers (dont 4 JSON, 2 CSS) → OK.
- Nouvelle spec seule : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy npx playwright test sprint-103-use-case-frieze --workers=1 --reporter=line` → 11 passed (5 setup + 6 : 1280/768/375 × clair/sombre).
- E2E 15 specs (`landing-cta-contrast landing-header-logo landing-mobile-menu landing-mobile-overflow landing-typography-hierarchy landing-auth-theme-toggle sprint-77-theme-visual sprint-84-section-titles sprint-63-de-overflow-audit sprint-75-legal-pages sprint-76-legal-visual sprint-85-timeline-toolbar sprint-62-select-focus-indicator auth-guard sprint-103-use-case-frieze`, `--workers=1`, oracles 401/200 vérifiés avant) : **214 passed / 11 failed (11,5 min)**. Les 11 = `sprint-77-theme-visual` : 10 captures « A snapshot doesn't exist … chromium-darwin.png » (0 `did not match`) + le test d'armement qui exige la référence darwin absente. Écart macOS connu ; 9 PNG darwin non suivis supprimés ; `git status | grep darwin` = 0 avant commit.
- Contrôles négatifs (fichier restauré depuis copie, `git status` vérifié) :
  1. pastille `grass` peinte `var(--evt-teal)` + `lg:grid-cols-4` retiré → la spec rougit : « pastille grass peinte #2FA7A2, attendu #4FA459 » aux 6 tests, « jalon 3/4 hors rangée » à 1280 ×2 thèmes ;
  2. `grid-cols-2` forcé sous `sm` → 375 px : **2 failed** (« jalon 2/4 : même x », « sous le précédent ») ;
  3. clé `de` `milestones.coverage.text` supprimée → `HowItWorksSection.test.tsx` **1 failed** (locale `de`).
- NON vérifié : métriques de police sous Linux (la spec typo a passé sur macOS ; ses références sont jammy — PIT-S52-001) → trancher en CI. Nombre de lectures du harnais burger après retrait de `menu/ancre-2` : attendu 20 → 16 (−2 × 2 thèmes), NON recompté par reporter JSON.

fichiers de contexte lus:
- `docs/memory/sprints/sprint-103/maquette-landing-frise-cas-usage.md` — intégral (§1 « Ligne horizontale … top:11px », §4 A1/A2)
- `docs/memory/sprints/sprint-103/architect-plans.md` — blocs `issue_612`/`issue_615` (« Absorbe #426 (pastille h-16 …) »)
- `docs/memory/sprints/sprint-103/issue-354-done.md`, `issue-613-done.md` — intégraux (suite « supprimer `menu/ancre-2` … `toHaveCount(1)` »)
- `docs/design/graphite-handoff.md:130-150` (« *remplace* des features 3 colonnes »)
- `frontend/src/lib/event-palette.ts:1-80` (l.14 « les pastilles sont PEINTES via `var(--evt-*)` »)
- `.ai-env/context-packs/cp-frontend.md` — NON LU (seul l'extrait inline du briefing)
- `.ai-env/context-packs/pit-frontend.md` — NON LU intégralement ; extrait du briefing (PIT-S58-001/002, S61-004, S71-003, S85-006, S90-011, S97-001, S102-004)
- JSDoc de l'ancienne `HowItWorksSection.tsx` — lu ; pièges `leading-*` (#348) conservés et réécrits (le chiffre et sa pastille ont disparu, la règle `leading-*` sur `<p>` reste vraie)
- `frontend/src/styles/ds/tokens/base.css:1-120`, `typography.css`, `spacing.css:24-29` — paliers et rayons

## Signaux mémoire

- [MEMORY:pitfall] Contexte : halo de pastille en `ring-4 ring-bg`. Solution : `shadow-[0_0_0_4px_var(--color-bg)]`. Prévention : un garde-fou vitest (DEC-S58-001) refuse tout `ring-*`/`outline-none` dans un `.tsx`, même hors focus — viser `shadow-[…]` pour un halo décoratif.
- [MEMORY:pattern] Problème : une frise dont le filet doit être continu en 1, 2×2 et 4 colonnes sans « traverser » la rangée suivante. Solution : un segment de filet PAR élément, prolongé de la gouttière (`-right-<gap>` / `-bottom-<gap>`), et `overflow-hidden` sur le conteneur pour rogner le dernier. Anti-pattern : une ligne unique en `absolute` sur le conteneur (traverse la 2ᵉ rangée) ou des `nth-child` par breakpoint.
- [MEMORY:pitfall] Contexte : un composant passe à `useTranslations('ns.sous.ns')` ; les tests parents mockent `useTranslations: () => (k) => k` et perdent le namespace (`HomePage.test` rouge sur `…howItWorks.title`). Prévention : mock namespace-aware `(ns) => (k) => ns ? \`${ns}.${k}\` : k`.
- [MEMORY:business-rule] Description : la landing promet des RAPPELS (« Un rappel avant chaque échéance ») — promesse héritée de `features.reminders` et de la maquette. Contraintes : aucune notion de rappel/notification dans `backend/src/main` ni `frontend/src/types` (grep `remind|rappel|notif`) → la promesse n'est pas tenue par le produit (cf. suite).

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun changement backend/schéma.
- Pas de RECOMMAND_SECURITY : contenu statique de landing, aucune surface nouvelle.
- Pas de RECOMMAND_TEST_RUNNER : 15 specs + Vitest complet exécutés ; seules les captures darwin restent à trancher par la CI Linux.
- Pas de RECOMMAND_UI_DESIGN : cible fixée par la maquette + A1/A2 ; point visuel ouvert (ligne à `top:11px`, hors centre de la pastille) laissé à la vérification navigateur du lead.
- RECOMMAND_FOLLOWUP: la landing annonce des rappels avant échéance (jalon 1, héritage de `features.reminders`) alors qu'aucune fonctionnalité de rappel/notification n'existe (backend ni front) — reformuler le jalon ou livrer la fonctionnalité [triage S | produit/frontend]
- RECOMMAND_FOLLOWUP: `cp-frontend.md` §Structure cite encore les composants landing supprimés (`FeaturesSection`, `Testimonial*`) — régénérer le pack [triage XS | ai-env]
- RECOMMAND_FOLLOWUP: `docs/design/audit-conformite-2026-09-07.md:61` cite `FeaturesSection.tsx:65`, supprimé — annoter l'audit comme soldé [triage XS | docs]

STATUS: COMPLETED
