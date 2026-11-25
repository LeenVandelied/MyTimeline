---
pack: event
kind: domain
name: Événement
generated_at: 2026-11-25T16:00:00
generator: synth/1
base_sha256: 736eefba730216ccf4ac39ec8959fb42a61143ae9a1358f18002f0d91a0ca530
facts_in_base: 353
facts_in_pool: 439
facts_cited: 57
sections: event.sections.json
details: [event.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
curation: event.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : event, événement, evenement, recurrence, récurrence, timeline, passwordresettoken
- Routes : `/api/events`
- Entités : EventEntity, PasswordResetTokenEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| recurrenceUnit | Unité de récurrence d'un événement, portée par le modèle de domaine et typée par une énumération dédiée, définie dans `backend:src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java:15-18`. | [#9f47cf2ed415c352-1] [#53c142807d114b66-1] |
| productId | Référence au produit auquel l'événement appartient, côté domaine, sans annotation JPA. | [#9f47cf2ed415c352-1] |
| product_id | Côté persistance, relation ManyToOne obligatoire de la table events vers product, mappée dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:16-61`. | [#14dc8524b3c647c3-1] |
| version | Colonne annotée @Version, non nulle, de l'entité événement, aussi présente comme champ du modèle de domaine. | [#14dc8524b3c647c3-1] [#9f47cf2ed415c352-1] |
| égalité d'EventEntity | Deux entités sont égales seulement si leur id est non nul et identique, le hashCode ne dépend que de la classe (`backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:187-198`). | [#8f73b2f51593d54c-1] |

## 3. Règles {#rules}

### Création
- Si le propriétaire du produit existe, planPolicy compare le nombre d'events actifs au plafond et refuse avec EventQuotaExceededException (402), sans propriétaire aucun plafond ne s'applique. [#1426ab5c3f700cf3-2] [#cdf027b2e9c1f145-1]
- Un type hors duration et single lève InvalidEventTypeException (422) avant l'enregistrement. [#0b4bcf2c88504a14-1] [#a2b9636c20b33081-1]
- Une récurrence active exige un recurrenceUnit non vide, à la création comme sur l'état fusionné d'une mise à jour. [#6a6a2db764ed3efc-1] [#98cf4b5faf0ea7a3-1]
### Mise à jour
- Un échec de verrou optimiste dans le contrôleur recharge l'état serveur et lève EventConflictException avec sa version. [#fd4d8848bb37eb45-1]
- Pour un autre type, endDate prend startDate si un facteur de date change sans endDate explicite. [#469d0ef9c8a70cdc-2]
- Le produit d'origine est réaffecté avant la sauvegarde, il ne se change pas par mise à jour. [#9734119e4856c768-2]
### Récurrence et durée
- Une série sans recurrenceEndDate est développée jusqu'à startDate plus MAX_UNBOUNDED_EXPANSION_YEARS ans, et capped n'est vrai que si l'occurrence suivante reste dans la fenêtre. [#592a138d8cdd8079-1] [#592a138d8cdd8079-2]
- expand lève IllegalArgumentException, la prévisualisation la traduit en 422 si la fin précède le début. [#1a1f018e6f7eaffc-3] [#260f81d202fbedaa-1]
### Vérifié dans le code
- RecurrenceExpansion.capped est exposé par POST /api/events/recurrence-preview (RecurrencePreviewController, RecurrencePreviewResponse) : ne pas le supprimer, la javadoc affirmant l'absence de consommateur est périmée [#2b0d742a9f9403eb-1] [#integrations/fa220ac41b24d700-1] [#260f81d202fbedaa-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java:56-75`.
- Avant EventRepository.save avec un id renseigné, vérifier l'existence de l'événement, comme le fait EventServiceImpl.updateEvent via findEventById [#98cf4b5faf0ea7a3-4] `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:98-99`.
- Dans toute purge de compte, appeler EventRepository.deleteAllByUserId avant ProductRepository.deleteAllByUserId, comme UserServiceImpl [#user/c65286231ca612ed-1] [#user/0ec9a144d275a5ac-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:117-118`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventController | Le contrôleur expose ses routes sous le préfixe /api/events. | L29-30 | [#bf198858d7b51045-1] |
| EventController.createEvent | POST /api/events reçoit un EventCreationRequest validé et renvoie un EventResponse. | L46-47 | [#c2d52af73209c0c3-1] |
| EventController.createEvent | createEvent répond 201 Created avec le corps EventResponse.fromDomain de l'event créé. | L68 | [#c2d52af73209c0c3-2] |
| EventController.updateEvent | PATCH /api/events/{id} reçoit un EventUpdateRequest validé et renvoie un EventResponse en 200. | L71-73 | [#15b09c65b34b16dc-1] |
| EventController.deleteEvent | DELETE /api/events/{id} vérifie la propriété puis supprime l'event via eventService.deleteById et répond 200 sans corps. | L97-105 | [#b47e4a8d8516d040-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerOwnershipTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventControllerOwnershipTest.createEvent_owner_returns201_withEventResponseBody | POST /api/events par le propriétaire renvoie 201 avec un corps JSON contenant id, title, type, isAllDay, color, archived et productId. | L178-214 | [#f392a4b7cf0135bc-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RecurrencePreviewController.previewRecurrence | Expose POST /api/events/recurrence-preview, qui valide le corps RecurrencePreviewRequest avec @Valid et renvoie un RecurrencePreviewResponse. | L56-58 | [#2b0d742a9f9403eb-1] |

## 5. Endpoints et écrans {#surface}

- Les routes événement sont sous /api/events dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java:29-30` [#bf198858d7b51045-1], et le front les appelle depuis `frontend:services/eventService.ts:51-59` [#5a914d0f71ef712d-1].
- La création vérifie que le produit cible appartient à l'appelant, sinon elle lève AccessDeniedException avec le message forbidden [#integrations/c97d5db852535a9b-1].
- La modification et la suppression passent par checkEventOwnership, qui renvoie 401 sans appelant, 404 si l'event ou son produit manque, et lève AccessDeniedException si le produit n'est pas à l'appelant [#27e1056000133833-1] [#b47e4a8d8516d040-1] [#integrations/31be9b56a73503a4-1].
- Un PATCH ou un DELETE par un autre utilisateur donne 403 avec un corps JSON d'erreur forbidden, et le service n'est jamais appelé [#54cad8471b6e9acf-1] [#f0c1d069bda91d63-1].
- La liste des events d'un produit n'est pas sous /api/events, le front appelle /users/{userId}/products/{productId}/events [#e1636c6acf0f6a7a-1].
- La création force archived à false, recurrenceEndDate à null et calcule endDate, quelle que soit la requête [#bbfc6cf3890cac2d-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 57), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java` | 29 | validation 13, other 5, business_rule 4 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java` | 31 | business_rule 13, test_case 10, validation 6 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java` | 26 | business_rule 8, convention 5, service_method 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java` | 15 | role_check 6, endpoint 5, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 13 | convention 5, business_rule 3, validation 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java` | 20 | persistence_query 8, other 6, convention 4 |
| `frontend:services/eventService.ts` | 17 | service_method 5, convention 4, other 4 |
| `backend:src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java` | 12 | business_rule 3, convention 3, test_case 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventConditionalCheckConstraintIntegrationTest.java` | 16 | test_case 7, convention 3, persistence_query 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventOptimisticLockConflictIntegrationTest.java` | 20 | test_case 8, other 5, business_rule 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java` | 14 | test_case 7, other 3, validation 3 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 46 | 36 |  |
| backend-core | 54 | 14 |  |
| frontend-core | 12 | 2 |  |
| authorization | 3 | 0 |  |

## 8. Tests attendus {#tests}

- Les tests fixent que la prévisualisation renvoie 422 si la fin précède le début, et 400 sans startDate ou avec une unité en minuscules, le service n'étant pas appelé [#82e1a17509802d6c-1] [#68836e1845d29a69-1] [#b33cbd89169e2c51-1].
- Les tests fixent que le quota renvoie 402 event_quota_exceeded, que les événements archivés et ceux d'un produit archivé ne comptent pas, et qu'un récurrent compte pour un [#43df9b18444a5c92-1] [#9732305a169027cb-1] [#65854e5316a4e8ea-1] [#aa8cc13fdb91de2b-1].
- Les tests fixent que la base rejette un récurrent sans recurrence_unit et un type duration sans duration_unit [#33d5c419a48bee4e-1] [#fde144e77ad6ffaf-1].
- Les tests fixent qu'une suppression émet une seule instruction JDBC et l'emporte sur une édition concurrente [#b1309cfd2133ba3c-1] [#c3bb287829b2fbd5-1].
- Un test de service configure PlanPolicy en lenient pour autoriser la création par défaut [#57ff0ea0969cfde2-1].

## 9. Questions ouvertes {#questions}

- Le champ color du DTO de création n'a aucun contrôle de format, et le commentaire dit que la répercussion frontend reste à faire. Une validation est-elle prévue ? [#c79d155872b82780-1] [#backend-core/af3d8994f27f9508-1]

## 10. Alertes {#alerts}

- Dans `buildBody`, Map.of rejette les valeurs null alors que plusieurs handlers lui passent ex.getMessage(), ce qui peut lever une NullPointerException au lieu de la réponse d'erreur attendue. Garantir un message non null avant d'ajouter ou de modifier un handler (`backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:311-318`). [#07464037695a9960-1]
- Selon la javadoc, la suppression perd volontairement le verrou optimiste, et le port ne reçoit aucune version. Ne pas compter sur un conflit de version à la suppression (`backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/EventRepository.java:37-41`). [#8634b19eb71898e8-2] [#92ea5b8b1d75d1d3-1]
- Le commentaire de `updateEvent` dit que startDate n'est pas modifiable via EventUpdateRequest, alors que le code applique command.startDate() à l'entité. Se fier au code et corriger le commentaire (`backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:136-162`). [#818442b52d5bb0f8-2] [#98cf4b5faf0ea7a3-4]
- Deux tests de contrainte CHECK n'attendent que la classe Exception générique, donc tout échec de la requête les satisfait. Ils ne prouvent pas la contrainte, il faut asserter la violation précise (`backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventPatchAndRecurrenceIntegrationTest.java:298-300`). [#6e7f988b3d4eb7f7-1] [#27b42a4cf6d2382f-1]
- Le setter s'appelle `setProduct` alors que le champ et le getter portent le nom productId. Utiliser `setProduct` pour renseigner productId, sans le confondre avec une entité (`backend:src/main/java/com/matimeline/eventmanager/domain/models/Event.java:79`). [#7da0b405589ec288-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 53 ; avec au moins un fait en base : 53 ; sans fait après remise en file : 0.
- Faits en base : 353, repris d'autres packs : +167, hors périmètre : -0, doublons écartés à la déduplication : -81, soit 439 dans le pool.
- Faits du pool venus d'un autre pack : 115 (par pack : section Relations).
- Destination des 439 faits du pool : Lexique 4 ; Règles 77 ; Endpoints et écrans 41 ; Tests attendus 91 ; Alertes / Questions ouvertes 49 ; annexe seule 101 ; écartés (sorte `other` ou inconnue) 76.
- Base : sha256 736eefba7302…, générée le 2026-11-24.
