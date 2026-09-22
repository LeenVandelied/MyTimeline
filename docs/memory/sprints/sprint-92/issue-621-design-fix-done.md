# #621 — Correctif revue Designer : titre display et pause au survol/focus

**Agent :** fullstack-dev (opus, high) · **Spawn ref :** `0ae6ec9` (lancé en parallèle de #605)

## Commit (vérifié par le lead)
- `5c64e01` — :wheelchair: fix(toast): titre en police display et pause au survol/focus (#621, revue Designer)
- `git show --stat` : 3 fichiers, +260/−23 — `ui/toaster.tsx` (90), `ui/toaster.test.tsx` (191), `ds/components/core.css` (2). Posé après `ec7a076` (#605), aucun fichier de #605.

## Résumé
- `.mt-toast__title` : `font-family:var(--font-display)` (jeton next/font, `app/fonts.ts:20`, Archivo). Rendu identique à avant (`--font-ui` pointe sur `--font-display`, `fonts.ts:58`) — la règle est désormais explicite, comme `.mt-dialog__title`.
- Arbitrage dev (pause survol ET focus, sans bouton fermer) : react-hot-toast pausait déjà au survol (`onMouseEnter/Leave` → `startPause/endPause`, `dist/index.mjs:178`) ; c'est notre `pointerEvents:'none'` qui l'empêchait. Seule la carte visible capte le pointeur ; `#_rht_toaster` reste en `none`.
- Focus : carte visible `tabIndex=0`, jamais focalisée automatiquement ; `focusin/focusout` + survol → état aligné sur `pausedAt` (`useToasterStore`) via `useToaster().handlers` ; pause levée si le toast disparaît pendant survol/focus.
- **Conséquence relevée par l'agent (calcul depuis le code)** : carte y ≈ 16–62 px en `top-right` → recouvre `.mt-drawer__close` (y 12–56) et `dashboard-mobile-menu-button` (y 6–50). Soumis au dev → **décaler sous la barre** (correction 1 du cycle de revue, `briefing-review-fixes.md`).
- **Régression E2E annoncée** : `sprint-92-business-toasts.spec.ts:112` asserte `pointerEvents === 'none'` → corrigé dans le même cycle.

## Tests (déclarés par l'agent)
- Vitest fichier 16/16 ; suite 1774/1774 (138 fichiers) ; tsc OK ; `format:check` OK ; `next lint` 0.
- Armement : sans `startPause` → 2 rouges ; sans remise à zéro → 1 rouge ; `none` → 1 rouge ; fichier restauré (`cmp`). Limite : aucun hit-testing en jsdom.

## Fichiers de contexte lus (déclaration de l'agent)
- `issue-621-done.md` en entier ; `a11y-audit.md` l.135-150 ; `pit-frontend.md` par grep ; `cp-frontend.md` §Tests l.72-84 ; §a11y du pack NON LU.

## Non vérifié
- Rendu à l'écran, police calculée, captation réelle du pointeur, lecteur d'écran, Tab/Maj+Tab jusqu'au toast en navigateur réel, barre d'outils de la frise, E2E.

## Signaux mémoire
- [MEMORY:pitfall] « `pointer-events:auto` au `:hover` » est irréalisable : un élément en `none` ne reçoit jamais le survol. react-hot-toast ne gère pas le focus ; la seule API publique de pause est `useToaster().handlers`.
- [MEMORY:decision] Toast : pause pendant survol ou focus (WCAG 2.2.1), carte focusable sans focus automatique, pas de bouton fermer ; position décalée sous la barre des contrôles (arbitrage dev 2026-09-15).

## Recommandations suite
- RECOMMAND_FOLLOWUP : `sprint-92-business-toasts.spec.ts:112` à corriger → absorbé par le cycle de corrections de revue.
- RECOMMAND_UI_DESIGN : recouvrement de la croix des drawers et du hamburger mobile → arbitré par le dev (décalage sous la barre), appliqué dans le cycle de corrections.
- Pas de RECOMMAND_DB_EXPERT car aucun changement de schéma.
- Pas de RECOMMAND_SECURITY car aucune surface sensible touchée.

STATUS: COMPLETED
