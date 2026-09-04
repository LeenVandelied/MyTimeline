## Objectif

Trois finitions frontend indépendantes : débordement de titre produit, lisibilité de la
pastille de couleur sélectionnée, état sidebar icon-only sur tablette.

Milestone **Sprint 73** (#74). Aucune BR métier touchée, aucune migration Flyway.

## Issues traitées

| # | Titre | Size | Commit |
|---|---|---|---|
| #458 | Titre produit sans `break-words` déborde sur mot long | XS | `3d98ce9` |
| #416 | Pastille sélectionnée : glyphe de coche (CategoryDrawer) | S | `1e3143e` |
| #298 | Tablette : sidebar shell repliable (icon-only) | S | `bb6d219` |

Vague unique : les trois en parallèle, fichiers strictement disjoints.

## Changements clés

**#458** — `break-words` seul **ne suffisait pas**. Le `<h1>` est enfant direct d'un
conteneur flex, où `min-width:auto` conserve la taille min-content du mot le plus long et
neutralise `overflow-wrap:break-word`. D'où `min-w-0` en plus — convention déjà présente
13 fois dans le dépôt.

**#416** — Glyphe `<Check>` dont la couleur est calculée depuis la luminance du remplissage
(seuil L > 0,179), avec les tokens de palette **bruts** `--gray-0` / `--gray-900` et non les
alias sémantiques `--color-ink` / `--color-primary-foreground`, qui s'inversent en `.dark` et
feraient disparaître le glyphe en thème sombre. Contraste recalculé par script sur les 12
couleurs réelles : minimum **4,54:1**, aucune sous 3:1.

**#298** — 3ᵉ état de sidebar entre `md` et `lg` via le token dédié
`--sidebar-width-collapsed` (aucune valeur arbitraire `w-[64px]`), et l'invariant #455
maintenu : `hidden md:flex` sur l'`<aside>` ⟺ `md:hidden` sur le bouton flottant.

## Deux constats qui dépassent le périmètre des issues

**1. Un commentaire du code était factuellement faux.** `AppShell.tsx` affirmait que
`CompactRail` / `MobileDrawer` couvraient 768–1023 px. Vérifié directement : `CompactRail`
se déclenche sur `(orientation:landscape) and (max-height:500px)` — un critère de **hauteur** —
et `MobileDrawer` sur `max-width:767px`. **Aucun des deux n'a jamais couvert cette plage.**
Le report acté en DEC-S40-001 laissait donc un trou, pas le repli qu'il décrivait.
Commentaire corrigé dans ce sprint.

**2. Un défaut confirmé que cette PR introduit et NE corrige PAS.**
`frontend/app/[locale]/(app)/dashboard/page.tsx:112` — `<header ... lg:hidden>` est désormais
peint entre 768 et 1023 **en même temps** que la sidebar icon-only, et ses contrôles (L121,
`hidden md:flex`) y dupliquent LanguageSelector + Réglages + Logout du pied de sidebar.
Le fichier était hors du périmètre autorisé de #298 : signalé plutôt qu'absorbé
silencieusement. Correctif probable `lg:hidden` → `md:hidden`, à arbitrer côté design.

## Tests

- **Unitaire frontend** : 106 fichiers / **1181 passed** / 0 failed
- **E2E Playwright** : **249 passed / 0 failed / 9 skipped** (5 min 12, `exit=0`)
  - Un seul bloc `Running 258 tests using 2 workers` — contrôle anti-pollution
  - 9 skips = `auth-signature.spec.ts` (RS256), préexistants, étrangers au sprint
  - Spécifiquement vertes : `sprint-73-tablet-sidebar` 5/5 (bornes 767/768/1023/1024),
    `settings-breakpoints` 6/6, `sprint-66-mobile-create-event` 3/3, et les deux specs
    non modifiées mais identifiées à risque — `sprint-63-de-overflow-audit` 17/17 et
    `timeline-mobile` 15/15
- `tsc --noEmit` 0 erreur, eslint 0, prettier clean

## Ce que cette PR ne prouve pas

Deux critères d'acceptation restent **argumentés, non observés** :

- **#458** « le titre ne déborde plus » — aucun test ne mesure un débordement ; jsdom ne
  calcule pas de layout. Le test ajouté assert la présence des classes. Le raisonnement CSS
  est solide, mais c'est un raisonnement.
- **#416** « ≥ 3:1 sur 12 couleurs × 2 thèmes » — prouvé sur le **modèle** (calcul de
  luminance), pas sur le **rendu**. Aucune sonde de contraste navigateur.

Un `RECOMMAND_FOLLOWUP` dédié existe pour chacun. Détail dans
`docs/memory/audits/sprint-73-test-coverage.md`.

## Review

Reviewer batch : **0 CRITIQUE / 0 MAJEUR / 2 MINEURS**, les deux résolus dans `c405988`
(documentaires). Le reviewer a vérifié indépendamment que `--gray-0` / `--gray-900` ne sont
jamais redéfinis sous `.dark` — la seule condition qui aurait invalidé tout le raisonnement
de contraste de #416.

## Notes de process

- `/sprint plan 73` n'avait jamais été exécuté : label et milestone existaient, mais sans
  entrée `PLANIFIE` ni mini-plans architect. Triage et matrice faits au démarrage.
- Le worktree pointait sur une branche issue de `main` (sans `docs/`, `scripts/`, CI) ;
  sprint mené sur `sprint/73` créée depuis `origin/dev`.
- Un `INDETERMINE` du `test-runner` (« régression de build sur `sprint/73` ») a été **réfuté
  par reproduction** : `next dev` démarre en 1,25 s et la suite E2E est verte. Cause réelle :
  l'inférence de workspace root en worktree (PIT-S61-007), déjà documentée dans
  `playwright.config.ts`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
