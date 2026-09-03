[BRIEFING ISSUE #439]

## Issue
[BACKEND] Câbler l'expansion de récurrence et exposer le flag capped

Le moteur d'expansion de récurrence existe (`RecurrenceExpansionServiceImpl`, `@Service`) et
calcule déjà correctement le flag `capped` (troncature par `MAX_OCCURRENCES=4000` OU par
l'horizon `MAX_UNBOUNDED_EXPANSION_YEARS=5`). MAIS le port `RecurrenceExpansionService` n'a
AUCUN appelant en `src/main` : le flag n'est exposé sur aucun chemin HTTP. Objectif de l'issue :
câbler `expand(...)` sur un endpoint réel pour rendre `capped` accessible au frontend (#67).

## DÉCISION DE CONTRAT — DÉJÀ TRANCHÉE (ne pas ré-ouvrir)
**Option 2 — endpoint de prévisualisation dédié `POST /api/events/recurrence-preview`.**
Actée par le dev le 2026-09-03, consignée en commentaire sur l'issue #439.
- **NE PAS** ajouter de champ `seriesInfo` ni quoi que ce soit à `EventResponse` (c'était l'Option 1, rejetée). `EventResponse.java` NE DOIT PAS bouger.
- Motif du rejet Option 1 : #67 exige un hint *live* pendant la saisie (le hint disparaît dès que l'utilisateur pose une `recurrenceEndDate` qui repasse sous 4000) — impossible avec un flag renvoyé seulement après soumission ; et Option 1 élargit un DTO partagé + recalcul à chaque GET.

### Contrat exact de l'endpoint
- **Route :** `POST /api/events/recurrence-preview` (authentifié comme le reste de `/api/events`, mais **pas de contrôle d'ownership** : calcul pur, ne touche aucune donnée utilisateur, pas de DB).
- **Requête (JSON) :** `{ startDate: LocalDate (requis), recurrenceUnit: RecurrenceUnit WEEK|MONTH|YEAR (requis), recurrenceEndDate: LocalDate|null (optionnel) }`.
- **Réponse 200 (JSON) :** `{ count: int, capped: boolean }` où `count = expansion.size()`, `capped = expansion.capped()`.
- **Erreurs :** champs requis manquants → 400 (`@Valid`). `recurrenceEndDate` strictement avant `startDate` → cohérent avec le CRUD existant (le front documente « garde service backend → 422 »). Le service `expand(...)` lève `IllegalArgumentException` dans ce cas ; mappe-le sur le MÊME statut que le chemin CRUD (réutiliser le ControllerAdvice / l'exception domaine `RecurrenceEndDateBeforeStartException` si c'est ce qui produit le 422 côté CRUD — vérifier avant de choisir, ne pas introduire une 2e sémantique d'erreur).

## Plan d'implémentation (dev, contrat Option 2)
```yaml
issue_439:
  fichiers_cles:
    - "backend/.../application/dtos/RecurrencePreviewRequest.java (NEW: startDate @NotNull, recurrenceUnit @NotNull, recurrenceEndDate?)"
    - "backend/.../application/dtos/RecurrencePreviewResponse.java (NEW: int count, boolean capped)"
    - "backend/.../infrastructure/adapters/controllers/EventController.java (ajouter @PostMapping(\"/recurrence-preview\") + injecter le port RecurrenceExpansionService dans le constructeur) — OU un RecurrencePreviewController dédié si plus propre"
    - "backend/.../domain/ports/services/RecurrenceExpansionService.java (port EXISTANT : réutiliser expand(...) tel quel, NE PAS dupliquer la logique de capping)"
    - "backend/src/test/.../ (test d'endpoint : cas sous la limite capped=false, cas au-dessus capped=true, cas endDate<startDate → statut d'erreur attendu)"
  couches_touchees: ["application", "infrastructure"]
  strategie_test: "integration MockMvc sur l'endpoint (capped/non-capped/erreur) ; le service lui-même est déjà couvert par RecurrenceExpansionServiceImplTest (15 réfs) — NE PAS le casser"
  risque_regression: "EventResponse NON touché (Option 2). Le capped DOIT venir de expansion.capped() (MAX_OCCURRENCES / MAX_UNBOUNDED_EXPANSION_YEARS), jamais recalculé/contourné (#54, garde mémoire/CPU)."
  ordre_ecriture: "DTOs → controller (inject port) → tests d'endpoint"
  zod_dto_sync: "NON pour EventResponse. Le typage frontend du contrat preview est le périmètre de #67 (vague suivante)."
  possibly_done: false
```

## Triage
Taille: M
Modèle: opus
Effort: high

<!-- ===== br-events.md ===== -->
# Context-pack domaine : `events`

> Domaine : `events` — gestion des événements d'une timeline (création, mise à jour partielle, suppression, listing par produit), chaque événement étant rattaché à un `Product` et porteur de dates calculées (durée ou date unique).
> Acteurs principaux : `ROLE_USER` (utilisateur authentifié via cookie JWT), `Anonymous` (bloqué), `system` (mappers / `Utils.calculateEndDate` qui calculent dates et valeurs par défaut).

---

## 1. Lifecycles (machines à états)

**EventEntity** — CRUD simple, pas de machine à états `status`/`state`. `#44` (S9) a introduit un champ **`archived`** (`EventEntity.java:57-58`, `Event.java`) — flag de type soft-delete existant, mais `DELETE` reste une suppression physique via `deleteById` (le flag `archived` ne remplace pas encore le hard-delete). Nuance : soft-delete partiellement amorcé, pas complet.

Le seul "état" implicite est le `type`, qui n'est PAS une transition mais une nature figée à la création :

| `type`     | Description                                              | Conséquence métier                                                                 |
|------------|----------------------------------------------------------|------------------------------------------------------------------------------------|
| `duration` | Événement avec durée → `endDate` = `startDate` + `durationValue` × `durationUnit` | `Utils.calculateEndDate` applique `plusDays/Weeks/Months/Years`                     |
| `single`   | Événement ponctuel → `endDate` = `startDate`             | `calculateEndDate` retourne `startDate` inchangée (branche `if` non prise)          |

⚠️ Aucune contrainte d'enum sur `type` côté backend : toute chaîne hors `duration`/`single` est acceptée et traitée comme `single` (branche `if` non prise → `endDate = startDate`).

**CHECK constraint `ck_events_recurrence_unit`** (V7, #44) : limite `recurrence_unit` à WEEK/MONTH/YEAR au niveau DB (lié à PIT-S9-001). Une valeur legacy invalide en base fait échouer l'insertion/maj → V10 (prévue S12) neutralisera les valeurs invalides existantes.

---

## 2. Actions x Acteurs

| Action                                                        | ROLE_USER | Anonymous | system | Notes                                                                                  |
|--------------------------------------------------------------|:---------:|:---------:|:------:|----------------------------------------------------------------------------------------|
| `POST /api/events` (créer)                                    | ✅        | ❌        | —      | Bloqué anonyme via `SecurityConfig`. ✅ `@Valid` + ownership productId (Sprint 1 #31/#91). |
| `PATCH /api/events/{id}` (maj partielle)                      | ✅        | ❌        | —      | ✅ Ownership event→product→user (403) + DTO typé `@Valid` (Sprint 1 #28/#30).           |
| `DELETE /api/events/{id}` (supprimer)                         | ✅        | ❌        | —      | ✅ Ownership (403 si event d'autrui) implémenté Sprint 1 #30. Suppression physique.     |
| `GET /api/users/{userId}/products/{productId}/events` (lister)| ✅        | ❌        | —      | Endpoint porté par `ProductController`. `userId` vérifié vs JWT via `JwtService`.      |
| Calcul `endDate`                                             | —         | —         | ✅     | `Utils.calculateEndDate` à la création uniquement (pas recalculé au PATCH).            |
| Défaut `startDate = LocalDate.now()`                          | —         | —         | ✅     | Appliqué dans `EventServiceImpl.createEvent` si `date` null.                            |

---

## 3. Business Rules atomiques

### BR-EVE-001 — Nom d'événement requis et borné
**Règle** : un `ROLE_USER` MUST fournir un `name` non vide (1–100 caractères) à la création.
**Pourquoi** : intégrité des données, le `name` est mappé vers `Event.title` (champ d'affichage).
**Implémentation** : `EventCreationRequest.name` (`@NotBlank` + `@Size(min=1, max=100)`).
**✅ IMPLÉMENTÉ Sprint 1 (#31/#91)** : `@Valid` ajouté sur `EventController.createEvent(@RequestBody ...)` → la contrainte `@Size(min=1,max=100)` est désormais déclenchée (titre vide → 400). Reste un seuil divergent avec le frontend (`eventCreationSchema.name.min(3)` vs back min=1) à harmoniser.
**Test attendu** : `EventControllerTest.shouldReject400WhenNameBlankOrTooLong` (à créer — échouera tant que `@Valid` absent).

### BR-EVE-002 — Produit cible obligatoire et existant
**Règle** : un `ROLE_USER` MUST fournir un `productId` non null référençant un `Product` existant, sinon la création échoue.
**Pourquoi** : `EventEntity.product` est `@JoinColumn(nullable=false)` ; un event orphelin est interdit.
**Implémentation** : `EventCreationRequest.productId` (`@NotNull`) + `EventServiceImpl.createEvent` → `productRepository.findDomainProductById(...).orElseThrow(ProductNotFoundException)`.
**Test attendu** : `EventServiceImplTest.shouldThrowProductNotFoundWhenProductIdUnknown`.

### BR-EVE-003 — endDate calculée selon le type
**Règle** : le `system` MUST calculer `endDate` = `startDate` + (`durationValue` × `durationUnit`) quand `type='duration'`, et `endDate = startDate` quand `type='single'`.
**Pourquoi** : cohérence temporelle de l'affichage timeline ; un event `single` ne dure qu'un jour.
**Implémentation** : `Utils.calculateEndDate(EventCreationRequest, startDate)` (switch sur `durationUnit` : `days/weeks/months/years`).
**Test attendu** : `UtilsTest.shouldComputeEndDatePerDurationUnit` + `shouldReturnStartDateForSingleType`.
> ⚠️ **PIÈGE `type='single'` — la durée est OBLIGATOIRE malgré tout** ([[PIT-S44-001]], vérifié à la source S44 #300) : `EventCreationRequest.durationValue` (`@NotNull`) et `durationUnit` (`@NotBlank`) sont **INCONDITIONNELS** — `POST /api/events` renvoie **400** si on les omet, y compris pour un event ponctuel où `calculateEndDate` les IGNORE (branche `if` non prise → `endDate = startDate`). Asymétrie avec `recurrenceUnit`, lui conditionné proprement (`@AssertTrue isRecurrenceUnitConsistent`). **Côté client : envoyer des valeurs neutres (`durationValue: 0`, `durationUnit: 'days'`) sur le chemin `single`** — sans effet métier (cf. `toEventCreationPayload`, `frontend/src/types/event.ts`). ⚠ Ne frappe QUE le chemin direct `POST /api/events` : la création couplée (`POST /api/products` avec events imbriqués) y échappe car `ProductCreationRequest.events` n'a PAS de `@Valid` → pas de cascade ; **ne pas « corriger » cette absence**, elle est structurelle (`productId` `@NotNull` est insatisfiable sur un event imbriqué, le produit n'existant pas encore) — cf. [[PIT-S44-002]].

### BR-EVE-004 — durationUnit valide quand type=duration
**Règle** : quand `type='duration'`, `durationUnit` MUST être l'une de `days/weeks/months/years`, sinon `IllegalArgumentException`.
**Pourquoi** : éviter un calcul de date silencieusement faux.
**Implémentation** : `Utils.calculateEndDate` branche `default` → `throw new IllegalArgumentException`.
**⚠️ FAILLE NPE** : si `type='duration'`, `durationValue != null` et `durationUnit == null`, `switch(null)` lève une `NullPointerException` (aucun null-guard avant le switch). `durationUnit` n'est pas garanti non-null à la création (`@NotBlank` jamais déclenché faute de `@Valid`).
**Test attendu** : `UtilsTest.shouldThrowOnUnknownDurationUnit` + `shouldNotNpeWhenDurationUnitNull` (à créer).

### BR-EVE-005 — startDate par défaut = aujourd'hui
**Règle** : si `date` est null à la création, le `system` MUST utiliser `LocalDate.now()` comme `startDate`.
**Pourquoi** : un event sans date de début n'a pas de sens sur la timeline.
**Implémentation** : `EventServiceImpl.createEvent` → `startDate = (date != null) ? date : LocalDate.now()`.
**Test attendu** : `EventServiceImplTest.shouldDefaultStartDateToTodayWhenDateNull`.

### BR-EVE-006 — recurrenceUnit requis quand isRecurring=true
**Règle** : quand `isRecurring=true`, `recurrenceUnit` DEVRAIT être obligatoire (`weeks/months/years`).
**Pourquoi** : une récurrence sans unité est inexploitable.
**✅ RÉSOLU BACKEND (Sprint 9 #44 + Sprint 12 #54)** : enum `RecurrenceUnit` (WEEK/MONTH/YEAR) livré S9 (`RecurrenceUnit.java`, parsing tolérant `fromString`). S12 #54 ajoute la contrainte « requis si `isRecurring=true` » sur les DEUX chemins d'écriture : CREATE via `EventCreationRequest.isRecurrenceUnitConsistent()` (`@AssertTrue @JsonIgnore` → 400) ; PATCH via garde service dans `EventServiceImpl.updateEvent` sur l'état fusionné (`isRecurring=true && recurrenceUnit==null` → `RecurrenceUnitRequiredException` → 400, review S12). Cf. [[PAT-S12-001]]. **✅ FRONT RÉSOLU (Sprint 18 #66)** : refine conditionnel Zod `seriesErr` (`recurrenceUnit` requis si `isRecurring=true`) dans `EventEditForm`/`types/event.ts`.
**Test** : `EventControllerValidationTest` (create 400) + `EventServiceImplTest`/`EventPatchAndRecurrenceIntegrationTest` (PATCH 400 + non-régression « recurrenceUnit préexistant → 200 »). Front : `EventEditForm.test.tsx` (`seriesErr`).

### BR-EVE-007 — isRecurring obligatoire à la création
**Règle** : un `ROLE_USER` MUST fournir `isRecurring` (non null) à la création.
**Pourquoi** : le flag pilote la logique de récurrence côté affichage.
**Implémentation** : `EventCreationRequest.isRecurring` (`@NotNull`).
**✅ IMPLÉMENTÉ Sprint 1 (#31)** : `@Valid` présent → `@NotNull` sur `isRecurring` désormais déclenché (voir BR-EVE-001).
**Test attendu** : `EventControllerTest.shouldReject400WhenIsRecurringNull`.

### BR-EVE-008 — Ownership requis sur PATCH / DELETE
**Règle** : un `ROLE_USER` MUST NOT modifier ou supprimer un event qui n'appartient pas à l'un de ses produits.
**Pourquoi** : isolation des données entre utilisateurs (confidentialité, intégrité).
**✅ IMPLÉMENTÉ Sprint 1 (#30/#91)** : `EventController` vérifie l'ownership sur `createEvent` (productId du caller), `updateEvent` et `deleteEvent` via le helper `checkEventOwnership` (`event → productId → product.getUser().getId() == caller.getId()`, sinon 403). Identité dérivée du JWT (`resolveCaller`), jamais d'un path param. `JwtException` → 401 (pas 500).
**Test attendu** : `EventControllerSecurityTest.shouldReturn403WhenPatchingForeignEvent` + `shouldReturn403WhenDeletingForeignEvent`.

### BR-EVE-009 — Modèle couleur event (migration design v3 #44)
**Règle** : l'event porte UNE couleur unique cohérente entre backend et frontend.
**Pourquoi** : éviter des erreurs de validation/runtime divergentes ; le modèle 3-couleurs était redondant.
**✅ BACKEND RÉSOLU (Sprint 9, #44)** : colonne UNIQUE `color` (`EventEntity.java:59`, `V7__design_v3_schema.sql:67-79`) ; `border_color`/`text_color` **DROP définitif** (migration irréversible).
**✅ FRONTEND RÉSOLU (Sprint 18 #66)** : migration modèle **1-couleur** (`backgroundColor`/`color` seul, fin de `borderColor`/`textColor`) sur `types/event.ts` (schéma Zod unifié + `HEX_COLOR_REGEX`, validation hex `colorErr`), `EventEditForm.tsx` (preview) ET `EventContent.tsx` (barre calendrier / vue lecture — migration complète, PIT-S18-001). Encre de texte calculée par contraste WCAG via helper mutualisé `frontend/src/lib/color.ts` (`contrastInk`/`textOn`, cf. [[PAT-S18-001]]) — remplace `text-white` hardcodé illisible. Aucune validation format hex côté backend (`color` String libre → validation front uniquement).
**Test** : `frontend/src/lib/color.test.ts` (contraste AA), `types/event.test.ts` (hex), `EventEditForm.test.tsx` (`colorErr`).

### BR-EVE-010 — Champ allDay : nom de sérialisation
**Règle** : le frontend MUST lire le champ booléen "journée entière" sous la clé sérialisée par le backend.
**Pourquoi** : éviter un `undefined` silencieux à la désérialisation.
**⚠️ INCOHÉRENCE** : backend sérialise `isAllDay` (getter `getIsAllDay` → préfixe Jackson `isAllDay`), tandis que `eventSchema` (`types/event.ts`) attend `allDay`. Le mapping `mapToFullCalendarEvent` lit `event.allDay` → risque de `undefined`.
**Test attendu** : `eventSerialization.test.ts.shouldDeserializeIsAllDayField` (après alignement des noms).

### BR-EVE-011 — Quota d'événements actifs selon le tier (anticipation monétisation)
**Règle** : le nombre d'événements **actifs (non archivés)** d'un utilisateur DOIT être plafonné selon son `tier` (`FREE`=20, `PLUS`=200, `PRO`=illimité). Un événement **récurrent compte pour 1** (la récurrence est une propriété, pas un multiplicateur). Les produits et catégories restent **gratuits et illimités** — l'unité facturable est l'événement.
**Pourquoi** : modèle de monétisation par abonnement pas cher débloquant plus d'événements. Compter par lane/produit serait contournable (1 catégorie = 300 events).
**⚠️ NON IMPLÉMENTÉ / ANTICIPATION (issue #88)** : couture `PlanPolicy.canCreateEvent(user)` posée mais **no-op** (renvoie toujours `true`, plafonds en mode illimité) tant que la monétisation n'est pas lancée. Champ `User.tier` (défaut `FREE`). Le paiement réel (Stripe, paywall, webhooks) = epic « Monétisation » **post-MVP, hors périmètre**.
**Lien** : « actif » = non archivé (dépend du soft-delete événement, cf. modèle v3 #44) ; comptage à garder atomique en cas de création concurrente / offline (#76).
**Test attendu** : `PlanPolicyTest.shouldCountActiveNonArchivedEvents` + `shouldCountRecurringAsOne` + `EventControllerQuotaTest.shouldReturn402WhenTierLimitReached` (quand l'enforcement sera activé).

### BR-EVE-012 — recurrenceEndDate (champ #44, non couvert par une règle antérieure)
**Règle** : `recurrenceEndDate` borne la fin d'une récurrence.
**Implémentation** : champ réel `EventEntity.java:47-48`, `Event.java` ; exposé en PATCH `EventUpdateRequest.java:37`.
**✅ RÉSOLU BACKEND (Sprint 14 #168)** : garde au niveau service sur l'état fusionné du PATCH (`recurrenceEndDate < startDate` → `RecurrenceEndDateBeforeStartException` → **422**, cohérent [[DEC-S12-001]]/[[DEC-S14-001]]). `isBefore` stricte (`end == start` toléré). Portée update uniquement (`recurrenceEndDate` absent du DTO create). **✅ COMPLÉTÉ BACKEND (Sprint 65 #452)** : une récurrence **sans** `recurrenceEndDate` n'est plus développée jusqu'au seul plafond d'occurrences (`MAX_OCCURRENCES = 4000`, soit ~333 ans en mensuel) mais jusqu'à un **horizon temporel** `RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS = 5` — mensuel 61 occurrences, hebdomadaire 261, annuel 6. L'horizon ne s'applique **qu'aux séries sans borne explicite** : une `recurrenceEndDate` fournie est honorée telle quelle et n'est jamais rognée (cf. [[DEC-S65-001]]). `capped = true` dans les deux cas de troncature. **La règle elle-même est INCHANGÉE** : `recurrenceEndDate` reste hors du DTO de création (décision produit du 2026-09-02). ⚠ Le service portant ce calcul n'a **aucun appelant** dans `src/main` — durcissement préventif en attente du câblage prévu par #439/#67. ⚠ FRONT : refine Zod `recurrenceEndDate >= startDate` encore dû (#150, S15).
**Test** : `EventServiceImplTest` (bornes </==/> startDate). Filet DB complémentaire : contrainte de présence #128/V11 (pas la comparaison de dates).

### BR-EVE-013 — archived en PATCH uniquement (asymétrie create/update)
**Règle** : `archived` (flag soft-delete amorcé) est modifiable via PATCH mais pas fixable à la création.
**Implémentation** : présent en PATCH `EventUpdateRequest.java:40`, mappé `EventServiceImpl.java:90-92` ; ABSENT de `EventCreationRequest` (pas de création d'event déjà archivé).
**Test attendu** : `EventServiceImplTest.shouldToggleArchivedOnPatch`.

### BR-EVE-014 — Asymétrie DTO create vs update (bug produit potentiel)
**Règle (constat historique)** : `EventCreationRequest` n'exposait PAS `color`/`archived`/`recurrenceEndDate` — seul `EventUpdateRequest` les supportait.
**✅ RÉSOLU PARTIEL (Sprint 14 #168)** : `color` (String nullable, additif non-cassant) désormais fournissable à `POST /api/events` et threadé dans `EventServiceImpl.createEvent`. `archived`/`recurrenceEndDate` restent PATCH-only par choix (BR-EVE-013 : pas de création déjà archivée ; recurrenceEndDate hors scope create). ⚠ FRONT : répercuter `color` au create côté Zod/eventService (#150, S15). Aucune validation format hex backend (color String libre, assumé — le backend reste source tolérante).
**Test** : `EventCreationRequestContractTest` (color exposé au create / absent non-cassant).

### BR-EVE-015 — Édition concurrente d'un event → 409 (optimistic locking)
**Règle** : deux modifications concurrentes du même event (via `@Version` sur `EventEntity`) → la seconde MUST échouer avec **HTTP 409** (pas 500), corps plat `{"error":"resource was modified concurrently, please retry"}`.
**Pourquoi** : sans mapping, `ObjectOptimisticLockingFailureException` remontait en 500 → le frontend (qui gère déjà l'état `conflict`) ne pouvait pas se déclencher.
**✅ RÉSOLU BACKEND (Sprint 25 #200)** : `@ExceptionHandler(ObjectOptimisticLockingFailureException.class)` dans `GlobalExceptionHandler`, scopé au TYPE PRÉCIS (jamais un supertype `DataIntegrityViolation` fourre-tout — cf. convention backend #3). Aucun mapping local Category/Product en doublon. **✅ FRONT (Sprint 25 #77)** : 409 intercepté sur le flux event (EventContent.onSubmit, PAS l'interceptor axios global → n'affecte pas les 409 name-conflict), ouvre `ConflictDialog` partagé, action « recharger » = invalidation ciblée TanStack (`queryKeys.products.withEvents`), remplace `window.location.reload()`.
**Test** : slice déterministe `GlobalExceptionHandlerOptimisticLockTest` (mock→409) + intégration `EventOptimisticLockConflictIntegrationTest` (version stale simulée sans threads, déterministe). Front : `ConflictDialog.test.tsx`, `EventContent.test.tsx` (409→dialog, 400/404→pas de dialog).
**⚠ Follow-up** : modale COMPARATIVE (force-save vs version-serveur + diff champs) NON faite — le corps 409 est plat (pas de serverVersion/yourVersion). Nécessite d'enrichir le contrat 409 backend d'abord.

### BR-EVE-016 — endDate ≥ startDate appliqué BACKEND (PATCH), plus seulement frontend
**Règle** : sur `PATCH /api/events/{id}`, `endDate` MUST être ≥ `startDate` (comparaison stricte, `==` toléré) sur l'ÉTAT FUSIONNÉ (payload + valeurs persistées), pas seulement sur la paire fournie.
**Pourquoi** : la validation ne vivait qu'au frontend (refine Zod) — un client hors navigateur ou un PATCH `endDate` seul contournait le contrôle.
**✅ RÉSOLU BACKEND (Sprint 25 #201)** : garde à DEUX niveaux — (1) `@AssertTrue isEndDateConsistent` sur `EventUpdateRequest` (fail-fast quand les 2 dates sont dans le payload → 400) ; (2) garde SERVICE sur l'état fusionné dans `EventServiceImpl.updateEvent` (`EndDateBeforeStartException` → **422**, aligné sur `RecurrenceEndDateBeforeStartException`/BR-EVE-012) qui couvre le cas `endDate` seul < `startDate` persisté. Lié à BR-EVE-003 : pour `type=duration` la durée reste source de `endDate` (endDate explicite écrasée si startDate/durée changent) ; pour `type=single` l'`endDate` explicite est persistée telle quelle. Voir [[DEC-S25-001]].
**Test** : `EventServiceImplTest` (endDate-seul < startDate → rejet, borne == tolérée, flip type duration→single) + `EventPatchAndRecurrenceIntegrationTest` (422, rien persisté).

> ⚠ Note numérotation : l'issue #201 parlait de « BR-EVE-002 » pour endDate≥startDate, mais BR-EVE-002 (ci-dessus) = « Produit cible obligatoire ». La règle endDate≥startDate est formalisée ici en **BR-EVE-016** (éviter la collision). BR-EVE-003 (dérivation endDate) est étendue au PATCH par le même sprint.

---

## 4. Dépendances inter-domaines

- **events → products (fort)** : `EventEntity` `@ManyToOne ProductEntity` (`@JoinColumn product_id, nullable=false`, `@JsonBackReference`). Côté `Product`, `@OneToMany(mappedBy="product", cascade=ALL, orphanRemoval=true, @JsonManagedReference)` → la suppression d'un produit **cascade** sur ses events.
- **Modèle domaine** : `Event` porte `productId: UUID` (pas l'entité) → isolation hexagonale correcte au niveau domaine.
- ⚠️ **`events` n'a PAS de colonne `user_id`** (schéma réel V1) : l'appartenance d'un event à un utilisateur est **transitive** via `product_id → products.user_id`. Toute opération « par utilisateur » sur events (purge suppression de compte #78, futurs filtres) doit joindre `products` (sous-select `product_id in (select id from products where user_id=:uid)`). (validé Sprint 13 #78)
- **Listing des events** : porté par `ProductController` (`GET /api/users/{userId}/products/{productId}/events`), pas par `EventController` → le domaine `events` dépend de l'auth produit/user.
- ⚠️ **Couplage infra-infra** : `EventRepositoryJpaImpl` injecte `ProductRepositoryJpaImpl` (classe concrète) au lieu du port `ProductRepository` → viole l'inversion de dépendance hexagonale.
- ⚠️ **Fuite DTO dans le port domaine** : `EventService` (port domaine) référence `EventCreationRequest` (couche application) dans `createEvent(...)` → le DTO applicatif pollue la définition du port.
- ⚠️ **Impact `@SQLRestriction("archived=false")` de `ProductEntity`** : les events d'un produit archivé deviennent inaccessibles via `GET events` — le produit est résolu par `findById` d'abord, qui renvoie 404 (produit filtré par la restriction), donc le listing des events échoue en amont. Dépendance events↔products à connaître lors du debug « events introuvables ».

---

## 5. Anti-patterns documentés

- ~~**IDOR (PATCH & DELETE)**~~ : ✅ RÉSOLU Sprint 1 #30/#91 — ownership sur create/update/delete (cf. BR-EVE-008).
- ~~**`@Valid` manquant** sur `POST /api/events`~~ : ✅ RÉSOLU Sprint 1 #31 — `@Valid` posé sur tous les `@RequestBody` + `@EnableMethodSecurity` + session STATELESS (cf. BR-EVE-001/007).
- **Fuite du modèle domaine en réponse REST** : `Event` (domaine) renvoyé directement par POST/PATCH et par le GET liste — aucun response DTO.
- **Logique métier dans le controller** : `EventController.updateEvent` contient la boucle de mise à jour champ-par-champ avec `instanceof` (parsing `durationValue`/`isRecurring`) — devrait être en couche service.
- **Mismatch sémantique name↔title** : `EventCreationRequest.name` mappé vers `Event.title`.
- ~~**Exception avalée** : `findEventById` fait `printStackTrace` + `Optional.empty()`~~ ✅ RÉSOLU S12 #95 : corps réduit à `return eventRepository.findEventById(id);` (1 hit, plus de swallow, MEMO-007).
- **Double round-trip DB** : ~~`findEventById`~~ ✅ RÉSOLU S12 #95 ; RESTE `deleteById` (`existsById` puis `deleteById`) — cf. RECOMMAND_FOLLOWUP #95 (nuance : `existsById` sert le 404, fix ≠ simple suppression). [triage XS]
- **Check vide dupliqué** : `EventServiceImpl.findDomainEventByProductId` lève `EventNotFoundException` sur liste vide, puis `ProductController` re-teste `isEmpty()` après coup.
- ~~**NPE potentielle** : `Utils.calculateEndDate` `switch(durationUnit)` sans null-guard~~ ✅ RÉSOLU S12 #54 : null-guard + `InvalidDurationUnitException` → 422 (cf. BR-EVE-004, [[DEC-S12-001]]).
- **Suppression physique** : `deleteById` supprime réellement la ligne. Nuance (S9 #44) : un champ `archived` (`EventEntity.java:57-58`, `Event.java`) existe désormais (soft-delete amorcé) mais `DELETE` reste un hard-delete — le flag n'est pas encore branché sur la suppression.
- ~~**`@CrossOrigin(origins="*")`** sur `EventController`~~ : ✅ RETIRÉ Sprint 1 #30 — CORS gérée uniquement par `SecurityConfig` (`allowCredentials=true` + `allowedOrigins localhost:3000`).
- **Schémas Zod dupliqués/divergents** : ~~`eventEditSchema` défini deux fois~~ ✅ RÉSOLU (doublon supprimé #150, source unique `types/event.ts` — confirmé S18 #66) ; ~~`name.min(3)` front vs `@Size(min=1)` back~~ ✅ harmonisé 1–100 front (S18 #66) ; RESTE : champ `allDay` vs `isAllDay` (cf. BR-EVE-010, non traité) ; `type` enum strict front vs `@NotBlank` libre back.

---

## Référence

- Coverage actuelle : `coverage-events.md`
- Backend :
  - Controller : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java`
  - Service : `backend/src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java`
  - DTO : `backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java`
  - Calcul dates : `backend/src/main/java/com/matimeline/eventmanager/utils/Utils.java`
  - Entité : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java`
  - Port service : `backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/EventService.java`
  - Listing : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java`
- Frontend :
  - Schémas/types : `frontend/src/types/event.ts`
  - Formulaire édition : `frontend/src/components/EventEditForm.tsx`
  - Service API : `frontend/src/services/eventService.ts`

## Context-packs complets (chemin committé stable — PAS un /tmp)
Le pack domaine `br-events` est inliné ci-dessus. Les archives lourdes de pitfalls backend
et les packs cp-hexagonal/cp-backend NE sont PAS recopiés ici pour économiser le contexte.
**Lis EN PRIORITÉ, avant tout code**, le briefing complet committé qui les inline tous :
`docs/memory/sprints/sprint-69/briefing-439.md` (cp-hexagonal, cp-backend, br-events, pit-backend,
+ rules-jit/backend.md). Chemin stable versionné — lecture fiable, contrairement au piège /tmp.


<!-- ===== rules-jit/backend.md ===== -->
<!-- PROVENANCE : copie Layer B de rules-jit/backend.md du plugin ai-env 0.3.1 (Layer A).
     Source : ~/.claude/plugins/cache/edel-projects/ai-env/0.3.1/rules-jit/backend.md
     Copie volontaire (et non symlink) : le cache plugin est hors dépôt et versionné 0.3.1.
     À re-differ contre la source à chaque bump du plugin. -->

---
globs: **/*.java
---

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

# Regles backend Java/Quarkus

## Architecture hexagonale
Voir `.claude/rules/hexagonal.md` pour structure et imports interdits par couche.

## Conventions le langage backend
- Records pour DTOs (request/response immuables)
- Sealed Classes pour etats metier
- Pattern Matching, Streams
- Validation : @Valid + Bean Validation sur tous les @RequestBody
- Reponses : Response.ok(dto).build() ou Response.created(uri).build()
- Erreurs : le format d'erreur
- Logging : Jboss Logger injecte — jamais System.out
- Config : @ConfigProperty pour valeurs externalisees
- JPA constructeurs : `public Entity() {}` (pas protected)

## Regles transversales entites
- Soft delete : champ `deleted_at` obligatoire, jamais de DELETE physique (BR-18)
- UUID v7 sur toutes les cles primaires (BR-19)
- Ownership : verifier `keycloakId` sur chaque endpoint GET/PUT/DELETE securise, admins bypassent via isAdmin (BR-31)

## Securite
- @RolesAllowed sur chaque endpoint protege
- Aucune donnee sensible dans les logs
- Aucune concatenation SQL
- l'identité de sécurité (pas JsonWebToken) avec quarkus-oidc

### Logs avec exception cause — PII leak prevention (S190 #1554)

**Anti-pattern (interdit)** dans les `ExceptionMapper`, adapters HTTP externes (Keycloak, Stripe, SendGrid),
schedulers, et toute couche `infrastructure/` :

```java
LOG.warn("...", ex);              // Jboss Logger expose le message + stacktrace
LOG.error("...", ex);             // idem
LOG.warnv("...: {0}", ex.getMessage());  // expose message brut
```

**Risque** : `ex.getMessage()` peut contenir
- l'input utilisateur (validation : "email john@x.com is invalid")
- des fragments de payload externe (Keycloak/Stripe API error)
- des fragments SQL (SQLException reflete les valeurs colonnes)
- le keycloakId clair en cause de cache miss

**Pattern correct** :

```java
// 1. Log type d'exception au niveau warn/error (pas le message)
LOG.warnv("Operation failed: {0}", ex.getClass().getSimpleName());

// 2. Stacktrace en debug uniquement (masque en prod)
LOG.debug("Operation stacktrace", ex);
```

**Exceptions tolerees** (LOW risk) :
- Couche application/service interne ou les exceptions sont controlees (messages metier sans input user) — documenter `// LOW : message safe (no user input)`
- Tests `@QuarkusTest` (logs locaux, pas de prod)

**Reference** : Sprint 190 #1554 (audit), #1556 (LogPiiHelper.kcPrefix pour keycloakId).

## Migrations l'outil de migration
Runbook grandes tables (> 1M rows) : voir docs/devops/migrations-runbook.md
- `db/migration/V{n}__{description}.sql`
- Rollback commente dans chaque fichier
- Jamais modifier une migration deja appliquee
- Derniere migration : `ls <migrations-dir>/V*.sql | sort -V | tail -1` (ne pas hardcoder — hook `check-stack-drift.sh` avertit en cas de drift)

## l'ORM
- `persist()` = INSERT only. Pour upsert -> `getEntityManager().merge()`
- TranslationRepository implemente directement par l'ORMRepository

## Null safety
- `orElseThrow()` quand l'entite DOIT exister — jamais `orElse(null)` + null checks downstream
- Fallback explicite obligatoire pour les valeurs nullable externes (locale, enum)

## Tests @QuarkusTest
- `@TestTransaction` (pas `@Transactional`) pour rollback automatique — `@Transactional` commit et pollue les tests suivants
- Test data : valeurs uniques par test (generateur AtomicInteger ou UUID), jamais de constantes partagees entre tests

## Qualite du code
- Methodes > 20 lignes : decomposer
- Complexite cyclomatique > 5 : refactorer
- Pas de magic numbers/strings
- Nommage explicite
- Risque N+1 : fetch join ou @BatchSize
- Toute liste paginee
- Index DB prevus pour les colonnes filtrees/triees


## Execution tests — wrapper silencieux (optim tokens)

Ne JAMAIS lancer `mvn test`, `mvn verify` ou `mvn test -Dtest=...` directement dans le contexte d'un agent IA. L'output Quarkus bootstrap + logs par test + stack traces = 30-80 KB absorbes dans le contexte, multiplies par chaque iteration.

**Usage obligatoire** :
```bash
./scripts/test-quiet.sh backend    # Unit backend — resume <= 1KB
./scripts/test-quiet.sh unit       # Backend + Frontend
```

wrapper redirige le log complet dans `/tmp/<project-lower>-tests-<timestamp>.log` et retourne uniquement :
- Ligne de totalisation Surefire (`Tests run: N, Failures: F, Errors: E, Skipped: S`)
- Top 10 des tests en echec avec classe/methode
- Code de sortie (0 = OK)

Pour analyser une stack trace specifique, lire le log `/tmp/<project-lower>-tests-*.log` cible (Read avec `offset`/`limit`), jamais `cat` complet.

**Pour tests massifs (>500 tests, CI-like)** : deleguer a l'agent `test-runner` (Haiku) via Agent tool — il execute, parse, renvoie un resume <=500 tokens au lead sans polluer le contexte principal.

Reference : audit tokens 2026-04-24 — `mvn test` + `vitest run` repetes = cause #2 de saturation apres multi-agent reviews.


## Dépendances intra-sprint
- Aucune dépendance amont. #439 est la vague 1.
- **#439 débloque #67** (vague 2, frontend) : le contrat `POST /api/events/recurrence-preview` → `{count, capped}` que tu livres sera consommé par le formulaire. Rends le contrat JSON stable et documenté (noms de champs exacts `count`, `capped`).

## Designer
Non applicable (backend pur, aucun rendu).

## Contraintes
- Branche cible : `claude/sprint-69-d576fe` (déjà checkout — NE PAS créer/switcher de branche, NE PAS toucher `sprint/69` distant).
- Architecture hexagonale STRICTE : `domain/` sans import Spring/JPA ; le controller (infrastructure) injecte le port `RecurrenceExpansionService` (domain) ; les DTOs vont en `application/dtos/`. Ne PAS dupliquer la logique du service.
- Migration Flyway : AUCUNE attendue (calcul pur, pas de schéma). Si tu crois en avoir besoin, STOP et signale — c'est un signal d'erreur de conception.
- Commit : 1 commit logique, gitmoji français (ex. `:sparkles: feat(events): endpoint recurrence-preview exposant le flag capped (#439)`). `git add` CIBLÉ sur tes fichiers uniquement (jamais `-A` : worktree partagé).
- Tests inline OBLIGATOIRES via `./scripts/test-quiet.sh <scope>` (scope backend). Faire tourner AVANT de rendre. Ne pas casser `RecurrenceExpansionServiceImplTest` ni les tests de contrat `EventResponse`.
- Si volume tests > 500 OU temps > 3 min : signale `RECOMMAND_TEST_RUNNER`.
- Auth/PII : l'endpoint est authentifié (comme `/api/events/**`) mais sans ownership (calcul pur, 0 donnée user, 0 log PII). Si tu détectes un trou (endpoint accessible non authentifié à cause de la SecurityConfig), signale `RECOMMAND_SECURITY`.
- NE PAS toucher : `EventResponse.java`, `frontend/src/types/event.ts`, tout fichier frontend (périmètre #67).

## Livrable attendu (format strict, MAX 500 tokens caveman)
Écris `docs/memory/sprints/sprint-69/issue-439-done.md` avec :
- commits: [SHA, ...]
- resume: objectif + BR touchées (BR-EVE-012) + fichiers clés créés/modifiés + contrat JSON exact livré + tests ajoutés (compte + noms) + résultat test-quiet
- contrat_pour_67: la forme JSON exacte requête/réponse que #67 devra consommer (route, champs)
- [MEMORY:*] signaux si applicables
- recommandations suite: RECOMMAND_* ou RECOMMAND_FOLLOWUP + pitfall subtil éventuel
- Dernière ligne = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` + section BLOQUE_SUR).
