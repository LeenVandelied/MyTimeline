---
pack: event
kind: domain
name: Événement
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: a2e0d8fa4a000ba1866f795abff26f6fb88f1748ae6a9b2813517206595203be
facts_in_base: 306
facts_in_pool: 361
facts_cited: 54
sections: event.sections.json
details: [event.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
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
| Unité de récurrence | Enum à trois valeurs, portée par le champ recurrenceUnit de l'événement du domaine, qui exprime la périodicité d'un événement (pointeur `backend:src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java:15-18`). | [#53c142807d114b66-1] [#9f47cf2ed415c352-1] |
| Version | Colonne de verrouillage optimiste non nulle de l'entité events, présente aussi dans le modèle de domaine sans annotation JPA. | [#14dc8524b3c647c3-1] [#9f47cf2ed415c352-1] |
| Égalité d'entité | Deux EventEntity sont égales seulement si leur id est non nul et identique, et le hash est celui de la classe, donc commun à toutes les instances. | [#8f73b2f51593d54c-1] |
| Produit de l'événement | Rattachement obligatoire d'un événement à un product via product_id, alors que le domaine ne porte que productId. | [#14dc8524b3c647c3-1] [#9f47cf2ed415c352-1] |

## 3. Règles {#rules}

### Mise à jour partielle
- Un PATCH n'applique que les champs non null, puis contrôle l'état fusionné. Un événement récurrent sans recurrenceUnit lève RecurrenceUnitRequiredException (400) [#98cf4b5faf0ea7a3-1] [#e627418030325863-1].
- Une recurrenceEndDate avant startDate lève RecurrenceEndDateBeforeStartException (422), l'égalité est tolérée [#98cf4b5faf0ea7a3-2] [#a2b9636c20b33081-1].
- Pour un autre type sans endDate explicite, endDate est alignée sur startDate [#469d0ef9c8a70cdc-2].
- Sur conflit de verrou optimiste, le contrôleur recharge l'état serveur et le joint à EventConflictException [#fd4d8848bb37eb45-1].
### Type et durée
- Un type autre que duration, ou une durée null, donne endDate égale à startDate [#f4f32f85e851330e-2] [#9d8ca0954a7123c8-3].
### Récurrence
- À la création, isRecurring à true exige un recurrenceUnit non vide [#6a6a2db764ed3efc-1].
- Une série sans fin est développée jusqu'à startDate plus MAX_UNBOUNDED_EXPANSION_YEARS ans, une borne explicite est honorée [#592a138d8cdd8079-1].
- expand lève IllegalArgumentException si startDate ou unit est null, ou si la fin précède le début, et la prévisualisation la traduit en 422 [#1a1f018e6f7eaffc-3] [#260f81d202fbedaa-1].
### Vérifié dans le code
- RecurrenceExpansionService.expand est appelé par RecurrencePreviewController, qui expose expansion.capped() dans la réponse recurrence-preview [#integrations/fa220ac41b24d700-1] [#260f81d202fbedaa-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java:65-75`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventServiceImpl.updateEvent | Quand un facteur de date change, endDate est recalculée depuis startDate pour type duration, et suit startDate pour les autres types sans endDate explicite. (partiel) | L169-184 | [#469d0ef9c8a70cdc-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| GlobalExceptionHandler.handleNotFound | Traduit EventNotFoundException, ProductNotFoundException, CategoryNotFoundException, UserNotFoundException, SessionNotFoundException et AvatarNotFoundException en 404 avec le message fixe Resource not found et le code NOT_FOUND. | L41-53 | [#272f8d8d7d9c6abc-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventController | Le contrôleur EventController expose ses routes sous le préfixe /api/events. | L29-30 | [#bf198858d7b51045-1] |
| EventController.createEvent | POST /api/events accepte un EventCreationRequest validé et répond avec un EventResponse. | L46-69 | [#c2d52af73209c0c3-1] |
| EventController.createEvent | La création répond 201 CREATED avec un EventResponse construit depuis l'Event créé. | L66-68 | [#c2d52af73209c0c3-2] |
| EventController.updateEvent | PATCH /api/events/{id} accepte un EventUpdateRequest validé et répond avec un EventResponse. | L71-73 | [#15b09c65b34b16dc-1] |
| EventController.deleteEvent | DELETE /api/events/{id} vérifie la propriété de l'événement puis appelle deleteById. | L97-105 | [#b47e4a8d8516d040-1] |
| EventController.deleteEvent | La suppression répond 200 OK sans corps après l'appel à deleteById. | L103-104 | [#19d5aee4350efd9d-1] |

## 5. Endpoints et écrans {#surface}

- Les routes événement sont dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java:29-30` sous /api/events [#bf198858d7b51045-1], et le client front est `frontend:services/eventService.ts:23-144` [#233f4b0dbeb05d4c-1].
- Un produit sans utilisateur ou appartenant à un autre caller lève AccessDeniedException, ce qui donne un 403 au JSON forbidden, et la suppression n'est alors pas exécutée [#integrations/31be9b56a73503a4-2] [#cd37dea64799f734-1].
- La suppression est un DELETE en une instruction sans clause de version et répond 200 sans corps, alors que le PATCH fait un contrôle optimiste de version [#b2c8a12ba0d6c2cb-1] [#19d5aee4350efd9d-1] [#c82b76bcb3e888be-1].
- Un id absent à la suppression lève EventNotFoundException quand aucune ligne n'est touchée, et le gestionnaire global la traduit en 404 au message fixe, comme les autres not found [#bec625ceb1fa0d16-1] [#272f8d8d7d9c6abc-1].
- POST /api/events/recurrence-preview est dans un contrôleur séparé de EventController, et le front valide sa réponse par schéma [#2b0d742a9f9403eb-1] [#233f4b0dbeb05d4c-1].
- Côté front, createEvent ne valide pas la réponse du serveur, alors que updateEventColor envoie un PATCH avec la seule couleur et échoue si la réponse est vide [#5a914d0f71ef712d-1] [#a176e19a8b475347-1].
- Le front liste les événements d'un produit par /users/{userId}/products/{productId}/events, une route hors du préfixe /api/events [#e1636c6acf0f6a7a-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 51), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java` | 23 | validation 14, other 4, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java` | 20 | endpoint 6, role_check 6, convention 4 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java` | 18 | validation 7, service_method 5, business_rule 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java` | 34 | test_case 23, validation 5, business_rule 2 |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 13 | convention 5, business_rule 3, validation 3 |
| `frontend:services/eventService.ts` | 17 | service_method 5, convention 4, other 4 |
| `backend:src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java` | 12 | business_rule 3, convention 3, test_case 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventConditionalCheckConstraintIntegrationTest.java` | 14 | test_case 5, convention 3, persistence_query 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java` | 14 | test_case 7, other 3, validation 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductEventCreationIntegrationTest.java` | 11 | convention 8, test_case 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 8 | convention 5, other 1, role_check 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 38 | 13 |  |
| backend-core | 27 | 7 |  |
| frontend-core | 12 | 2 |  |
| authorization | 2 | 1 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'un PATCH n'applique que les champs fournis et laisse le reste intact, dont productId, titre et endDate [#08a1a691c6416d10-1] [#78cddbd17e183338-1] [#89813e6014818567-1] [#50713e907064d823-1].
- Les tests fixent qu'une endDate explicite sur un single est persistée telle quelle, et qu'une endDate égale à startDate est tolérée [#749db667a0d97e9e-1] [#0bacc6b111c7d53a-1].
- Un test de contrat DTO reste une classe JUnit sans contexte Spring avec un ObjectMapper instancié directement [#backend-core/f8c15a124e9472b2-2].

## 9. Questions ouvertes {#questions}

- Les violations d'intégrité autres que l'unicité de catégorie finissent-elles toutes en 500 générique ? Selon le commentaire, le handler global DataIntegrityViolationException a été supprimé [#7f719a0e8a07aa0d-1], aucun fait de code ne le confirme.
- La relation EventEntity.product sans FetchType explicite est-elle voulue, alors que CategoryEntity.owner déclare LAZY [#backend-core/018b247f5c65754e-1] ?
- Les pluriels legacy de RecurrenceUnit sont-ils encore nécessaires ? La javadoc les garde jusqu'au réalignement Zod S10/S11 [#8f187701c95e76b2-1], le code les accepte toujours [#248944a8cbcae2ab-1].
- Pourquoi seul updateEvent côté frontend traite une réponse sans corps comme un échec, contrairement à createEvent et setEventArchived [#3ce22bef0fa348e3-1] ?

## 10. Alertes {#alerts}

- Le commentaire de CallerResolver.currentUser dit que la méthode ne lève jamais d'exception, mais elle délègue à userService sans garde locale [#0bc1c107d4295cab-1]. Un appelant qui compte sur ce contrat peut recevoir une exception, donc il faut la gérer ou ajouter la garde dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:69-74`.
- Selon le commentaire du port, deleteByIdReturningRowCount supprime sans contrôle du verrou optimiste, perte assumée et renvoyée à un test d'intégration . Le port ne prend qu'un id et rend un nombre de lignes , donc une suppression ne détecte pas un PATCH concurrent ⇒ Ne pas compter sur la version pour protéger la suppression [#8634b19eb71898e8-2] [#92ea5b8b1d75d1d3-1]
- Le champ color n'a aucun contrôle de format hex dans le DTO de création , et le commentaire dit que la répercussion côté frontend reste à faire . Le serveur accepte donc toute chaîne [#backend-core/af3d8994f27f9508-1] [#c79d155872b82780-1]
- Le setter de Event s'appelle setProduct alors qu'il reçoit et stocke productId, comme le getter et le champ [#7da0b405589ec288-1]. Chercher setProductId ne trouve rien et setProduct ne prend pas une entité produit, donc l'appeler avec un UUID de produit (`backend:src/main/java/com/matimeline/eventmanager/domain/models/Event.java:79`).
- Les tests de rejet du CHECK sur durationUnit n'affirment qu'une Exception générique [#27b42a4cf6d2382f-1]. Ils passent pour n'importe quel échec, donc ils ne protègent pas la contrainte ck_events_duration_unit_required. Asserter la cause exacte en les modifiant.

## 11. Couverture {#coverage}

- Fichiers du pack : 49 ; avec au moins un fait en base : 49 ; sans fait après remise en file : 0.
- Faits en base : 306, repris d'autres packs : +102, hors périmètre : -0, doublons écartés à la déduplication : -47, soit 361 dans le pool.
- Faits du pool venus d'un autre pack : 79 (par pack : section Relations).
- Destination des 361 faits du pool : Lexique 4 ; Règles 72 ; Endpoints et écrans 37 ; Tests attendus 78 ; Alertes / Questions ouvertes 29 ; annexe seule 83 ; écartés (sorte `other` ou inconnue) 58.
- Base : sha256 a2e0d8fa4a00…, générée le 2026-11-20.
