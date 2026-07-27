## Dépendances intra-sprint (vague 2 — la vague 1 est DÉJÀ livrée sur ta branche)

Tu tournes **seul**. Deux commits sont déjà sur `sprint/46`, lis-les avant de coder :

- `85715b0` — #316 : `EventDrawer.tsx` consomme désormais `useFocusTrap`. **`TimelineView.tsx` a changé** :
  ajout de `closeDrawer = useCallback(() => setSelected(null), [])`, câblé en `onClose={closeDrawer}`
  (pitfall `BUG-S44-001` : `useFocusTrap` a `onEscape` en dépendance d'effet → tout callback passé au hook
  DOIT être stabilisé en `useCallback`, sinon vol de focus).
  → Si tu passes un callback de suppression à un composant qui utilise `useFocusTrap`
  (`TimelineActionSheet` en fait partie), **stabilise-le en `useCallback`**.
- `7c108c0` — #315 : `EventEditForm` / `EventPreviewTimeline` / `Ruler` / `Cursor`. **N'y touche pas.**

Fichiers **interdits** (livrés par la vague 1) : `EventEditForm.tsx`, `events/EventPreviewTimeline.tsx`,
`events/previewTimeline.ts`, `timeline/Ruler.tsx`, `timeline/Cursor.tsx`, `timeline/EventDrawer.tsx`,
`timeline/useFocusTrap.ts`.

## Point d'attention n°1 (issu du plan architect)

`TimelineEditHost.tsx:71` possède **déjà** un `onDelete` pour le chemin desktop (branché sur `EventDrawer`, L125).
**RÉUTILISE ce callback** — n'en crée pas un second. Deux callbacks = divergence d'invalidation de cache
entre desktop et mobile, et c'est exactement le bug que cette issue doit éviter d'introduire.

## Designer

Non applicable — câblage d'une prop déjà exposée, aucune nouvelle surface visuelle.
Si `TimelineActionSheet` doit afficher un état de confirmation, réutilise le pattern desktop existant.

## Contraintes

- Branche cible : `sprint/46` (déjà checkout — ne pas changer de branche)
- Commit : **1 commit logique**, message gitmoji en français
- `git add` **ciblé** — jamais `git add -A` / `git add .` (⚠ `frontend/.eslintcache` est tracké et dirty :
  ne le commit PAS, c'est l'issue #262)
- Tests inline OBLIGATOIRES : `./scripts/test-quiet.sh` (scope frontend). La suite complète est à 589 tests
  après la vague 1 — elle doit rester verte.
- Si volume tests > 500 OU temps > 3 min : retourner `RECOMMAND_TEST_RUNNER`
- Code en anglais, docs/commentaires en français. TS strict. i18n next-intl (aucune chaîne UI en dur).
- **testid stable obligatoire** pour l'action de suppression mobile (critère d'acceptation) — liste-le
  dans ton retour, il sera consommé par #205 en Sprint 47.
- E2E : ne PAS écrire de spec Playwright ici (la couverture du parcours mobile est ramassée par #205 en S47).
  Si tu juges qu'une spec est indispensable, retourne `RECOMMAND_FOLLOWUP` plutôt que de l'écrire.
- Profondeur 1 stricte : tu ne spawnes AUCUN subagent.

## Livrable attendu (format strict, MAX 500 tokens, style caveman)

```
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchées + fichiers clés + pitfalls + tests>
- testid suppression mobile: <valeur exacte — requis pour #205 en S47>
- callback reutilise: <oui/non — quel callback desktop a été réutilisé>
- [MEMORY:*] signaux: <liste si applicable>
- recommandations suite: <RECOMMAND_* ou pitfall subtil, ou "aucune">
- STATUS: COMPLETED   <- dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```
