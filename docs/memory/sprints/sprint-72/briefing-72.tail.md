## Dependances intra-sprint
Aucune. L'issue #142 tourne en parallele sur `backend/**` et sur le seul fichier
frontend `frontend/src/services/authService.ts`.

## Fichiers a NE PAS toucher (appartiennent a #142, en cours en parallele)
- `backend/**` (tout)
- `frontend/src/services/authService.ts`

## Designer
Les classes que tu appliques viennent du Design System deja livre
(`frontend/src/styles/ds/components/i18n.css`). Tu n'inventes aucun style :
si un besoin visuel n'est pas couvert par une classe DS existante, remonte-le en
follow-up au lieu d'ecrire du CSS ad-hoc.
**Ne modifie pas `i18n.css`** — il est livre et hors perimetre.

## Contraintes
- Branche cible : `claude/sprint-start-72-320b8d` (deja checkout, ne pas en changer).
- Commit : 1 commit logique, message gitmoji en francais.
- `git add` CIBLE sur tes fichiers. **JAMAIS `git add -A` ni `git add .`** — un autre
  agent commite en parallele dans le meme working tree.
- Tests : `./scripts/test-quiet.sh` (scope frontend) — obligatoire, et rapporte les
  chiffres reels (passed/failed), pas une impression.
- Aucune modification de `package.json` / `package-lock.json` attendue.

## Honnetete du rapport
Si tu n'as pas execute les tests, dis-le. Si une partie du scope n'est pas livree,
dis-le en clair plutot que de la resumer comme faite. Un « STATUS: PARTIAL » exact
vaut mieux qu'un « COMPLETED » approximatif. Enumere explicitement les points de rendu
que tu as DECIDE de ne pas changer, avec la raison.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: objectif + fichiers cles + points de rendu changes / ecartes (avec raison)
  + resultats de tests chiffres
- [MEMORY:*] signaux: (pitfall / bug / pattern / decision) si applicables
- recommandations suite: RECOMMAND_* ou RECOMMAND_FOLLOWUP: <desc> [triage | domaine]
- STATUS: COMPLETED en derniere ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
