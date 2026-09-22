# Corrections revue + E2E lead — Sprint 86 (done)

## Résumé

Commits (branche `claude/sprint-start-86-9af6ff`, base `566997d` vérifiée) :
- `4b7f83e` C1 — `:lipstick: fix(events): le pied de la feuille de formulaire tient à 320 px (S86)`
- `29f64fa` C2 — `:white_check_mark: test(e2e): l'audit de débordement attend la fin des animations (S86)`
- `f21eef8` C3 — `:bug: fix(events): la coque de formulaire fige la page et rend le fond inerte (revue S86)`

### C1 — pied de sheet à 320 px
- `actionsRow` seulement : en pied (`footerPortalNode`), rang `flex-wrap … gap-2` et groupe `ms-auto flex flex-wrap justify-end gap-2`.
  Le groupe [Annuler][Enregistrer] passe sous [Supprimer], calé à droite ; il ne se casse en deux qu'en dernier recours.
- Ordre DOM inchangé (pas de `*-reverse`) → ordre visuel = ordre de tabulation. Police et libellés intacts.
- Branche en flux (drawer >= lg) : classes historiques strictement identiques.
- `create-form` à 320 px désormais ASSERTÉ (relevé propre 4 locales, 0 offender, 0 troncature). ⚠ Cette assertion
  NE rougit PAS quand on retire C1 (le rang de création [vide][Annuler][Ajouter] tenait déjà) : garde de non-régression,
  pas preuve de C1. La preuve de C1 est `event-form`.

### C2 — mesure pendant l'animation du drawer
- `settle()` attend `document.getAnimations()` → `finished` (animations infinies écartées, borne 5 s), commentaire #618 /
  200 ms. Aucune désactivation d'animation, aucune tolérance, aucune exclusion.

### C3 — coque modale complète (drawer ET sheet)
- `RemoveScroll` (`forwardProps`, ref fusionnée sur le panneau, aucun nœud DOM ajouté, `allowPinchZoom`) + `hideOthers(panel)`
  dans un effet `[open]`.
- Dépendances directes `react-remove-scroll ^2.6.3`, `aria-hidden ^1.2.4` (une seule copie de chaque dans `node_modules`,
  vérifié par `find` → pile de verrous partagée avec Radix Select/AlertDialog).
- Constaté en E2E : `hideOthers` préserve les `[aria-live]` ET leurs ancêtres (comportement de la bibliothèque, identique au
  `Dialog` Radix). La région `aria-live` du zoom (`TimelineView.tsx:1444`) est dans `<main>` → `app-shell` et `<main>` ne
  portent pas `aria-hidden`, leurs autres descendants oui (sidebar, overlay, devtools, annonceur de route). L'oracle E2E
  vise donc la sidebar.
- Préservés, non modifiés : garde Échap `defaultPrevented` (`useFocusTrap.ts`), `useMobileKeyboard` (style inline du panneau
  inchangé), aperçu épinglé hors du corps.

## Fichiers
- `frontend/src/components/EventEditForm.tsx` (`actionsRow` + commentaire) — C1
- `frontend/e2e/sprint-63-de-overflow-audit.spec.ts` (assertion `create-form` 320 → C1 ; `settle()` → C2)
- `frontend/src/components/events/EventFormDrawer.tsx` — C3
- `frontend/src/components/events/EventFormDrawer.test.tsx` (nouveau) — C3
- `frontend/e2e/sprint-86-form-drawer-modal.spec.ts` (nouveau) — C3
- `frontend/package.json`, `frontend/package-lock.json` — C3
- `styles/ds/components/timeline.css` : NON modifié.

Découpe du fichier spec entre C1 et C2 sans `git add -p` : blob construit depuis `HEAD` + le seul hunk C1,
`git hash-object -w` puis `git update-index --cacheinfo`. `git show --stat` vérifié après chaque commit.

