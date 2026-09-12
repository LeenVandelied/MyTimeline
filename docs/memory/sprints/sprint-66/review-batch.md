# Review batch — Sprint 66 (reviewer, 2026-09-03, HEAD `aaf85e2`)

Diff relu : `origin/dev..HEAD -- frontend/` (commits `a5b18d5` #455, `f24ef96` #79, ~1870 lignes).

## Verdict : PRET_POUR_MERGE — 0 CRITIQUE / 1 MAJEUR (outillage, hors code) / 2 MINEUR

- **[MAJEUR — outillage, pas le diff]** Le reviewer a cherché `review-protocol.md`, `frontend.md`,
  `zod-dto-sync.md`, `e2e-selectors.md` sous `.claude/rules-jit/` et n'y a trouvé que `ux-patterns.md`.
  Lecture du lead : `frontend.md`/`backend.md` vivent sous `.ai-env/rules-jit/` (config `rules_jit_dir`),
  `review-protocol.md` est un fichier du plugin (`~/.claude/plugins/…/rules-jit/`), `zod-dto-sync.md` et
  `e2e-selectors.md` n'existent pas dans ce projet (déjà noté dans `cp-frontend.md`). Aucune action code ;
  à retenir pour le briefing reviewer : pointer explicitement `.ai-env/rules-jit/` et le chemin plugin.
- **[MINEUR]** `NewEventDrawer.tsx` — au 1er rendu, `footerPortalNode` vaut `null` : la rangée d'actions est
  peinte en flux puis portalisée au commit suivant (ref callback). Pas de flash (commit avant peinture),
  mais dépend de cette garantie React ; à surveiller si `EventEditForm` gagne un effet lisant la position DOM
  au montage. Non corrigé (comportement documenté dans le code).
- **[MINEUR]** `useMobileKeyboard.ts` — `compact` est calculé aussi pour `BottomSheet` (Réglages), qui n'a
  pas de mode réduit : `data-compact` y est exposé sans logique associée. Surface d'API un peu large, pas un
  bug. Non corrigé.

## Points vérifiés sains
- `EventEditForm` : churn = ré-indentation (`{!compact && <>…</>}`), pas de refactor caché ; `shouldUnregister`
  jamais activé → `color`/`isRecurring`/`recurrenceUnit` restent dans le payload (BR-EVE-007/009, prouvé par
  test unitaire + E2E) ; chemin sans props strictement identique (testids, ordre, classes).
- Portail : nœud DANS `panelRef` (focus trap couvre), `form={formId}` cohérent, Annuler → `onCancel`.
- Hook : listeners symétriques (`resize`/`scroll`/`window.resize`), rAF annulé au démontage, lecture
  paresseuse de `visualViewport`, `enabled:false` = zéro listener, callbacks uniquement sur transition, refs
  stables, seuils nommés et exportés.
- Sheets : `top`/`maxHeight` inline seulement si `keyboardOpen`, `env(safe-area-inset-bottom)` préservé,
  `data-compact` absent si false, `transition-property: transform` corrige proprement le piège `duration-*`.
- CSS `.mt-sheet__footer` : tokens uniquement (`--space-17`, `--space-4/5`, `--color-rule/surface`).
- FAB `AppShell` : hors `<aside>`, après `<main>`, `lg:hidden`, `type="button"`, `h-13 w-13` = token 52 px
  réel, `z-10 < --z-modal` vérifié, `aria-label` clé i18n existante, un seul état / un seul drawer (testé).
- E2E : testid-only, aucun `waitForTimeout`, assertion serveur, stub `visualViewport` via `addInitScript`
  avant tout script de page, viewport par `test.use`, aucun `test.only`/`fixme`.
- Tests unitaires : additifs uniquement, aucune assertion existante affaiblie. `sprint-62-select-focus-indicator.spec.ts` : commentaire seul.

## Cycle 2
Sans objet : aucune correction de code dispatchée (0 CRITIQUE, 0 MAJEUR sur le diff).
