# Arbitrage ui-design — sémantique clavier de la palette en grille 6×2

> Spawné par le lead en clôture (`/sprint end 96`) pour traiter le `RECOMMAND_UI_DESIGN` posé par
> #665 et #702, qui s'étaient tous deux abstenus de trancher.

## Question
Depuis #665 la palette est une grille VISUELLE 6×2, mais la navigation clavier reste LINÉAIRE
(→/↓ = +1, ←/↑ = −1, bouclage, Home/End). Faut-il passer à une sémantique de grille (↓ = +6) ?

## Verdict : A — garder le linéaire

- **Motif normatif** : motif APG `radiogroup` (un seul ordre, flèches équivalentes), déjà cité par
  la JSDoc du composant (`palette-color-picker.tsx:81-86`) et par `ds/a11y-audit.md:153` (même
  famille que les Tabs : flèches seules, pas de grille 2D). Ce n'est pas une simplification, c'est
  le comportement normatif du rôle.
- **Cohérence interne** : la seule grille 2D du produit est la frise (`TimelineView.tsx`,
  `ds/a11y-audit.md:55-78`) — rôle `button` / widget « grid » APG, pas un `radiogroup`. Aucun
  `radiogroup` du produit ne navigue en 2D : le linéaire ne contredit rien.
- **Impact tests** : aucun. `sprint-84-palette.spec.ts` n'asserte que `ArrowRight` sur deux
  pastilles de la même ligne ; aucune assertion `ArrowDown`/`ArrowUp` n'existe dans la suite.

## Suite
Aucune issue à ouvrir.

**Correction du lead sur le rapport** : l'agent écrit que « #702 est déjà le follow-up désigné » si
le produit veut explorer B un jour. C'est inexact — #702 était le flake E2E de la flèche droite,
résolu et fermé par ce sprint. Si l'option B redevient un sujet, elle demandera une issue neuve.
Le verdict A, lui, ne dépend pas de ce point.

## Non vérifié (déclaré par l'agent)
Recherche limitée aux motifs textuels `radiogroup`/`grid` ; aucun autre composant de choix en
grille (sélecteur d'icône, d'emoji) cherché hors de ces motifs.
