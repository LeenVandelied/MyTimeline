# Issue #739 — Poignée du BottomSheet des réglages mobiles à 28 px

**Livré par le lead** (documentation seule, décision du dev « Exception + doc », DEC-S99-002). Aucun fullstack-dev.
Commit : `718b418e` `:memo: docs(a11y): poignée des bottom sheets exemptée du seuil 44 px par WCAG 2.5.8 (#739)`.

## Résumé
- Arbitrage ui-design (`ui-design-738-739.md`, Q2) : exception WCAG 2.5.8 « Equivalent » applicable — le bouton croix 44×44
  (`BottomSheet.tsx`, `h-11 w-11` ; `.mt-sheet__close` 44×44) et `Escape` ferment le même panneau ; 2.5.7 satisfait par le même bouton.
- Décision étendue à la poignée de la frise (`.mt-sheet__grabber-zone`, `timeline.css`), même couple bouton + Escape.
- `a11y-audit.md` : la ligne « `✕` et grabber → zone 44×44 » contredisait le code ; remplacée par l'exemption documentée et sa CONDITION
  (croix ≥ 44×44 ET Escape câblé). Ligne de tableau « Bottom sheet (mobile) » complétée.
- Commentaire de condition posé à côté des deux poignées (`BottomSheet.tsx`, `timeline.css`).

## Critères d'acceptation
- [x] Décision documentée : l'exception s'applique, poignée laissée à 28 px.
- [x] (sans objet — pas d'agrandissement)

## Tests
- Aucun changement de rendu (commentaires + Markdown). `prettier --check` vert sur les 3 fichiers.
- Non vérifié : aucun garde-fou automatisé ne verrouille la condition (croix ≥ 44 + Escape). La croix est déjà mesurée par
  `settings-mobile.spec.ts` (#633) ; Escape est couvert par `BottomSheet.test.tsx`.

## Signaux mémoire
- [MEMORY:decision] DEC-S99-002 — poignées de bottom sheet exemptées du seuil 44 px par WCAG 2.5.8 « Equivalent », conditionnées à croix 44×44 + Escape.

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun fichier backend ni SQL.
- Pas de RECOMMAND_SECURITY : documentation seule.
- Pas de RECOMMAND_TEST_RUNNER : aucun rendu modifié.
- Pas de RECOMMAND_UI_DESIGN : l'arbitrage ui-design a précédé la décision.

fichiers de contexte lus: ds/a11y-audit.md l.68-80, 95-115, 145-152 ; BottomSheet.tsx l.14-26, 150-185 ; timeline.css l.850-862

STATUS: COMPLETED
