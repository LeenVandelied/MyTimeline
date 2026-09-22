# Issue #614 — Landing : navigation collante et liens au traitement du spec

## Objectif

Handoff §1 (`docs/design/graphite-handoff.md:140`) : « nav sticky (logo + liens mono uppercase séparés par filet + langue + thème + CTA) ». Rendre la barre de la landing collante (desktop et mobile), CTA d'inscription toujours atteignable, liens en mono capitales séparés par un filet, ancres qui ne passent pas sous la barre, cohabitation avec la bannière réseau hors ligne.

## Fichiers modifiés

- `frontend/src/components/landing/HeaderSection.tsx` — le `<header>` est enveloppé par une barre pleine largeur `div[data-testid=landing-header-bar].landing-sticky-bar.bg-bg.border-rule.border-b` ; `py-6` → `h-full` (hauteur portée par la barre) ; liens : `nav-link mt-nav-label text-2xs`, nav `gap-4` + `[&>a+a]:border-l border-rule pl-4` (filet inter-liens pour N liens) ; groupe droit `lg:border-l lg:border-rule lg:pl-4` (filet liens | langue/thème/CTA, `lg:` seulement) ; `LandingMobileMenu` sorti de la barre (rendu frère, fragment).
- `frontend/src/styles/landing.css` — `:root { --landing-bar-height: 93px; --landing-sticky-top: 0px }`, `:root:has(.mt-sysbanner--sticky) { --landing-sticky-top: var(--sysbanner-height) }`, `html:has(.landing-sticky-bar) { scroll-padding-top: calc(top + bar) }`, `.landing-sticky-bar { position:sticky; top:var(--landing-sticky-top); z-index:var(--z-sticky); height:var(--landing-bar-height) }`.
- `frontend/src/styles/ds/components/i18n.css` — `:root{--sysbanner-height:32px}` ; `.mt-sysbanner{height:var(--sysbanner-height)}` (même valeur, source unique lue par la landing).
- `frontend/src/components/landing/HeaderSection.test.tsx` — +1 test structurel (panneau et overlay hors de la barre).
- `frontend/e2e/sprint-104-landing-sticky-nav.spec.ts` — nouvelle spec (11 tests).

## Décisions et écarts

