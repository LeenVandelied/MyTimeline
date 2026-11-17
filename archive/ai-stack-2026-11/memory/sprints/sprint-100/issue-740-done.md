# #740 — La croix de fermeture des dialogues défile avec leur contenu

## Résumé
Même cause et même correctif que #732 : `DialogContent` (`ui/dialog.tsx`) passe en `flex flex-col` et la croix est ancrée dans une boîte `sticky` de hauteur nulle. Détail complet dans `issue-732-done.md`.

## Tests
- Critère « croix visible et cliquable après défilement maximal, vérifié par E2E » : `e2e/sprint-100-dialog-close-reachable.spec.ts`. Rouge sur l'ancien code, vert après correctif (3/3).
- Critère « `sprint-95-toast-overlap.spec.ts` reste vert » : vert (3 runs OK sur 3), APRÈS réécriture du régime TALL sur arbitrage du dev. Voir `issue-732-done.md` §Arbitrage.
- Commit `0eb0a59a`.

## Écarts d'énoncé
L'énoncé suppose qu'on peut ancrer la croix « sans casser l'invariant de sprint-95 ». Ce n'est pas le cas : cet invariant TALL reposait sur un débordement horizontal latent de 60 px, que tout correctif correct supprime.

## Non vérifié
Voir `issue-732-done.md`.

## Signaux mémoire
Voir `issue-732-done.md`.

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : frontend seul.
- Pas de RECOMMAND_SECURITY : CSS/DOM uniquement.
- Pas de RECOMMAND_TEST_RUNNER : rejoué dans #732.
- Pas de RECOMMAND_UI_DESIGN : arbitré par le dev (option 1)
- RECOMMAND_FOLLOWUP: donner un fond à la croix pour la lisibilité quand le contenu défile dessous [triage XS]

## Arbitrage
Décision B #714 étendue au régime TALL par le dev, 2026-09-21 (voir `issue-732-done.md`).

fichiers de contexte lus: voir issue-732-done.md

STATUS: COMPLETED