## Diff du lockfile
`npm install --package-lock-only --ignore-scripts` → « up to date », 2 insertions, uniquement dans `packages[""].dependencies` :
```
+        "aria-hidden": "^1.2.4",
+        "react-remove-scroll": "^2.6.3",
```
Aucune version résolue modifiée, aucune entrée `node_modules/*` touchée, rien téléchargé.

## Tests
- Oracle avant runs : `:3100/api/auth/me` 401, `/fr/login` 200 ; `next dev` du lead réutilisé (aucun second serveur, aucun build).
- `./scripts/test-quiet.sh frontend-unit` → **129 fichiers / 1537 tests** verts (après C3).
- Ciblé : `EventFormDrawer` + `NewEventDrawer` + `TimelineEditHost` → 3 fichiers / 57 tests verts, sans stderr.
- `npx tsc --noEmit -p .` exit 0 ; `npx eslint` (5 fichiers) exit 0 ;
  `rtk proxy npx prettier --check` (depuis `frontend/`, 6 fichiers dont package.json) conforme.
- `sprint-63` après C1+C2 : `event-form` ×4 + `create-form` ×4 + auto-contrôle → **9/9** (+5 setup), 57 s.
- Suite finale (C1+C2+C3), 2 workers : `sprint-63-de-overflow-audit` (17), `sprint-70-create-preview-pinned` (1),
  `sprint-71-edit-preview-pinned` (3), `sprint-66-mobile-create-event` (3), `sprint-66-mobile-keyboard` (3),
  `sprint-42-events` (3), `sprint-86-event-category` (2), `sprint-86-form-drawer-modal` (1), setup (5)
  → **38 passed / 38** (`--list` : 38 tests, 9 fichiers), 1,5 min. Les 8 cas `event-form`/`create-form` de sprint-63 inclus.
- Incident d'environnement : un run isolé de la spec neuve a expiré au setup `provision del` (inscription > 180 s), test
  non exécuté ; rejoué tel quel → vert (PIT-S72-004).
- Relevé `AUDIT_OUT` à <= 390 px : `event-form` et `create-form`, 4 locales, `scrollWidth == clientWidth`, `maxScrollX` 0,
  0 offender, 0 troncature.

## Contre-épreuves
- C1 (base `actionsRow` rétablie, C2 présent) : `event-form` rouge à 320 px — `fr` `div.flex.gap-2` right 376.22 (w 219.58),
  `es` 345.73, `de` 379.22 ; `en` vert. `create-form` 320 resté vert (cf. réserve C1). Correctif restauré → vert.
- C2 (a) ancien `settle()` : `create-form` 1280 rouge ×4 — `.mt-drawer--form` right 1288.89 / 1289.10 / 1297.85 / 1297.96.
- C2 (b) ARMEMENT, nouveau `settle()` + débord AU REPOS injecté (`animation:none; transform:translateX(40px)`) :
  `create-form` 1280 rouge ×4, right 1320. Mutation retirée (vérifié : diff du commit = `settle()` seul).
  Auto-contrôle du fichier vert.
- C3 unitaire, test écrit AVANT l'implémentation : 8/8 rouges. Verrou seul désactivé (`enabled={false}`) : 6/8 rouges
  (les 2 « portail ouvert après » ne dépendent que de `hideOthers`). Restauré → 8/8.
- C3 E2E, verrou désactivé : rouge à l'étape (2) « la page défilait sous le scrim » — `scrollY` attendu 300, reçu 700.
  Le témoin (1) prouve que la même molette au même point fait défiler la page sans panneau. Restauré → vert.

## Non vérifié
- Mesures `sprint-63` faites sous macOS, pas dans `playwright:v1.61.1-jammy` (PIT-S52-001) : la CI Linux tranche.
- Pas de preuve E2E du verrou en ÉDITION (même coque ; unitaires sur les deux variantes, pas par appelant).
- Glisser tactile (`touchmove`) sur la sheet et clavier virtuel iOS réel : non testés (seule la molette l'est ;
  `sprint-66-mobile-keyboard` simule `visualViewport` et reste vert).
