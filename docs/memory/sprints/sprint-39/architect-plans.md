# Mini-plans architect — Sprint 39 (Lisibilité Landing)

> Généré par /ai-env:sprint plan 5 (2026-07-13). Lu par /sprint start Phase 4.1.
> Cohésion 0.30 | epic dominant: design | migrations: aucune.

```yaml
issue_0056:
  scope: slice-contraste-hero UNIQUEMENT (pas toute la L — reste au backlog)
  reste_backlog: décomposition complète 8 sections, animation timeline horizontale, footer→pages légales, dédup routes /[locale] vs /[locale]/home
  fichiers_cles:
    - frontend/src/components/pages/HomePage.tsx        # monolithe ~279 l., source
    - frontend/src/components/landing/HeroSection.tsx   # à créer (extraction hero)
    - "@theme Tailwind / globals.css"                   # tokens Graphite couleurs hero
  couches_touchees: [frontend]
  strategie_test:
    - "RTL: HeroSection rend en clair ET sombre sans couleur hardcodée"
    - "visuel manuel navigateur: contraste hero WCAG AA (>=4.5:1 texte)"
  risque_regression: MOYEN — HomePage monolithe, extraction partielle peut casser layout sections voisines; isoler HeroSection, ne pas toucher les 7 autres blocs ce sprint
  ordre_ecriture: [extraire HeroSection, brancher tokens clair/sombre, corriger contraste, test RTL]
  zod_dto_sync: NON (page marketing, hors domaine)
  possibly_done: false
  note: vérifier présence framer-motion dans package.json avant toute anim (anim hors slice de toute façon)

issue_0146:
  fichiers_cles: [écrans login/register/forgot-password/reset-password frontend (à localiser)]
  couches_touchees: [frontend]
  strategie_test: revue visuelle Chrome clair+sombre, consigner écarts, corriger mineur
  risque_regression: FAIBLE
  possibly_done: false
```
