# Mini-plans architect — Sprint 69

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans le HEAD du briefing fullstack-dev (section "## Plan d'implementation").

⚠ DÉCISION DE CONTRAT #439 À TRANCHER AVANT CODE (ADR) — Option 1 `seriesInfo{count,capped}`
dans EventResponse (impacte contrat + Zod event.ts + tests) vs Option 2 endpoint dédié
`POST /api/events/recurrence-preview` (aucun contrat impacté). Archi recommande **Option 2**.

```yaml
issue_0439:
  fichiers_cles: ["application/dtos/EventResponse.java (si Option 1)", "domain/ports/services/RecurrenceExpansionService.java", "application/services/RecurrenceExpansionServiceImpl.java", "infrastructure/adapters (chemin REST à câbler)", "frontend/src/types/event.ts (si Option 1)"]
  couches_touchees: ["domain","application","infrastructure","frontend"]
  strategie_test: "unit+integration (garde-fou 4000 occ + flag capped) ; E2E si Option 1"
  risque_regression: "BR-EVE-012 : câblage exposant >4000 occurrences, ou EventResponse cassé pour TOUT le front (Option 1)"
  ordre_ecriture: "domain (port) → application (service+dto) → infra (adapter REST) → frontend (Zod si Option 1)"
  zod_dto_sync: "OUI si Option 1 / NON si Option 2"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — NO-OP vérifié réel : moteur+garde-fou présents, branchés à aucun chemin HTTP)"
```

# #67 (XS) — pas de bloc YAML requis
# Fichier `frontend/src/components/EventEditForm.tsx` (`<p role="status">`). Lit le flag `capped` selon l'option retenue en #439. Dépend de #439 (Wave 2).
