# Mini-plans architect — Sprint 12

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

```yaml
issue_0054:
  fichiers_cles:
    - "backend/src/main/java/.../application/services/EventServiceImpl.java  # PATCH recalcul endDate + appel expansion"
    - "backend/src/main/java/.../application/services/RecurrenceExpansionService.java  # nouveau"
    - "backend/src/main/java/.../utils/Utils.java  # null-guard calculateEndDate (BR-EVE-004)"
    - "backend/src/main/java/.../infrastructure/adapters/controllers/EventController.java  # 422 via GlobalExceptionHandler"
    - "backend/src/main/resources/db/migration/V10__neutralize_invalid_recurrence_unit.sql  # nouveau"
  couches_touchees: ["domain","application","infrastructure"]
  strategie_test: "unit (RecurrenceExpansionServiceTest : 52 semaines=52 occ, cap 4000, UtilsTest null-guard) + integration (POST isRecurring+unit=null->400, PATCH recalcul endDate)"
  risque_regression: "Lignes existantes recurrenceUnit='weekly' (string libre) non couvertes par la migration avant contrainte enum -> boot KO ; double recalcul si front envoie endDate."
  ordre_ecriture: "null-guard Utils -> RecurrenceExpansionService -> EventServiceImpl PATCH -> advice 422 -> migration V10 alias"
  zod_dto_sync: "OUI (validation conditionnelle recurrenceUnit requis si isRecurring — a repercuter dans event.ts au sprint frontend events)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — Utils.java et EventServiceImpl presents ; enum livre par #44 en S9)"

issue_0095:
  fichiers_cles:
    - "backend/src/main/java/.../application/services/EventServiceImpl.java  # findEventById"
  couches_touchees: ["application"]
  strategie_test: "unit (findEventById un seul hit DB, pas de printStackTrace)"
  risque_regression: "Conflit d'edition avec #54 sur le meme fichier -> a faire APRES #54."
  ordre_ecriture: "apres #54 merge"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
```

## Issue XS sans mini-plan
- **#67** (exposer limite 4000 occurrences) : ajouter le champ `capped` (bool) au DTO de reponse d'expansion, expose par #54. Vague 2 (consomme #54).

## Sequencement intra-sprint
- V1 : #54 d'abord (reecrit PATCH + expansion dans `EventServiceImpl.java`), puis #95 (nettoyage findEventById MEME fichier) -> #95 APRES #54.
- V2 : #67 une fois `RecurrenceExpansionService` en place.

## Dependance inter-sprint
- Depend de S9 (#44 : enum RecurrenceUnit + recurrenceEndDate).

## Reporte (hors 5 sprints)
- #55/#63/#64/#66 (Timeline + form evenement frontend) : dependent de #47 (extraction composants Timeline, NON planifie) + #54. Sprint Wave 4 frontend a prevoir.
