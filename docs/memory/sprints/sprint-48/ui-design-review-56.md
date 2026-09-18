# Revue ui-design — animation de frise hero (issue #56)

> Traitement du signal **`RECOMMAND_UI_DESIGN`** émis par le fullstack-dev de #56.
> Spawné par le lead en Phase 1 de `/sprint end 48` (le check de complétude bloquait dessus).
> ⚠ **Arbitrage a posteriori** : le code était déjà écrit, testé et poussé (`48b9e01`, PR #333 verte).

## Verdict : APPROUVÉ SOUS RÉSERVE — rien de bloquant avant merge

L'animation (`HeroTimelineAnimation.tsx` + `hero-timeline.css`) est **conforme à la charte Graphite**.
Les 2 écarts relevés sont des follow-ups légers, pas des défauts de rendu.

## Points validés (lus dans le code par le reviewer)

- **Tokens couleur** — `bg-rule` / `bg-accent` / `bg-surface` / `border-rule-emphasis` tous mappés sur
  `--color-*` (`globals.css:41-58`) → clair/sombre automatiques, **zéro hex** (un test dédié le vérifie,
  `HeroTimelineAnimation.test.tsx:39-43`).
- **Règle de l'accent respectée** — un seul jalon `bg-accent` (« aujourd'hui », index 3/5) + la progression ;
  tout le reste est neutre. Conforme à `ds/readme.md:66` (« accent réservé *today/active* »).
- **Bon tier de bordure** — `border-rule-emphasis` (`--gray-450`, livré par #293) est le tier correct pour un
  jalon dont le contour **est** l'affordance visuelle (point creux) ; `rule`/`rule-strong` (décoratifs, <3:1)
  auraient été faux. Cohérent avec `ds/a11y-audit.md` §6.
- **`aria-hidden="true"` justifié** — les points sont abstraits, sans date ni label : aucune donnée exclusive.
  Précédent explicite dans `a11y-audit.md:102`. **À ne pas confondre** avec le cas ❌ de la vue Timeline
  (où les barres *sont* la donnée).
- **`prefers-reduced-motion` correctement traité** (`hero-timeline.css:63-74`) — vrai geste de repli
  (`scaleX(0.62)` figé + marqueur « aujourd'hui » opaque), **pas** un simple `animation: none` qui aurait laissé
  le rail accentué à 100 % et créé un faux-sens.
- **CSS pur plutôt que `framer-motion`** — défendable : la dépendance est déclarée mais **importée nulle part**
  ailleurs dans `app/`/`src/` (grep confirmé) ; l'introduire pour 3 keyframes décoratives serait le premier
  coût framer-motion du bundle client.

## Écarts → follow-ups (non bloquants)

1. **Easing hardcodé** — `hero-timeline.css:22` utilise `cubic-bezier(0.4, 0, 0.2, 1)` alors que le DS expose
   **`--ease-quart`** (`ds/tokens/spacing.css:39`, `readme.md:99` « no bounce, Linear/Vercel feel »).
   Même symptôme que le hardcode couleur que le composant évite pourtant partout ailleurs.
   Fix : `animation-timing-function: var(--ease-quart)`. Visuellement proche, aucune rupture perceptible.
2. **`hero-timeline.css` importé dans le root layout** (`app/layout.tsx:5`) alors que le composant est scoped
   à la landing. Poids négligeable (74 lignes), mais l'import devrait suivre le scope.

## Contrôle visuel — réalisé par le lead après cette revue

Le reviewer signalait que le contraste `bg-surface` + `border-rule-emphasis` en **sombre** reposait sur un calcul
token-vs-token (4.49:1) sans confirmation de rendu, et recommandait une capture avant clôture du sprint.

**→ Fait.** Voir `visual-check-56.md` dans ce répertoire : landing rendue en clair ET en sombre dans un
navigateur réel, frise hero et jalons constatés lisibles dans les deux thèmes.

## Traitement du signal

`RECOMMAND_UI_DESIGN` — **TRAITÉ**. Verdict APPROUVÉ SOUS RÉSERVE, aucune correction exigée avant merge.
Les 2 écarts motion partent en follow-up (triage Phase 4).
