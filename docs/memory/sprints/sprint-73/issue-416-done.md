# Issue #416 — [FEATURE] Pastille de couleur sélectionnée : glyphe de coche (CategoryDrawer)

**Sprint :** 73 | **Taille :** S | **Modèle :** opus | **Epic :** epic:design

## Commits
- `1e3143e`

## Résumé
- `frontend/src/lib/color.ts` — ajout de `swatchGlyphInk` / `swatchGlyphInkVar` +
  constantes `SWATCH_GLYPH_LIGHT|DARK|THRESHOLD`. **Réutilise** `relativeLuminance` et
  `HEX_RE` déjà présents (pas de nouveau fichier utilitaire créé).
- `frontend/src/lib/color.test.ts` — +5 tests
- `frontend/src/components/categories/CategoryDrawer.tsx` — `<Check>` (`lucide-react`,
  `size-4`, `aria-hidden`) rendu conditionnellement, couleur via
  `style={{ color: 'var(--gray-N)' }}` ; `flex items-center justify-center` ajouté.
  `size-7`, `border-foreground` / `border-rule` et `aria-checked` **inchangés**.
- `frontend/src/components/categories/CategoryDrawer.test.tsx` — +4 tests

Stratégie (a) du designer appliquée : seuil L > 0,179 → `var(--gray-900)`, sinon
`var(--gray-0)`. Style inline retenu plutôt qu'une arbitrary value Tailwind (le designer
signalait que sa compilation en Tailwind v4 n'était pas vérifiée — contournée, pas testée).

## Tests
- `./scripts/test-quiet.sh frontend` : 106 fichiers / **1178** tests verts
  (baseline 1169 + 9 nouveaux)
- `tsc --noEmit` : 0 erreur
- `next lint` sur les 2 fichiers source : 0 warning

## Table de contraste — recalculée par script sur `CATEGORY_SWATCHES` réel
Conforme au designer, 12/12 identiques, aucun écart d'hex.
rouge #E5484D sombre 4.54 | orange #E5691E sombre 5.39 | ambre #F2A900 sombre 8.84 |
citron #A7B83A sombre 8.08 | vert #46A758 sombre 5.86 | teal #12A594 sombre 5.78 |
cyan #0091C2 sombre 4.93 | bleu #3E63DD clair 5.21 | violet #6E56CF clair 5.39 |
magenta #AB4ABA clair 4.75 | rose #E93D82 sombre 4.61 | gris #8B8D98 sombre 5.38
**Minimum 4.54:1.** Aucune cellule < 3:1.

## Écart de doctrine signalé (non bloquant)
0,179 n'est PAS le point d'égalisation des deux encres **réelles** : avec
`--gray-900` = #16181D (L = 0,00913), il vaut ≈ **0,1992**. Entre 0,179 et 0,1992, le seuil
choisit l'encre sombre alors que la claire contrasterait mieux.
Aucune des 12 couleurs n'est dans cette bande (magenta 0,1710 ; rouge 0,2183) et le pire cas
hypothétique y resterait ~4,0:1. Documenté dans le code + **test qui rougit si un hex entre
dans la bande**.

## Non vérifié (déclaré par le subagent)
- Rendu navigateur réel : aucun E2E ajouté, aucun screenshot.
- État `disabled` + `selected` combiné : non vérifié visuellement (jsdom seulement ;
  `opacity-50` s'applique au bouton donc au glyphe).
- Compilation d'une arbitrary value Tailwind : NON testée (contournée par le style inline).
- E2E `frontend/e2e/categories.spec.ts:59` (`category-swatch-#3E63DD`) non exécutée —
  inspection statique seule : le `<svg>` enfant n'intercepte pas le clic Playwright,
  aucun testid ajouté.

## Écart au briefing (déclaré)
NON lus : `br-categories.md`, `coverage-categories.md`, `.claude/rules-jit/frontend.md`,
`ux-patterns.md`, `ds/a11y-audit.md`, `ds/readme.md`.

> **Correction du lead (post-review) :** `.claude/rules-jit/frontend.md` n'existe PAS dans
> ce dépôt — seul `ux-patterns.md` est présent sous `.claude/rules-jit/`. Le briefing
> pointait un chemin fantôme (repris tel quel de la liste générique du skill, sans
> vérification). Cette partie de l'« écart » est imputable au briefing, pas au subagent.

## Signaux mémoire
`[MEMORY:pitfall]` — Encre calculée sur un fond peint en hex **inline** : n'utiliser que des
tokens de PALETTE bruts (`--gray-0` / `--gray-900`), jamais les alias sémantiques
`--color-ink` / `--color-primary-foreground` qui s'inversent dans `.dark` — sinon le glyphe
disparaît en thème sombre. **Prévention :** verrouiller par test que le bloc
`[data-theme="dark"]` ne redéfinit AUCUN des tokens de palette utilisés.

`[MEMORY:pattern]` — Annoncer un seuil de bascule noir/blanc : le point d'égalisation dépend
des encres RÉELLES (0,179 pour noir pur, 0,1992 pour #16181D). Recalculer avec les constantes
du dépôt (cf. PIT-S61-004) et tester que la bande d'écart reste vide.

## Recommandations suite
`RECOMMAND_FOLLOWUP` — sonde E2E de contraste rendu sur le glyphe (réutiliser
`frontend/e2e/support/contrast.ts`) : seule preuve du critère « ≥ 3:1 » au navigateur ;
le calcul pur ne couvre que le modèle.
Triage estimé : XS | Domaine : categories.

STATUS: COMPLETED
