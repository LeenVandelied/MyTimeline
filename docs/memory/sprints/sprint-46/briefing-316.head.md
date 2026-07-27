[BRIEFING ISSUE #316]

## Répertoire de travail (OBLIGATOIRE — lire en premier)

Tu travailles dans un **worktree git**, PAS dans le repo principal.

```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/new-feature-2347-14cb9a
```

Fais ce `cd` explicite au tout premier appel Bash, puis garde-fou :

```bash
git rev-parse --abbrev-ref HEAD   # DOIT afficher : sprint/46
```

Si HEAD ≠ `sprint/46` → STOP, retourne `STATUS: PARTIAL` + `BLOQUE_SUR: mauvais worktree/branche`.
Ne commit JAMAIS depuis `/Users/herrh/VSProjects/MyTimeline` (repo principal).

⚠ `git diff` renvoie ~vide sous le hook RTK de cette machine. Utiliser `rtk proxy git diff`
ou rediriger vers un fichier puis le lire.

⚠ App router Next.js = `frontend/app/`, **PAS** `frontend/src/app/`.

## Issue

**[REFACTOR] EventDrawer : consommer useFocusTrap au lieu du focus-trap inline dupliqué**

### Contexte

Follow-up détecté pendant le Sprint 44 (issue #300, PR #313).
Source : `docs/memory/sprints/sprint-44/issue-300-done.md`.

### Description

Le hook `useFocusTrap` (`frontend/src/components/timeline/useFocusTrap.ts`, extrait en #63) mutualise le
piège à focus : focus initial, boucle Tab/Shift+Tab, restauration du focus au démontage, fermeture Échap.
Il est consommé par `MobileDrawer`, `TimelineBottomSheet`, `TimelineActionSheet`, et depuis le Sprint 44
par `NewEventDrawer`.

`EventDrawer.tsx` (drawer de détail, desktop) conserve en revanche **sa propre copie inline** de la même
logique (`useEffect` + `previousFocus` + listener keydown) — la duplication que #63 visait justement à
éliminer.

### Pourquoi ce n'est pas fait au Sprint 44

Non-refactor **volontaire**, documenté dans la docstring du hook : ne pas toucher `EventDrawer` évitait tout
risque de régression desktop pendant un sprint qui touchait déjà largement à cette zone. Hors périmètre #300.

### À faire

- Remplacer le focus-trap inline d'`EventDrawer.tsx` par `useFocusTrap`
- Vérifier la parité de comportement : focus initial sur le bouton fermer, restauration du focus sur le
  déclencheur (bloc événement / bouton ⋯), Échap
- ⚠ **Piège connu** (`BUG-S44-001`) : `useFocusTrap` a `onEscape` en dépendance d'effet — le callback passé
  DOIT être stabilisé en `useCallback` chez l'appelant, sinon re-trap à chaque rendu et **vol de focus
  pendant la saisie**.

### Critères d'acceptation

- [ ] `EventDrawer.tsx` n'a plus de logique de focus-trap inline
- [ ] Tests existants d'`EventDrawer` verts (non-régression desktop)
- [ ] Callback Échap stabilisé (`useCallback`)

### Triage estimé

XS | Domaine : timeline / events

## Plan d'implémentation (architect, /sprint plan)

```yaml
issue_316:
  fichiers_cles:
    - "frontend/src/components/timeline/EventDrawer.tsx"            # vérifié : trap inline L32 previousFocus, L36-38 focus initial, L56-58 listener keydown, L60 restauration — aucun import useFocusTrap
    - "frontend/src/components/timeline/useFocusTrap.ts"            # vérifié (64 lignes)
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "BUG-S44-001 (vérifié dans le corps de l'issue) : useFocusTrap a onEscape en dépendance d'effet → le callback DOIT être stabilisé en useCallback chez l'appelant, sinon vol de focus pendant la saisie."
  ordre_ecriture: "stabiliser onEscape (useCallback) → remplacer le trap inline → RTL"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — 12 fichiers consomment useFocusTrap, EventDrawer.tsx n'en fait pas partie)"
```

## Triage

Taille: XS
Modèle: sonnet
Effort: medium
