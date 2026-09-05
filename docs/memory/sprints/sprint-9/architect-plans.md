# Mini-plans architect — Sprint 9

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

```yaml
issue_0044:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/CategoryEntity.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java"
    - "backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java  # nouveau (enum)"
    - "backend/src/main/java/com/matimeline/eventmanager/domain/models/{Event,Product,Category,User}.java"
    - "backend/src/main/resources/db/migration/V7__design_v3_schema.sql  # nouveau"
    - "backend/src/main/java/.../application/mappers/  # mappers impactés par la refonte couleurs"
  couches_touchees: ["domain","infrastructure"]
  strategie_test: "integration (Flyway migration + validate) + unit (mappers, enum)"
  risque_regression: "Migration couleurs bg/border/text->color IRREVERSIBLE : perte de borderColor/textColor si le mapping backgroundColor n'est pas le bon choix produit."
  ordre_ecriture: "enum RecurrenceUnit -> domain models -> entities -> migration V7 -> mappers/DTO existants"
  zod_dto_sync: "OUI (les DTO events/products/categories changent de forme couleur ; sync Zod frontend reportee aux sprints frontend S10/S11)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — V6 est la derniere migration ; 3 champs couleur confirmes dans EventEntity par le body #44)"

issue_0135:
  fichiers_cles:
    - "frontend/src/contexts/AuthContext.tsx"
    - "frontend/src/hooks/useCurrentUser.ts  # pont /me existant (PAT-S7-004)"
    - "frontend/src/services/authService.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit (AuthContext.test.tsx : persistance/restauration session, absence PII localStorage)"
  risque_regression: "Flash non-authentifie au mount si option 1 (re-fetch /me) ; casser un consommateur lisant user depuis localStorage."
  ordre_ecriture: "frontend uniquement — decider option 1 (re-fetch /me) vs option 2 (champs restreints) AVANT code"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — AuthContext.tsx + AuthContext.test.tsx presents ; PII en localStorage confirmee par body #135)"
```

## ADR requis
- `docs/adr/ADR-XXX-migration-couleurs-v3.md` (choix backgroundColor comme survivant, irreversibilite, backfill `archived=false`). Signaler `[MEMORY:decision]` au lead.
- **#44 = migration IRREVERSIBLE** : sauvegarde DB avant application prod + confirmation utilisateur (regle CLAUDE.md).
