# #757 — Croix des dialogues lisible sur contenu défilé — DONE

Commit : `1762df30` (`:bug: fix(ui): croix des dialogues lisible sur contenu défilé, contraste mesuré clair et sombre (#757)`). Le CSS de la croix est entré au commit #754 `3db3c867` (spéc commune de l'arbitrage, la croix y était agrandie) ; ce commit = preuve E2E + JSDoc + garde Vitest, cas prévu par le briefing.

## Résumé

- Solution arbitrée (ui-design S101, « fond » plutôt que « bande d'en-tête ») : fond OPAQUE `bg-background` en disque `rounded-full`, `shadow-xs`, encre `text-muted-foreground` à pleine opacité ; survol = surface seule (`hover:bg-accent-soft`), jamais l'encre (PIT-S49-001). Retirés : l'opacité réduite (70 %, pleine au survol) qui rendait aussi le fond translucide, l'arrondi `xs`, le fond/encre conditionnés à l'état « ouvert » de Radix (no-op permanent).
- Preuve : `e2e/sprint-101-dialog-close-contrast.spec.ts`, sheet produit 390×600 défilée au maximum, clair ET sombre, repos ET survol.
- JSDoc `ui/dialog.tsx` : boîte qui grandit vers la gauche et le bas (coin haut-droit ancré, bords haut/droit à 16 px), retrait de l'opacité réduite, valeurs de contraste mesurées. Classes retirées décrites en prose (PIT-S48-002).

## Fichiers

- `frontend/e2e/sprint-101-dialog-close-contrast.spec.ts` (nouveau)
- `frontend/src/components/ui/dialog.tsx` (JSDoc ; CSS au commit #754)
- `frontend/src/components/ui/dialog.test.tsx` (+2 tests : aucune opacité réduite, survol sans encre)

## Mesures

Sheet produit 390×600, `scrollTop` au maximum, nœud du formulaire vérifié SOUS la croix (`elementsFromPoint`) :

| Thème / état | Encre (stroke svg) | Fond calculé (alpha) | Anneau PEINT (pixels, unanimité) | Contraste |
|---|---|---|---|---|
| clair / repos | #5e626b | #fcfcfd (1) | #fcfcfd (1,00) | 5,96:1 |
| clair / survol | #5e626b | #dbe9fc (1) | #dbe9fc (1,00) | 4,97:1 |
| sombre / repos | #8e9299 | #0b0c0e (1) | #0b0c0e (1,00) | 6,26:1 |
| sombre / survol | #8e9299 | #16263a (1) | #16263a (1,00) | 4,90:1 |

Opacité effective (croix + ancêtres) = 1 partout. Valeurs repos = prévisions de l'arbitrage (5,96 / 6,27 calculé, 6,26 mesuré).
Contrôle négatif (dialog.tsx de 449ad984, restauré temporairement puis remis) : fond alpha 0, opacité effective 0,7 au repos, croix 16 px (pas d'anneau) → rouge dans les 2 thèmes ; géométrie à défilement nul verte.
Géométrie à défilement nul (prémisses `scrollTop = scrollLeft = 0`, `scrollWidth <= clientWidth` vérifiées) : bord haut = sheet.y + 16, bord droit à 16 px (±2) — inchangée.

## Tests

- Vitest : 154 fichiers / 1975 tests verts ; `src/components/ui/dialog.test.tsx` 6/6. `tsc`, `next lint --file`, `prettier --check` OK.
- E2E (next dev :3000, oracles 401/200 vérifiés) : `sprint-101-dialog-close-contrast` 2/2 (clair, sombre) ; `sprint-95-toast-overlap` VERT ; `sprint-100-dialog-close-reachable` VERT ; `sprint-101-touch-targets` VERT (20 passed, setup compris, sur le code final).
- Les 36 specs du rejeu #754 ont tourné avec le CSS final de la croix (seul le JSDoc a changé depuis) : cf. `issue-754-done.md` (seuls rouges : `sprint-90-first-contact` ×4, pré-existants par A/B).

## Écarts d'énoncé

1. Le CSS de la croix est dans le commit #754 (agrandissement et fond forment UNE classe, spéc commune de l'arbitrage) ; le commit #757 ne porte que preuve, JSDoc et garde Vitest.
2. Mesure de l'encre sur le style calculé du `svg` (`stroke = currentColor`), pas en pixels : un trait de 2 px d'une icône de 16 px est anticrénelé à dpr 1. Le FOND, lui, est lu aussi en pixels (anneau entre icône et bord du disque).
3. Seule la sheet produit est mesurée en contraste ; les autres consommateurs de `DialogContent` partagent la même classe (garde Vitest) et leur croix est mesurée en taille par `sprint-101-touch-targets` (7 dialogues).

## Signaux mémoire

- [MEMORY:pattern] Problem: prouver le contraste d'un contrôle posé sur un contenu qui défile (sticky), dont le fond « réel » change avec le défilement. Solution: rendre le fond du contrôle OPAQUE et prouver les 3 prémisses — un nœud défilé est bien SOUS le contrôle (`elementsFromPoint`), le fond calculé a alpha 1 et l'opacité effective (contrôle + ancêtres) vaut 1, les pixels peints de la zone de fond égalent ce fond — puis mesurer encre/fond au repos ET au survol. Anti-pattern: mesurer le contraste contre le fond de l'ancêtre (`readStable`) sans vérifier l'alpha, ou mesurer à défilement nul. Exemple : `e2e/sprint-101-dialog-close-contrast.spec.ts`.

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête.
- Pas de RECOMMAND_SECURITY : CSS et specs seulement.
- Pas de RECOMMAND_TEST_RUNNER : specs rejouées en direct, contrôle négatif joué.
- Pas de RECOMMAND_UI_DESIGN : spéc de l'arbitrage appliquée telle quelle, contrastes mesurés conformes aux prévisions.

fichiers de contexte lus: docs/memory/sprints/sprint-101/arbitrage-ui-design-754-757.md → « clair `#5E626B` / `#FCFCFD` → **5.96:1** » ; docs/memory/sprints/sprint-101/briefing-B-754-757.md → « asserte aussi que le fond de la croix est OPAQUE (alpha = 1) » ; frontend/e2e/sprint-100-dialog-close-reachable.spec.ts → l.40 « `top-4` / `right-4` de la croix » ; frontend/e2e/support/pixel.ts → `readStrip` « offsetPx: 3, edgeGuardPx: 12 »

STATUS: COMPLETED
