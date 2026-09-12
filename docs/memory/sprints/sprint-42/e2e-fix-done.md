# Sprint 42 — Fix E2E `sprint-42-events.spec.ts`

- commit: e54b5ea06085f9f87d2094af7a3dc663abdb7bfd (branche sprint/42)

## fix 1 (diff-row, ~l.139)
- cause: `data-testid="conflict-dialog-diff-row"` + `data-field` sur le MÊME `<li>`
  (ConflictDialog.tsx l.168-169). `filter({has:[data-field="title"]})` cherche un
  DESCENDANT → 0 match.
- nouveau locator: `pageB.locator('[data-testid="conflict-dialog-diff-row"][data-field="title"]')`
  puis `.getByTestId('conflict-dialog-diff-local')`.
- clé de champ confirmée: `title` (DIFF_FIELDS l.69, `f.key='title'` → `data-field="title"`). OK.
- diff-server: span sœur dans la MÊME row, pas de sélecteur séparé. Non touché.

## fix 2 (toggle archived, ~l.243)
- cause: `<input>` porte le testid mais masqué par DS: `.mt-switch input{position:absolute;
  opacity:0; width:0; height:0}` (core.css l.120) → non actionnable, click timeout 30s.
- nouvelle cible de clic: `toggle.locator('xpath=ancestor::label[1]').click()` (label parent = surface visible).
- assertion d'état conservée sur l'input: `expect(toggle).toBeChecked()`.

## autres occurrences corrigées
- non. Balayage complet: aucun autre `filter({has:[data-field]})`; keep-mine / take-server /
  event-drawer-edit / submit ciblent de vrais `<Button>` (pas d'input masqué). Seul le toggle
  archived utilisait `<Switch>`.

## classification finale
- test-bug confirmé (app OK). testids/code applicatif INCHANGÉS. `git add` ciblé sur la seule spec.
- typecheck `tsc --noEmit`: 0 erreur sur la spec. E2E non exécutable en local (stack down) → validation CI.

STATUS: COMPLETED
