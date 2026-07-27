## Dépendances intra-sprint

- Vague 1 : tu tournes **en parallèle** de l'issue #315 (`EventEditForm.tsx` + `events/NewEventDrawer.tsx`).
- **NE PAS toucher** ces fichiers (réservés à #315) :
  - `frontend/src/components/EventEditForm.tsx`
  - `frontend/src/components/events/NewEventDrawer.tsx`
  - `frontend/src/components/timeline/Ruler.tsx`, `Cursor.tsx`, `EventBar.tsx`, `index.ts`
- **Tu bloques la vague 2** : l'issue #309 touche `TimelineEditHost.tsx`, qui monte `EventDrawer`.
  Ne modifie PAS `TimelineEditHost.tsx` ni `TimelineResponsive.tsx` ni `TimelineActionSheet.tsx`.
- Si `useFocusTrap.ts` doit évoluer (signature/API), c'est un fichier consommé par **12 autres composants** :
  changement additif rétro-compatible uniquement, et signale-le explicitement dans ton retour.

## Designer

Non applicable — refactor sans impact visuel. Aucune classe CSS ni token à modifier.
Si un changement de rendu apparaît, c'est une régression : corrige-la.

## Contraintes

- Branche cible : `sprint/46` (déjà checkout dans le worktree — ne pas changer de branche)
- Commit : **1 commit logique**, message gitmoji en français
- `git add` **ciblé sur tes fichiers uniquement** — JAMAIS `git add -A` / `git add .` :
  un autre subagent commite en parallèle dans le même working tree
- Tests inline OBLIGATOIRES : `./scripts/test-quiet.sh` (scope frontend). Les tests existants
  d'`EventDrawer` doivent rester verts — c'est le critère de non-régression n°1.
- Si volume tests > 500 OU temps > 3 min : retourner `RECOMMAND_TEST_RUNNER`
- Code en anglais, docs/commentaires en français (convention projet)
- Vérifie la parité a11y : focus initial, boucle Tab/Shift+Tab, Échap, restauration du focus
  sur le déclencheur au démontage. Un test RTL par comportement si absent.

## Livrable attendu (format strict, MAX 500 tokens, style caveman)

```
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchées + fichiers clés + pitfalls + tests>
- parite a11y: <focus initial / Tab loop / Echap / restauration — OK ou écart>
- [MEMORY:*] signaux: <liste si applicable>
- recommandations suite: <RECOMMAND_* ou pitfall subtil, ou "aucune">
- STATUS: COMPLETED   <- dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```
