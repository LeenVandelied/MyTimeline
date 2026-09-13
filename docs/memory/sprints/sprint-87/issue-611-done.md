# Issue #611 — Frise du hero conforme au spec (Sprint 87, vague 2)

## Résumé
Placeholder #56 (rail + 5 pastilles, balayage `scaleX` 6 s `--ease-quart`) remplacé par la frise de la maquette : règle de mois, 6 lanes (zébrure 1 sur 2), barres pleines `.mt-evt`, 2 ponctuels, curseur TODAY fixe hors piste, piste = 2 copies de 820 px en `translateX(0 → -50%)` 52 s `linear` infinite, masque de fondu 7 %/93 %, `prefers-reduced-motion` = piste figée sur la 1re copie. Libellé de chrome « app.mytimeline · frise ». Textes en i18n 4 locales. Résidus vague 1 soldés (`.timeline-preview`, tests #340 associés, clé `landing.images.dashboard`). Commentaire « non spécifiée, sera remplacée » retiré.

## Commits
- `02a1b45` :sparkles: feat(landing): frise du hero conforme au spec (#611)
  `git show --stat HEAD` : 13 fichiers, tous du périmètre, +728/−220. Commit fait avec `git add` + `git commit -- <13 chemins littéraux>` ; fichiers du lead (`briefing-*.md`, `spawn-ref-611.txt`) restés non suivis.

## Fichiers
- `frontend/src/components/landing/HeroTimelineAnimation.tsx` — réécrit (frise du spec).
- `frontend/src/components/landing/HeroTimelineAnimation.test.tsx` — réécrit (9 tests : structure, 2 copies identiques, 6 lanes/zébrure, barres DS/tokens, TODAY hors piste, i18n, 0 hex, invariants CSS du mouvement + reduced-motion).
- `frontend/src/styles/hero-timeline.css` — réécrit (keyframes `hero-timeline-pan`, masque, lanes, chrome, reduced-motion).
- `frontend/src/components/landing/HeroSection.tsx` — libellé de chrome + zone de frise `relative flex min-h-0 flex-1 items-center px-6` → `relative min-h-0 flex-1` (seules classes touchées de #610).
- `frontend/app/[locale]/page.tsx` — commentaire de l'import (plus « aucune couleur »).
- `frontend/public/locales/{fr,en,es,de}/common.json` — `landing.hero.timeline.*` ajouté, `landing.images` (orphelin) retiré.
- `frontend/src/styles/landing.css` — bloc `@layer components { .timeline-preview }` + commentaire #340 retirés.
- `frontend/src/styles/__tests__/base-layer.test.ts` — 2 tests `.timeline-preview` (layer + contrôle négatif) et constantes `LANDING`/`DOCUMENT_FIXTURE`/`PREVIEW_FIXTURE` retirés ; docblock cas n°2 marqué soldé.
- `frontend/e2e/sprint-77-theme-visual.spec.ts` — commentaire DÉTERMINISME réécrit (piste 52 s annulée par `animations:'disabled'`).
- `frontend/e2e/landing-mobile-overflow.spec.ts` — **hors liste du briefing, nécessaire** : balayage borné par les ancêtres rognants + 2e sonde d'auto-contrôle (cf. Décisions).

## Décisions et écarts de maquette
- **Réutilisé du DS** : `.mt-evt` + `.mt-evt--preview` (barre pleine 26 px/rayon 6/600 12px/ombre sm, sans affordance de clic) ; `.mt-tlv__evt-outside` (libellé de ponctuel en `ink` sur fond de lane) ; `.mt-tlv__today` + `.mt-tlv__today-badge` (trait 2 px + badge accent) ; palette `--evt-*` (#577) ; `contrastInk` + `paletteHex` (`lib/color`, `lib/event-palette`, modules sans dépendance).
- **Non réutilisé** : `Ruler.tsx` (grille de JOURS via `DateStamp`, gouttière %) ; `Cursor.tsx` (`top:-6px`, label au-dessus du trait, position %) ; `EventPill` (`<button>` focusable + drawer, incompatible avec une frise `aria-hidden` sans focusable) ; `.mt-lane*` (bordure 4 côtés, nom 15 px/cat 9 px vs maquette 13/8, trame de jours) → classes `hero-timeline__*` dédiées.
- **Surcharges ciblées** : barres/libellés centrés `top:50%; margin-top:-13px` (DS `top:9px` calibré pour la lane de l'app) ; curseur `z-index:1` (au lieu de `--z-cursor` 20) ; badge `top:6px`, `letter-spacing .12em` (maquette).
- **6e lane** : AC GitHub fait foi. « Passeport · Documents · Renouvellement », barre teal 380/150 (couleur absente des 5 autres, ton « document à renouveler »). Zébrure 2e/4e/6e.
- **Encre des barres** : `contrastInk` (BR-EVE-009, même règle que la frise de l'app) traduit en token de même valeur (`--gray-0` #FFF / `--gray-950` #0B0C0E) → 0 hex dans le DOM, invariant au thème comme `--evt-*`. Écart maquette : rouge, orange, pervenche, teal en encre sombre (maquette : blanc sur rouge/pervenche) — le calcul WCAG donne l'encre sombre supérieure.
- **Orchidée** : token `--evt-orchid` #AE55A6 (DEC-S84-003) au lieu du #B056A8 maquette.
- **Libellé de chrome** : `ink-muted` au lieu de `ink-faint` maquette (2,82:1 < 4,5:1), même écart que #592 ; style dans `hero-timeline.css` (classe `hero-timeline-chrome__label`), pas d'arbitraire Tailwind.
- **i18n** : `common.landing.hero.timeline.{chrome,today,months.*,lanes.<id>.*}`, traductions réelles ×4 (de : « Abos », « Vorrat », « TÜV » ; es : « ITV ») choisies pour tenir dans la gouttière 92 px et les barres — mesuré 0 troncature. Mois en casse naturelle, capitales par CSS. « Renault Clio » passe aussi par i18n (uniformité).
- **Hauteur de lane** : 40 px sous `md` (panneau 320 px : 34 + 6×40 = 274 ≤ viewport 278), 46 px dès `md` (maquette). Toutes les 6 lanes visibles à 320 px (écart bas 4 px).
- **Largeur** : piste fixe 1640 px (maquette) dans un panneau fluide ; `min-w-0` de #610 conservé et suffisant (docOverflow 0 à 320-1280).
- **Easing** : `linear` (maquette `lp-pan 52s linear infinite`) ; `--ease-quart` disparu avec le balayage.
- **Reduced-motion** : `animation:none !important` sur la piste (la garde globale `base.css` impose déjà `animation-duration:0.01ms !important`) ; piste à `translateX(0)`, visuel entier.
- **Gel sous test** : `toHaveScreenshot` `animations:'disabled'` ANNULE une animation infinie → `transform:none`, vérifié (`cancel()` → `none`). `prepare()` non modifié. Références `landing-hero-*` à régénérer (Linux CI).
- **Performance** : 1 seule animation (`hero-timeline-pan`, `transform` seul, `will-change: transform` sur la piste), 104 nœuds, 0 image, 0 JS d'animation, pas de framer-motion, `pointer-events:none`.
- **`landing-mobile-overflow.spec.ts` modifié** : son balayage `rect.right > clientWidth` n'excluait RIEN et assertait `offenders == []` ; toute boucle sans raccord a nécessairement du contenu à droite du panneau rogné (1640 px de piste) → faux rouges garantis à 320-414 px (PIT-S77-002 : `getBoundingClientRect` ignore le rognage). Correctif : bord droit VISIBLE = min(rect.right, right de chaque ancêtre `overflow-x ≠ visible`), remontée arrêtée avant `body` (motif Radix de `sprint-63`). Plus strict que l'exclusion de `sprint-63` (un conteneur rognant trop large reste offender, et son contenu aussi). Armement : 2e sonde (wrapper `overflow:hidden` 9999 px + enfant) exigée dans les offenders.
- **base-layer.test.ts** : contrôle négatif `:477` retiré AVEC le cas `.timeline-preview` (plus aucune règle à layeriser dans `landing.css`, garder un contrôle négatif sans assertion positive ne prouverait rien). Le détecteur `layersOf` reste armé par les contrôles négatifs `.mt-avatar` et scrollbar (même fonction, fixtures inline) — verts.

## Mesures navigateur
Harnais lead :3100 (oracles `/api/auth/me` 401, `/fr/login` 200), Playwright Chromium headless, script `scratchpad/measure.cjs`.
- Animation piste : 1, `hero-timeline-pan`, 52000 ms, `linear`, itérations ∞, keyframes `translateX(0px)` → `translateX(-50%)`. Seule animation infinie de la page.
- Raccord : `currentTime` 0 → `matrix(1,0,0,1,0,0)` ; 26000 → −410 ; 51999.9 → −819.998 ; **52000 → 0 (identique à t=0)** ; 78000 → −410. Piste 1640 px, blocs 820/820, `innerHTML` des 2 copies identique.
- Curseur TODAY : x = 903.36 px à t=0/26 s/52 s/78 s (fixe).
- `cancel()` → `transform: none`.
- Masque : `linear-gradient(90deg, rgba(0,0,0,0), rgb(0,0,0) 7%, rgb(0,0,0) 93%, rgba(0,0,0,0))`.
- Reduced-motion (`reducedMotion:'reduce'`) : 0 animation, `transform:none`, x piste identique à +1,5 s (477→477), hauteur 310, 6 barres visibles, opacité 1.
- Clair/sombre : fond panneau `rgb(255,255,255)`/`rgb(19,21,25)` ; nom `rgb(22,24,29)`/`rgb(236,237,239)` ; cat/mois `rgb(94,98,107)`/`rgb(142,146,153)` ; filet lane `rgb(230,231,235)`/`rgb(32,35,42)` ; TODAY `rgb(14,95,196)`/`rgb(77,155,255)` ; barres identiques dans les 2 thèmes (fond `--evt-*`, encre `rgb(11,12,14)` ou `rgb(255,255,255)`). Captures clair/sombre/reduced 1280 vérifiées à l'œil.
- 4 locales × 320/768/1024/1280 : `scrollWidth − clientWidth = 0` partout ; barres/noms/catégories tronqués : **0** ; libellé chrome non tronqué ; badge TODAY dans le viewport ; viewport 286×278 (320), 734/554/786×378 ; lane 40 px (320) / 46 px (≥ 768).

## Tests
Depuis `frontend/` :
- `rtk proxy npx vitest run src/components/landing src/styles src/__tests__/i18n-namespaces.test.ts` → **17 fichiers, 161 passés / 0 échec** (HeroTimelineAnimation 9, base-layer sans les 2 cas `.timeline-preview`, i18n-namespaces vert).
- `rtk proxy npx tsc --noEmit` → exit 0.
- `rtk proxy npx eslint <7 fichiers TS/TSX touchés>` → exit 0.
- `rtk proxy npm run format:check` → « All matched files use Prettier code style! » (après `prettier --write` de 3 fichiers + locales).
- E2E : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test landing-mobile-overflow sprint-63-de-overflow-audit landing-typography-hierarchy landing-cta-contrast landing-header-logo landing-mobile-menu landing-auth-theme-toggle sprint-62-select-focus-indicator sprint-76-legal-visual sprint-77-theme-visual auth-guard --ignore-snapshots --reporter=line`
  → **163 passés / 1 échec** (3,8 min), oracles avant run : `/api/auth/me` 401, `/fr/login` 200. Même compte que #610 (163/164).
  - `landing-mobile-overflow` : vert (dont auto-contrôle avec la nouvelle 2e sonde) · `sprint-63-de-overflow-audit` : vert · `landing-typography-hierarchy` : vert · `landing-cta-contrast` : vert · `landing-header-logo` : vert · `landing-mobile-menu` : vert · `landing-auth-theme-toggle` : vert · `sprint-62-select-focus-indicator` : vert · `sprint-76-legal-visual` : vert · `auth-guard` : vert.
  - `sprint-77-theme-visual` : captures vertes sous `--ignore-snapshots` ; **1 rouge = `:568` armement**, « Référence absente (…/landing-hero-light-chromium-darwin.png) ». Environnement : aucune référence darwin au dépôt, rouge identique à #610 ; `prepare()` a passé (hero, `h1` muté effectif).
  - Aucun `*-darwin.png` non suivi créé (`git status --untracked-files=all -- frontend/e2e` vide). Aucune référence régénérée.
  - Limite : le compte par spec vient de l'absence de toute autre ligne d'échec dans le rapport `line` (1 seul échec listé), pas d'un décompte par fichier.

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-87/briefing-611.md` — §2 noms réels `Ruler/Cursor/EventPill`, §5 résidus (a)(b)(c), §9 11 specs.
- `docs/memory/sprints/sprint-87/maquette-landing-hero.md` — §3 `.lp-track { width:1640px; animation: lp-pan 52s linear infinite }`, table des lanes, `.today { left: calc(120px + (100% - 120px) * 0.46) }`.
- `docs/memory/sprints/sprint-87/issue-610-done.md` — §Décisions `min-w-0` colonne frise, panneau `h-80`/`md:h-[420px]`.
- Sous-ensemble pit-frontend (prompt) — S77-002 (rognage ignoré par rect → correctif spec), S83-005 (`npm run format:check`), S81-022 (aucun `next dev`/`next build`), S76-005/#610 (`git commit -- <chemins littéraux>`).
- `.ai-env/context-packs/cp-frontend.md` — §i18n l.55 « JAMAIS de strings FR hardcodées », §DS l.64 « Éviter les hex inline ».
- `frontend/src/styles/ds/readme.md` — l.178 `prefers-reduced-motion` (grep ciblé seulement).
- `frontend/src/styles/ds/components/timeline.css` — l.46-54 `.mt-evt`, l.100 `.mt-evt--preview`, l.191-192 `.mt-tlv__today(-badge)`, l.352 `.mt-tlv__evt-outside`.
- `frontend/src/styles/ds/tokens/colors.css` — l.46-57 `--evt-*`, l.7/22 `--gray-0`/`--gray-950`, bloc `.dark` l.137 (ne redéfinit pas `--gray-*`).
- `frontend/src/styles/ds/tokens/base.css` — l.179-186 garde reduced-motion globale `!important`.
- `frontend/e2e/sprint-77-theme-visual.spec.ts` — l.30-60, l.170-240, l.400-618 (`prepare`, armement).
- `frontend/e2e/landing-mobile-overflow.spec.ts` (intégral) ; `sprint-63-de-overflow-audit.spec.ts` l.60-420 (exclusion rognage l.227-261) ; `landing-typography-hierarchy.spec.ts` l.222-281, l.440-480 (seul le max de taille est balayé).

## Signaux mémoire
- `[MEMORY:pitfall] Context: frise en boucle (piste 2× plus large que son panneau overflow:hidden) sur une page couverte par un balayage getBoundingClientRect().right > clientWidth sans exclusion. Solution: borner le bord droit par celui des ancêtres rognants (overflow-x ≠ visible), remontée arrêtée avant body, + sonde d'armement « conteneur rognant trop large ». Prevention: tout contenu défilant/rogné ajouté à une page auditée par rect → vérifier l'algorithme du balayage AVANT le run ; un défilement sans raccord a TOUJOURS du contenu hors panneau.`
- `[MEMORY:pattern] Problem: animation CSS infinie dans une surface couverte par toHaveScreenshot. Solution: animations:'disabled' annule l'animation infinie (état initial) — concevoir l'état initial comme l'état lisible/de référence (ici translateX(0) = 1re copie) et le vérifier par Animation.cancel() → transform none. Anti-pattern: une boucle dont l'état initial est vide ou transitoire.`
- `[MEMORY:pitfall] Context: test vitest jsdom qui relit une feuille CSS via fileURLToPath(new URL(..., import.meta.url)). Solution: join(__dirname, …) — sous jsdom import.meta.url n'est pas file: (TypeError « The URL must be of scheme file ») ; les tests @vitest-environment node n'ont pas le problème. Prevention: copier le motif de base-layer.test.ts uniquement avec son en-tête d'environnement node.`
- `[MEMORY:decision] Context: encre des barres d'illustration sans hex dans le DOM. Decision: contrastInk(paletteHex(role)) traduit en --gray-0/--gray-950 (valeurs identiques à INK_LIGHT/INK_DARK, non redéfinies en sombre). Why: BR-EVE-009 + règle 0 hex, rendu identique clair/sombre comme --evt-*.`

## Recommandations suite
- RECOMMAND_VISUAL_REFS: régénérer `landing-hero-{light,dark}-chromium-linux.png` (sprint-77-theme-visual) dans l'image du runner CI contre un build de prod, `--grep-invert "armement"` puis rejouer sans `--update-snapshots` (PIT-S77-019) — la frise du hero change par construction.
- RECOMMAND_REVIEW: faire valider par la revue la modification de `landing-mobile-overflow.spec.ts` (hors liste du briefing) — algorithme de bord visible + sonde d'armement.
- Pas de RECOMMAND_TEST_RUNNER car les 11 specs du briefing ont été jouées.
- Pas de RECOMMAND_DB_EXPERT car frontend seul, aucun schéma.
- Pas de RECOMMAND_SECURITY car aucune surface auth/données/API.
- Pas de RECOMMAND_FOLLOWUP sur l'encre sombre du rouge/pervenche (écart maquette) car c'est la règle WCAG BR-EVE-009 de la frise de l'app, cohérence voulue.

STATUS: COMPLETED
