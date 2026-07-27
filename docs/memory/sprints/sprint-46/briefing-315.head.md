[BRIEFING ISSUE #315]

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

**[FEATURE] Aperçu live du drawer de création : mini-frise conforme au handoff §6**

### Contexte

Follow-up détecté pendant le Sprint 44 (issue #300, PR #313).
Source : `docs/memory/sprints/sprint-44/issue-300-done.md` + `ui-design-300.md`.
Écart **assumé et documenté** (décision `DEC-S44-002`), pas un oubli.

### Description

Le drawer de création d'événement (452px, livré au Sprint 44) affiche un aperçu **simple** : un bloc coloré
reprenant couleur / durée / récurrence.

Le handoff design (`docs/design/graphite-handoff.md` §6) spécifie un aperçu plus riche — une **mini-frise** :
- une règle temporelle (ruler) avec marqueur **TODAY**
- un connecteur pointillé + **occurrence fantôme** pour les événements récurrents
- une légende « prochaine occurrence »

### Pourquoi ce n'est pas fait au Sprint 44

`ui-design` a signalé l'écart AVANT implémentation. Arbitrage dev : scope réduit pour ce sprint — l'issue #300
était déjà en borne haute de sa taille (le chemin data `createEvent` n'existait pas, sélecteur de produit à
créer, hook de mutation + invalidation), et le sprint dépassait déjà sa cible de points.

### Piste technique

- `frontend/src/components/EventEditForm.tsx` (bloc aperçu actuel, `event-form-preview`)
- Composants DS déjà utilisés par la frise principale : règle temporelle / curseur TODAY / pointillé de
  récurrence — à réutiliser plutôt qu'à réécrire (cf. `docs/design/graphite-handoff.md` §254 et suivants)
- `frontend/src/components/events/NewEventDrawer.tsx` (hôte de l'aperçu)

### Critères d'acceptation

- [ ] L'aperçu affiche une mini-frise avec ruler + marqueur TODAY
- [ ] Un événement récurrent montre le connecteur pointillé + l'occurrence fantôme
- [ ] La légende « prochaine occurrence » est présente
- [ ] Réutilisation des composants DS de la frise (pas de réécriture)
- [ ] Theme-aware clair + sombre, tokens DS uniquement
- [ ] Tests RTL de l'aperçu

### Triage estimé

M | Domaine : events / design

## Plan d'implémentation (architect, /sprint plan)

```yaml
issue_315:
  fichiers_cles:
    - "frontend/src/components/EventEditForm.tsx"                   # vérifié : bloc aperçu L496-506, data-testid="event-form-preview", previewInk/previewDuration/previewRecurrence débouncés L186-211
    - "frontend/src/components/events/NewEventDrawer.tsx"           # vérifié (247 lignes, hôte de l'aperçu)
    - "frontend/src/components/timeline/index.ts"                   # vérifié : exporte Ruler (L8), EventBar (L12), Cursor (L14) → réutilisables
    - "frontend/src/components/timeline/Ruler.tsx"                  # vérifié
    - "frontend/src/components/timeline/Cursor.tsx"                 # vérifié
    - "frontend/src/components/timeline/EventBar.tsx"               # vérifié
    - "docs/design/graphite-handoff.md"                             # vérifié (15.9K, §6 = spec de la mini-frise)
  couches_touchees: ["frontend"]
  strategie_test: "unit"                                            # RTL ; l'E2E de l'aperçu arrive en S47 via #314
  risque_regression: "L'aperçu est alimenté par des valeurs débouncées à 150 ms (BR-EVE-009, EventEditForm.tsx:126) — une mini-frise qui recalcule des positions à chaque frappe non débouncée dégraderait la saisie ; conserver le passage par useDebounced."
  ordre_ecriture: "composants DS réutilisés (Ruler/Cursor/EventBar) → EventEditForm → NewEventDrawer → RTL"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — l'aperçu actuel est un bloc coloré simple, aucun Ruler/Cursor importé dans EventEditForm.tsx)"
```

## Triage

Taille: M
Modèle: opus
Effort: high
