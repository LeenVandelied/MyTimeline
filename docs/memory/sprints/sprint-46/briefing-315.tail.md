## Dépendances intra-sprint

- Vague 1 : tu tournes **en parallèle** de l'issue #316 (`frontend/src/components/timeline/EventDrawer.tsx`).
- **NE PAS toucher** ces fichiers (réservés à #316 / #309) :
  - `frontend/src/components/timeline/EventDrawer.tsx`
  - `frontend/src/components/timeline/useFocusTrap.ts`
  - `frontend/src/components/timeline/TimelineEditHost.tsx`
  - `frontend/src/components/timeline/TimelineResponsive.tsx`
  - `frontend/src/components/timeline/TimelineActionSheet.tsx`
- `Ruler.tsx` / `Cursor.tsx` / `EventBar.tsx` : **lecture + réutilisation** attendues. Si une modification
  de ces composants partagés est indispensable, préférer une prop optionnelle additive (défaut = comportement
  actuel) et le signaler dans le retour.
- **Ordonnancement critique** : #315 précède #314 (Sprint 47) — #314 assertera `event-form-preview-recurrence`.
  Les `data-testid` que tu poses sur l'aperçu doivent être **stables et explicites** ; liste-les dans ton retour.

## Designer

Non applicable en pré-implémentation : la spec visuelle fait foi = `docs/design/graphite-handoff.md` §6
(+ §254 et suivants pour les composants frise). Lis-la AVANT de coder. Tokens DS uniquement
(`frontend/src/styles/ds/`), aucune valeur hexadécimale en dur, theme-aware clair + sombre.

## Contraintes

- Branche cible : `sprint/46` (déjà checkout dans le worktree — ne pas changer de branche)
- Commit : **1 commit logique**, message gitmoji en français
- `git add` **ciblé sur tes fichiers uniquement** — JAMAIS `git add -A` / `git add .` :
  d'autres subagents commitent en parallèle dans le même working tree
- Tests inline OBLIGATOIRES : `./scripts/test-quiet.sh` (scope frontend). Si le script échoue,
  fallback documenté dans ton retour.
- Si volume tests > 500 OU temps > 3 min : ne pas insister, retourner `RECOMMAND_TEST_RUNNER`
- Code en anglais, docs/commentaires en français (convention projet)
- TS strict, i18n via next-intl (aucune chaîne UI en dur — passer par les messages)

## Livrable attendu (format strict, MAX 500 tokens, style caveman)

```
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchées + fichiers clés + pitfalls + tests>
- testids poses: <liste des data-testid ajoutés — requis pour #314 en S47>
- [MEMORY:*] signaux: <liste si applicable>
- recommandations suite: <RECOMMAND_* ou pitfall subtil, ou "aucune">
- STATUS: COMPLETED   <- dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```