- Liste d'un `Select` qui déborde : non mesurée (le compte n'avait pas assez de produits pour une liste défilante) ;
  seules l'exposition (non `aria-hidden`) et l'utilisation sont prouvées.
- Aucune capture visuelle du pied replié à 320 px (géométrie seule), ni clair/sombre.
- `DeleteConfirmDialog` / `ConflictDialog` ouverts par-dessus la coque : pas de nouveau test (Radix y pose son propre
  `hideOthers`, qui masque temporairement le panneau — comportement normal d'empilement).

## Signaux mémoire
- [MEMORY:pitfall] Context: vérifier en E2E qu'un fond est inerte après `hideOthers` (aria-hidden, aussi utilisé par Radix Dialog). Solution: la bibliothèque préserve tout `[aria-live]` ET ses ancêtres — une région aria-live dans `<main>` laisse `app-shell` et `<main>` sans `aria-hidden`. Prevention: viser un élément hors de toute chaîne d'ancêtres aria-live (sidebar), jamais le conteneur principal.
- [MEMORY:pitfall] Context: audit de géométrie mesuré juste après ouverture d'un panneau animé (#618, 200 ms). Solution: attendre `document.getAnimations()` → `finished` en écartant les animations infinies. Prevention: tout `settle()` de mesure attend polices ET animations ; armer par un débord au repos injecté.
- [MEMORY:pattern] Problem: committer séparément deux hunks d'un même fichier sans `git add -p`. Solution: blob = HEAD + hunk voulu, `git hash-object -w` puis `git update-index --cacheinfo 100644,<sha>,<path>`. Anti-pattern: `git stash` sur worktree partagé.
- [MEMORY:pattern] Problem: remplacer un `Dialog` Radix par une coque maison. Solution: reprendre `RemoveScroll` (forwardProps + ref sur le panneau) et `hideOthers` dans un effet `[open]`, en dépendances directes aux versions déjà résolues. Anti-pattern: `aria-modal` seul.

## Recommandations suite
- RECOMMAND_TEST_RUNNER: faire rejouer `sprint-63-de-overflow-audit` par la CI Linux (jammy) — mesures locales macOS seulement.
- RECOMMAND_UI_DESIGN: vérifier visuellement le pied de sheet replié à 320 px (Supprimer seul, groupe à droite dessous), clair et sombre.
- RECOMMAND_FOLLOWUP: preuve E2E du verrou et du fond inerte en mode ÉDITION (`timeline-edit-dialog`).
- Pas de RECOMMAND_DB_EXPERT (aucun backend ni schéma touché).
- Pas de RECOMMAND_SECURITY_EXPERT (aucune surface auth ni donnée).

fichiers de contexte lus:
- docs/memory/sprints/sprint-86/specialists-reviewer.md — MAJEUR RemoveScroll/hideOthers, MINEUR garde Échap sans correction
- docs/memory/sprints/sprint-86/issue-618-done.md — « plus de verrou de scroll de page », onClose stabilisé, animation --dur-base
- docs/memory/sprints/sprint-86/pit-subset-frontend.md — PIT-S81-022 (deux next dev), PIT-S72-004 (1er hit), PIT-S74-008 / PIT-S84-006 (prettier depuis frontend/)
- frontend/node_modules/aria-hidden/dist/es2015/index.js — `targets.push(...querySelectorAll('[aria-live]'))`
- frontend/node_modules/react-remove-scroll/dist/es2015/UI.js — `forwardProps` → `cloneElement(child, {...callbacks, ref})`
- frontend/node_modules/@radix-ui/react-dialog/dist/index.mjs — `RemoveScroll as Slot allowPinchZoom`, `hideOthers(content)`

STATUS: COMPLETED
