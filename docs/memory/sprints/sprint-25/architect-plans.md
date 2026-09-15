# Mini-plans architect — Sprint 25

> Généré par /sprint plan 5 (architect). Lu par /sprint start 25 Phase 4.1.
> Thème : Finalisation Events (conflit 409 + contrat DTO + form). Cohésion 0.82. Migrations : aucune.
> Découverte : le frontend gère déjà le 409, mais le backend ne mappe PAS
> ObjectOptimisticLockingFailureException -> 409 (retourne 500), et EventUpdateRequest
> ignore silencieusement startDate/endDate. Le vrai travail est backend.

```yaml
issue_0201:
  fichiers_cles: ["backend/.../infrastructure/rest/dto/EventUpdateRequest.java", "backend/.../application/services/EventServiceImpl.java", "backend/.../infrastructure/adapters/controllers/EventController.java", "frontend/src/types/event.ts"]
  couches_touchees: ["infrastructure","application","frontend"]
  strategie_test: "integration (PATCH event avec startDate/endDate persiste) + unit mapper"
  risque_regression: "les champs startDate/endDate étaient silencieusement ignorés -> une fois câblés, valider BR-EVE (cohérence durée/récurrence) pour ne pas casser V11 conditional checks"
  ordre_ecriture: "infrastructure (DTO record) -> application (mapper/service) -> frontend (vérif types)"
  zod_dto_sync: "OUI — event.ts Zod porte déjà startDate/endDate ; aligner sur DTO backend"
  possibly_done: false
  etat_reel_du_code: |
    MISALIGNED confirmé. EventUpdateRequest.java = {title,type,durationValue,durationUnit,isRecurring,
    recurrenceUnit,recurrenceEndDate,color,archived} SANS startDate/endDate. EventResponse.java:35-36 LES a.
    Frontend PATCH les envoie (event.ts:166-167) -> ignorés backend.

issue_0200:
  fichiers_cles: ["backend/.../infrastructure/adapters/controllers/GlobalExceptionHandler.java", "backend/.../infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (2 updates concurrents -> 2e reçoit 409, pas 500)"
  risque_regression: "un handler global 409 trop large pourrait requalifier d'autres OptimisticLock (Category/Product déjà mappées localement en 409) -> scoper au type d'exception, pas fourre-tout (cf PIT-S10)"
  ordre_ecriture: "infrastructure (handler)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Frontend DONE (EventContent.tsx:103-106 mappe 409->conflict, EventEditForm alerte). EventEntity @Version
    présent (EventEntity.java:33). MANQUE: GlobalExceptionHandler n'a AUCUN
    @ExceptionHandler(ObjectOptimisticLockingFailureException) -> 500 au lieu de 409.

issue_0188:
  fichiers_cles: ["frontend/src/components/EventEditForm.tsx", "frontend/src/types/event.ts"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (RTL: checkbox archived togglable + PATCH envoie archived)"
  risque_regression: "aucun (recurrenceEndDate déjà livré EventEditForm.tsx:332-349, présent Zod event.ts:168)"
  ordre_ecriture: "frontend (ajouter champ checkbox archived)"
  zod_dto_sync: "OUI (archived déjà dans Zod)"
  possibly_done: partiellement
  etat_reel_du_code: |
    recurrenceEndDate DÉJÀ livré (EventEditForm.tsx:332-349). Reste UNIQUEMENT le champ UI `archived`
    (checkbox) à exposer dans le formulaire.

issue_0077:
  fichiers_cles: ["frontend/src/components/shared/ConflictDialog.tsx (a creer)", "frontend/src/components/EventEditForm.tsx", "frontend/src/components/EventContent.tsx"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (RTL: 409 -> dialog visible + bouton recharger) + E2E golden-path variante conflit"
  risque_regression: "extraire l'inline EventEditForm.tsx:416-436 sans casser data-testid=event-form-conflict (utilisé par tests existants)"
  ordre_ecriture: "frontend (composant partagé -> rebrancher EventEditForm -> généraliser)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    EXISTS inline (EventEditForm.tsx:416-436, EventSubmitState 'conflict'). PAS de modale/handler global
    partagé. #77 = extraire + généraliser à tout 409 optimistic. Dépend de #200 (contrat 409 backend stabilisé).
```