- **Sticky sur une barre pleine largeur, pas sur le `<header>`** : fond opaque + filet sur toute la fenêtre, contenu plafonné à 1340 px par `container-landing` (#616). Parent = `div.bg-bg.min-h-screen` de `HomePage` (bloc de toute la page, aucun `overflow` ancêtre) : la barre a toute sa course (PIT-S85-001/S100-003 vérifiés au navigateur : `top` = 0 après 1200 px de défilement).
- **`scroll-padding-top` sur le scrollport au lieu de `scroll-margin-top` par section** (écart assumé au relevé du lead) : couvre les ancres desktop ET burger, mais aussi tout `scrollIntoView` et le défilement au focus clavier (WCAG 2.4.11) ; borné à la landing par `html:has(.landing-sticky-bar)`. Mesuré : section `#how-it-works` à 93 px (bord bas de la barre) après clic, 125 px hors ligne.
- **Hauteur de barre FIXE (93 = 92 + 1 filet)** : seule façon de connaître le décalage en CSS. Le header valait 92 px sous `lg` et 90 au-dessus : **+2 px de hauteur au-dessus de `lg`** (contenu recentré) et +1 px de filet partout — tout le contenu sous la barre descend de 3 px (≥ lg) / 1 px (< lg).
- **Bannière réseau** : reste au-dessus (décision lead). La barre se colle à `var(--landing-sticky-top)` = hauteur de bannière quand `.mt-sysbanner--sticky` est montée (`:has()`), 0 sinon. Mesuré hors ligne : bannière 0→32, barre 32→125, sans chevauchement, à 1280 et 375 px.
- **z-index** : `--z-sticky` (10, échelle ADR-008). Le panneau burger et son overlay (z-40/z-50) sont rendus HORS de la barre : dedans, ils auraient été enfermés dans le contexte d'empilement de la barre. Mesuré 375 px : `elementFromPoint` sur la barre = overlay ; dans le panneau = panneau.
- **Filets, N = 1** : une seule ancre depuis le S103 → le filet inter-liens (`a + a`) n'est pas peint ; il est prouvé par une sonde synthétique (2ᵉ lien cloné → `border-left 1px solid --color-rule`, 1er lien `0px`). Le filet visible est celui du groupe droit (`lg:border-l`), lecture du handoff « liens … séparés par filet + langue + thème + CTA ». Coût 17 px à `lg` (−8,5 px par écart du `justify-between`).
- **Mono capitales** : classe DS `.mt-nav-label` réutilisée (contrat `nav-label-class.test.ts` : ni couleur, ni taille, ni graisse) + `text-2xs` (13 px, comme `AppShell`). `[lang=de]` resserre déjà le tracking.
- **`.nav-link` conservée** (soulignement animé accent au survol, compatible ; paire hover inchangée : `hover:text-accent` seul, verrouillé par `landing.hover-pairing.test.ts`).
- **Budget de largeur 1024 px (macOS, APRÈS correctif)** : écart logo→nav = nav→groupe = fr 167,6 px MESURÉ ; de/es/en NON relevés en chiffres (déduits −8,5 : ~164,6 · ~172,3 · ~221), seulement assertés ≥ 24 px par la nouvelle spec (avant filet, mesurés : fr 176,1 · de 173,1 · es 180,8 · en 229,5). Le tableau #642 du JSDoc (fr 46 px) datait de TROIS ancres ; note ajoutée dans le composant. Plancher 24 px largement tenu ; Linux non mesuré (la spec `landing-header-logo` tranche en CI).
- Mobile < `lg` : aucune classe de largeur modifiée (filet et `pl-4` en `lg:` uniquement) ; `landing-mobile-overflow` et `sprint-63-de-overflow-audit` verts.

## Tests

- Nouvelle spec : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy npx playwright test e2e/sprint-104-landing-sticky-nav.spec.ts --ignore-snapshots --reporter=line` → 18 passed (11 tests + setup).
- Contrôles négatifs (casser → rouge → restaurer → vert, `cmp` avec la sauvegarde) :
  - `position: static` au lieu de `sticky` → 2 rouges (« barre reste en haut », 1280 + 375).
  - `scroll-padding-top` neutralisé → 2 rouges (ancre desktop + burger).
  - `--landing-sticky-top` forcé à 0 hors ligne → 2 rouges (hors ligne 1280 + 375).
  - `mt-nav-label` retirée → rouge (`Expected "uppercase"`, `Received "none"`).
  - filet inter-liens retiré → rouge (sonde synthétique) ; filet du groupe retiré → rouge.
  - `bg-bg` retiré → 2 rouges (`rgba(0, 0, 0, 0)`, clair + sombre).
  - Vitest : `LandingMobileMenu` remis DANS la barre → « hors de la barre collante » rouge.
- Rejeu (15 specs : liste grep du briefing + `sprint-84-section-titles` + `sprint-77-theme-visual` + la nouvelle) → **210 passed, 1 failed** : `sprint-77-theme-visual:620` (armement) = « Référence absente … `landing-hero-light-chromium-darwin.png` » — échec macOS attendu (PIT-S77-019 / S95 : pas de référence darwin, ne pas régénérer), étranger à #614.
- Capture du hero (1280×720) sondée : `locator.screenshot` ne défile pas (`scrollY` 0) et la barre n'apparaît pas dans l'image.
- Vitest : `src/components/landing src/components/pages src/styles` → 18 fichiers / 172 tests verts ; `HeaderSection.test.tsx` 13/13.
- `rtk proxy npx tsc --noEmit` exit 0 ; `next lint --file` (3 fichiers) 0 warning ; `prettier --check` (5 fichiers) OK ; `git status | grep darwin` vide.
- **Non vérifié** : rendu Linux CI (références `landing-hero-*` : la section hero descend de 3 px à 1280 px, capture d'élément donc a priori inchangée — à confirmer par la CI) ; Safari/Firefox (`:has()` supporté Safari ≥ 15.4, Firefox ≥ 121) ; lecteur d'écran.

## Signaux mémoire

- [MEMORY:pitfall] Contexte : `test.use({ reducedMotion: 'reduce' })` dans une spec Playwright. Solution : ce n'est PAS une option de `test.use` (tsc : TS2353) — elle ne s'applique pas si le typage n'est pas contrôlé ; écrire `contextOptions: { reducedMotion: 'reduce' }` ou `page.emulateMedia`. Prévention : `tsc --noEmit` avant de croire une émulation, et figer `.section-animation` par feuille injectée pour toute mesure de position d'ancre (la section glisse encore de 20 px après l'arrêt du défilement : écart lu −3,5 à −4,9 px).
- [MEMORY:pattern] Problem : décaler les ancres sous une barre collante de hauteur connue, en tenant compte d'une bannière collante optionnelle. Solution : hauteur de barre en variable CSS, `top` de la barre = variable qui vaut la hauteur de bannière via `:root:has(.bannière)`, et `html:has(.barre) { scroll-padding-top: calc(top + hauteur) }` (couvre ancres, `scrollIntoView` et focus). Anti-pattern : `scroll-margin-top` section par section, qui oublie le focus et les sections futures.
- [MEMORY:pitfall] Contexte : sonde de couleur `span.style.color = var(--a)` puis relue après `style.color = var(--b)` dans le même `evaluate`. Solution : la 2ᵉ lecture a rendu la valeur de la 1ʳᵉ (constaté, Chromium) — une sonde neuve par token. Prévention : ne jamais réutiliser un élément sonde entre deux tokens.

## Recommandations suite

- RECOMMAND_FOLLOWUP: vérifier en CI Linux que `landing-hero-*` (sprint-77-theme-visual) reste vert après le décalage vertical de 3 px du hero (barre 93 px) [triage XS | frontend]
- RECOMMAND_FOLLOWUP: mettre à jour le tableau chiffré #642 du JSDoc de `HeaderSection` (relevé à 3 ancres) par un relevé Linux à 1 ancre + filet [triage XS | frontend]
- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY : changement de mise en page CSS/TSX sans donnée ni flux d'authentification.
- Pas de RECOMMAND_TEST_RUNNER : 15 specs landing rejouées (210 verts) et Vitest landing/pages/styles joués par l'agent.
- Pas de RECOMMAND_UI_DESIGN : traitement dicté par le handoff (sticky, mono capitales, filet) avec classe et tokens DS existants ; seul arbitrage (filet sur le groupe droit à N = 1) documenté ci-dessus.

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-104/briefing-614.md` — sections issues, relevé du lead, PIT S58-002…S103-004 (l.130-186), harnais.
- `docs/memory/sprints/sprint-104/issue-616-done.md` — utilitaire `container-landing`, tableau des largeurs.
- `docs/memory/sprints/sprint-104/architect-plans.md` — `issue_614` (risque : deux sticky empilés).
- `docs/memory/sprints/sprint-103/maquette-landing-frise-cas-usage.md` §3 — liens de nav de la maquette (hors périmètre).
- `docs/memory/sprints/sprint-103/issue-612-done.md`, `issue-613-done.md` — NON LUS en entier ; extraits grep (`navLinks`, `mobileMenuTargets`, `toHaveCount`).
- `docs/design/graphite-handoff.md:130-145` — « nav sticky … séparés par filet ».
- `docs/adr/ADR-008-echelle-z-popover-modale.md` — échelle z (`--z-sticky` 10 … `--z-netbanner` 80).
- `.ai-env/context-packs/pit-frontend.md` — NON LU directement ; extrait intégral du briefing utilisé.
- `frontend/playwright.config.ts` — NON LU en entier ; grep `viewport` / `reducedMotion`.
- Code : `HeaderSection.tsx`, `LandingMobileMenu.tsx`, `HomePage.tsx`, `OfflineBanner.tsx`, `app/[locale]/layout.tsx:60-96`, `styles/landing.css`, `ds/components/i18n.css:60-142`, `ds/tokens/spacing.css:76-114`, `globals.css:231-252`, `animations.css:22-40`, `HeaderSection.test.tsx`, `nav-label-class.test.ts` (en-tête), `landing.hover-pairing.test.ts:270-300`, `e2e/support/contrast.ts:495-560`, `e2e/landing-mobile-menu.spec.ts`, `e2e/landing-header-logo.spec.ts` (sélecteurs structurels), `e2e/sprint-77-theme-visual.spec.ts` (capture hero).

STATUS: COMPLETED
