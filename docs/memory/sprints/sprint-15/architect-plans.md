# Mini-plans architect — Sprint 15

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

issue_0165:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java"
    - "backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/EventService.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/persistence/EventRepositoryJpaImpl.java (chemin exact à confirmer par fullstack-dev — le body cite interfaces/rest/ mais le controller réel est sous infrastructure/adapters/controllers/)"
    - "nouveau DTO infrastructure/rest/dto/EventResponse.java"
  couches_touchees: ["domain","application","infrastructure"]
  strategie_test: "unit (mapper Event→EventResponse) + integration (POST retourne 201 + EventResponse)"
  risque_regression: "Changement HTTP 200→201 sur POST /api/events : vérifier que le frontend (#150) ne s'appuie pas sur 200. Port EventService : retirer imports application.* du domaine sans casser les use cases. BR-EVE-001 (event↔user) préservée."
  ordre_ecriture: "domain (commande pure + port) → application (use case) → infra (DTO + controller + adapter câblé sur port)"
  zod_dto_sync: "OUI (EventResponse = source du contrat consommé par #150)"
  possibly_done: false
  etat_reel_du_code: "Chemins body issue partiellement stale (interfaces/rest/ inexistant ; réel = infrastructure/adapters/controllers/). À déterminer par fullstack-dev."

issue_0150:
  fichiers_cles:
    - "frontend/src/types/event.ts (schéma Zod source de vérité)"
    - "frontend/schémas Zod events création + édition (à déterminer par fullstack-dev)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest — parsing Zod color unique, recurrenceUnit WEEK/MONTH/YEAR, archived, recurrenceEndDate nullable)"
  risque_regression: "Fusion bg/border/text → color unique : tout composant consommant les 3 anciens champs casse. Pitfall projet : .nullable() jamais .nullish() en schéma manuel. Doit consommer EXACTEMENT le EventResponse livré par #165."
  ordre_ecriture: "frontend (types/event.ts → schémas → composants consommateurs)"
  zod_dto_sync: "OUI (consommateur du contrat #165)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — frontend pas synchronisé selon contexte projet)"

issue_0163:
  fichiers_cles:
    - "frontend/e2e/golden-path.spec.ts (nouveau — dir contient seulement .gitkeep, confirmé)"
    - ".github/workflows/ci.yml (nouveau job E2E)"
  couches_touchees: ["frontend"]
  strategie_test: "E2E (Playwright : inscription→connexion→produit+événement→timeline)"
  risque_regression: "Greenfield E2E (aucun harness fonctionnel). Sélecteurs data-testid uniquement. Risque flaky en CI — soigner waitFor, éviter timings hardcodés. data-testid auth déjà posés (S8 #53)."
  ordre_ecriture: "frontend (spec) → CI (job)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "frontend/e2e/ = .gitkeep seul confirmé (greenfield)"
