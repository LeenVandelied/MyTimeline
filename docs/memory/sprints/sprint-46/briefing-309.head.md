[BRIEFING ISSUE #309]

## Répertoire de travail (OBLIGATOIRE)

```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/new-feature-2347-14cb9a
git rev-parse --abbrev-ref HEAD   # DOIT afficher : sprint/46
```

⚠ `git diff` ~vide sous le hook RTK → `rtk proxy git diff`.
⚠ App router Next.js = `frontend/app/`, PAS `frontend/src/app/`.

## Issue

**[FRONTEND] Câbler la suppression d'event sur la frise mobile**

### Contexte
Sur mobile, la frise affiche une feuille d'actions (`TimelineActionSheet`) qui propose déjà « modifier un
événement », câblée au Sprint 42. Cette feuille prévoit aussi une affordance de **suppression**, mais elle
n'est reliée à aucune page : sur mobile, il est aujourd'hui **impossible de supprimer un événement** depuis la frise.

### À faire
Relier l'action de suppression depuis les pages routées jusqu'à `TimelineActionSheet`, en réutilisant le flux
`deleteEvent` déjà existant côté frontend, de la même manière que `onEditEvent` l'a été au Sprint 42.

### Critères d'acceptation
- [ ] La suppression d'un événement fonctionne depuis la frise sur mobile
- [ ] Un testid stable est ajouté pour l'action de suppression mobile
- [ ] Une spec E2E couvre ce parcours si pertinent

### BR impactées
Aucune

### Triage estimé
XS | Domaine : timeline / events

## Plan d'implémentation (architect, /sprint plan)

```yaml
issue_309:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineEditHost.tsx"       # vérifié L30 : "`onDeleteEvent` reste non câblé (hors périmètre A/B/C)" ; L92 : <TimelineResponsive {...props} onEditEvent={setEditing} /> — pas de onDeleteEvent
    - "frontend/src/components/timeline/TimelineResponsive.tsx"     # vérifié L45 prop onDeleteEvent déclarée, L77/L90 propagée aux vues mobiles
    - "frontend/src/components/timeline/TimelineActionSheet.tsx"    # vérifié L25 onDelete?, L57 onDelete?.(event)
    - "frontend/src/services/eventService.ts"                       # vérifié : deleteEvent importé par TimelineEditHost.tsx:10
  couches_touchees: ["frontend"]
  strategie_test: "unit"                                            # E2E du parcours mobile ramassée par #205 en S47
  risque_regression: "TimelineEditHost.tsx:71 possède déjà un onDelete pour le chemin desktop (EventDrawer, L125) — RÉUTILISER ce callback plutôt que d'en créer un second, sinon divergence d'invalidation de cache entre desktop et mobile."
  ordre_ecriture: "réutiliser le onDelete desktop existant → câbler onDeleteEvent sur TimelineResponsive → RTL"
  zod_dto_sync: "NON"
  possibly_done: false
```

## Triage

Taille: XS
Modèle: sonnet
Effort: medium
