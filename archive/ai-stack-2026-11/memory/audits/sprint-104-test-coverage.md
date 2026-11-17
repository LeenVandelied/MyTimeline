# Audit tests — Sprint 104

> Landing : navigation collante, conteneur 1340 px, CTA du hero. Généré en fin de Phase 6
> (lead). Aucune règle métier touchée (landing hors domaine) : la grille ci-dessous porte
> sur les critères d'acceptation des issues, pas sur des BR.

## Couverture par issue

| Issue | Critère | Cross-system flow | Vitest | E2E parcours | Contrôle négatif |
|-------|---------|:---:|:---:|:---:|:---:|
| #616 | Landing ≤ 1340 px, valeur issue d'un token, 0 impact hors landing | NON | ✅ (sections landing) | ✅ `sprint-104-landing-container` (1920/1280/375 + `/fr/privacy`) | ✅ token à 1536 → rouge ; hero remis sur `container` → 4 rouges |
| #614 | Nav visible au défilement (1280 + 375), CTA atteignable, ancres non masquées, hors ligne sous la bannière, mono capitales + filets, fond opaque clair/sombre, texte ×2 | NON | ✅ `HeaderSection.test.tsx` (panneau hors barre) | ✅ `sprint-104-landing-sticky-nav` | ✅ sticky, scroll-padding, décalage hors ligne, `mt-nav-label`, filets, fond, hauteur figée → rouges |
| #793 | Ancres du burger ciblées par testid dérivé, compte de lectures identique (16/16) | NON | ✅ `HeaderSection.test.tsx` | ✅ `landing-mobile-menu`, `support/contrast.ts` | ✅ testid retiré → 4 rouges E2E + 1 Vitest |
| #682 | CTA du hero sur 1 ligne de 1024 à 1279 px, 4 locales ; métrique `lg` du DS à source unique | NON | ✅ `HeroSection.test.tsx` (structure `cta-lg`) | ✅ `sprint-104-hero-cta-single-line` (22 tests) | ✅ anciennes classes → 4/4 locales rouges à 1024 ; `cta-lg` / `&:is` retirés → rouges |
| #425 | `leading-tight` inerte retiré du h2 du bandeau final, rendu identique | NON | ✅ `CtaSection.test.tsx` | ✅ interligne mesuré avant/après (12/12 identiques) | N/A (retrait sans effet, mesuré) |

Aucun flux multi-systèmes : pas d'E2E métier requis.

## Tests créés

- `frontend/e2e/sprint-104-landing-container.spec.ts` (#616)
- `frontend/e2e/sprint-104-landing-sticky-nav.spec.ts` (#614)
- `frontend/e2e/sprint-104-hero-cta-single-line.spec.ts` (#682)
- `frontend/src/components/landing/landing-nav.ts` : source d'ancres partagée composant ↔ Playwright (#793)
- Cas ajoutés : `HeaderSection.test.tsx`, `HeroSection.test.tsx`, `landing-mobile-menu.spec.ts`
- Références `landing-hero-{light,dark}-chromium-linux.png` régénérées dans l'image
  `mcr.microsoft.com/playwright:v1.61.1-noble` (celle du runner), contre `next start`

## Résultats des runs (lead, HEAD `8c8e7023` puis `04b3c120`)

- Vitest : 157 fichiers, 2006/2006 verts (avant correctifs de review). Après correctifs, les agents
  ont rejoué les fichiers landing : 61/61 et 176/176.
- `next build`, `tsc --noEmit`, `npm run lint`, `npm run format:check` : verts.
- E2E, suite complète contre `next build` + `next start`, base recréée à neuf : **555 verts,
  8 sautés, 2 rouges hors sprint** :
  - `sprint-101-fab-landscape:271` : rouge avant ce sprint (#769), surface authentifiée non touchée ;
  - `sprint-77-theme-visual:620` (armement) : échoue mécaniquement sur darwin (références linux).
- `sprint-77-theme-visual` dans l'image noble : 11/11, trois fois de suite, armement compris.
- `sprint-63-de-overflow-audit` : 2 rouges vus par un agent au rejeu groupé sous `next dev` ;
  verte dans les deux suites complètes du lead.

## Non vérifié

- Safari et Firefox (`:has()` sur `:root`/`html`), lecteur d'écran réel.
- Débordement en largeur du header quand le texte est doublé (375 px, et 1024 px en `de`) :
  défaut antérieur au sprint, proposé en suite.

## Conclusion

Prêt pour PR.
