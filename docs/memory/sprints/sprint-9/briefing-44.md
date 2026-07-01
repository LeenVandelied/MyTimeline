[BRIEFING ISSUE #44]

## Issue
[REFACTOR] Alignement modèle métier sur design v3

## Contexte

Le design v3 de MyTimeline impose un modèle de données enrichi par rapport à ce qui existe actuellement. Plusieurs entités sont incomplètes : `CategoryEntity` n'a que `id` et `name`, `EventEntity` gère 3 couleurs distinctes (backgroundColor, borderColor, textColor) là où le design n'en utilise qu'une, et ni `ProductEntity` ni `UserEntity` n'ont les champs attendus par les nouvelles vues. Ces divergences bloquent l'implémentation fidèle du design v3.

## À faire

**CategoryEntity** :
- Ajouter `color` (String, format hex `#RRGGBB`, nullable)
- Ajouter `description` (String, nullable)

**EventEntity** :
- Migrer les 3 champs couleur (`backgroundColor`, `borderColor`, `textColor`) vers un unique champ `color` (règle de migration : conserver `backgroundColor`)
- Ajouter `recurrenceEndDate` (LocalDate, nullable)
- Convertir `recurrenceUnit` de String libre vers un enum `RecurrenceUnit { WEEK, MONTH, YEAR }`
- Ajouter `archived` (boolean, défaut `false`)

**ProductEntity** :
- Ajouter `archived` (boolean, défaut `false`)
- Ajouter `color` (String hex nullable, hérité de la catégorie à l'affichage — stocké si override)

**UserEntity** :
- Ajouter `avatar` (String, URL ou identifiant, nullable)

Créer les migrations Flyway correspondantes (V4+).

## BR impactées

- BR-EVT-001 : un événement appartient à un utilisateur — le champ `archived` ne doit pas contourner la règle de propriété
- BR-CAT-001 : le nom de catégorie reste unique par utilisateur — `color` et `description` ne changent pas cette contrainte

## Critères d'acceptation

- [ ] `CategoryEntity` possède `color` et `description`
- [ ] `EventEntity` possède un seul champ `color` (les 3 anciens champs supprimés)
- [ ] Enum `RecurrenceUnit` créé et utilisé dans `EventEntity`
- [ ] `EventEntity` possède `recurrenceEndDate` et `archived`
- [ ] `ProductEntity` possède `archived` et `color`
- [ ] `UserEntity` possède `avatar`
- [ ] Migration de données : `backgroundColor` conservé dans `color`, `borderColor` et `textColor` supprimés
- [ ] Migrations Flyway créées et fonctionnelles
- [ ] Les DTOs, mappers et endpoints existants mis à jour pour refléter le nouveau modèle
- [ ] Les tests existants passent (ou sont mis à jour si le contrat change)

## Piste technique

- `backend/src/main/java/*/entity/CategoryEntity.java` — ajout `color`, `description`
- `backend/src/main/java/*/entity/EventEntity.java` — refactoring couleurs, `recurrenceUnit` → enum, ajout `recurrenceEndDate`, `archived`
- `backend/src/main/java/*/entity/ProductEntity.java` — ajout `archived`, `color`
- `backend/src/main/java/*/entity/UserEntity.java` — ajout `avatar`
- Créer `backend/src/main/java/*/entity/RecurrenceUnit.java` (enum)
- `backend/src/main/resources/db/migration/V4__design_v3_schema.sql` — migrations colonnes + script de données
- DTOs et mappers à identifier via `grep -r "backgroundColor\|borderColor\|textColor" backend/src/`

## Dépendances

- Bloqué par #42 ([CHORE] Flyway baseline) — toute modification de schéma passe par Flyway
- Bloqué par #43 ([REFACTOR] Audit JPA) — les entités doivent d'abord avoir leurs colonnes d'audit avant d'ajouter les colonnes métier
- Débloque : l'implémentation du design v3 côté frontend (Waves 3-5)

## Risques techniques

- La migration de données `backgroundColor → color` est **irréversible** : `borderColor` et `textColor` sont perdus. Ce choix doit être validé avec le Product Owner avant merge.
- Tous les tests qui référencent `backgroundColor`, `borderColor`, `textColor` dans les fixtures/factories devront être mis à jour.
- Le mapper (MapStruct ou manuel) doit être audité pour ne pas mapper des champs inexistants.

## Estimation

L — Plus de 3 jours. Modification de 4 entités + enum + migrations + DTOs/mappers + tests à mettre à jour + validation PO sur la perte de données couleur.


## Plan d'implementation (architect, /sprint plan)
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

```

## Triage
Taille: L
Modele: opus
Effort: xhigh

## Context-pack domaine (lire EN PRIORITE avant tout code)

<!-- ===== cp-hexagonal.md ===== -->
# Context-pack : Architecture hexagonale

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules/hexagonal.md`
> A charger pour TOUTE tache backend touchant `{{JAVA_PACKAGE}}.*`

## Structure obligatoire

```
{{JAVA_PACKAGE}}/
├── domain/            # Couche metier pure (Java pur, 0 framework)
├── application/       # Ports (interfaces) et use cases
└── infrastructure/    # Adapters techniques (JPA, REST, Quarkus)
```

## Imports interdits — AUDIT AUTOMATIQUE par hook `check-hexagonal.sh`

### `domain/` NE DOIT JAMAIS importer :
- `jakarta.*` (sauf annotations validation : `@NotNull`, `@Valid`, `@Size`)
- `io.quarkus.*`
- `javax.*`
- `{{JAVA_PACKAGE}}.infrastructure.*`
- `{{JAVA_PACKAGE}}.application.*` (sauf interfaces de ports)

### `application/` NE DOIT JAMAIS importer :
- `{{JAVA_PACKAGE}}.infrastructure.*`
- `io.quarkus.*` (sauf annotations CDI basiques : `@ApplicationScoped`, `@Inject`)

### `infrastructure/` peut importer tout :
- `{{JAVA_PACKAGE}}.domain.*`
- `{{JAVA_PACKAGE}}.application.*`
- Tous les frameworks necessaires

## DEC-009 — Ports obligatoires

- `application/` ne touche JAMAIS `infrastructure/` directement
- Les ports (interfaces) sont definis dans `application/`
- Les implementations (adapters) sont dans `infrastructure/`

## Anti-patterns a proscrire

- Entite JPA dans `domain/` → deplacer vers `infrastructure/persistence/`
- `@Path`, `@GET`, `@POST` dans `domain/` ou `application/`
- `l'ORMRepository` dans `application/` → port + adapter infra
- Static method call vers `application` depuis `domain`

## Checklist implementation

- [ ] La logique metier est dans `domain/` (pure)
- [ ] Les use cases sont dans `application/` via ports
- [ ] Les adapters (REST, JPA, HTTP client) sont dans `infrastructure/`
- [ ] Le hook `check-hexagonal.sh` passe sans erreur

## Reference pour approfondir

`.claude/rules/hexagonal.md` (rule versionnee)
`docs/memory/decisions.md#DEC-009`

<!-- ===== cp-backend.md ===== -->
# Context-pack : Backend le langage backend / Quarkus

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules-jit/backend.md`
> A charger pour TOUTE tache backend

## Stack

le langage backend + le framework backend + l'ORM + l'outil de migration + le provider d'identité + la base de données

## Conventions le langage backend

- **Records** pour DTOs (request/response immuables)
- **Sealed Classes** pour etats metier
- **Pattern Matching**, Streams
- **Validation** : `@Valid` + Bean Validation sur tous les `@RequestBody`
- **Reponses** : `Response.ok(dto).build()` ou `Response.created(uri).build()`
- **Erreurs** : le format d'erreur
- **Logging** : le logger injecte — jamais `System.out`
- **Config** : `@ConfigProperty` pour valeurs externalisees
- **JPA constructeurs** : `public Entity() {}` (pas protected)

## Regles transversales entites

- **Soft delete** (règle métier suppression) : champ `deleted_at` obligatoire, JAMAIS de DELETE physique
- **UUID v7** (règle métier clés primaires) sur toutes les cles primaires
- **Ownership** (règle métier ownership) : verifier l'identifiant propriétaire sur chaque endpoint GET/PUT/DELETE securise, admins bypassent via `isAdmin`

## Securite

- `@RolesAllowed` sur chaque endpoint protege
- Aucune donnee sensible dans les logs
- Aucune concatenation SQL
- `l'identité de sécurité` (pas `JsonWebToken`) avec le provider d'identite

## Migrations l'outil de migration

- `db/migration/V{n}__{description}.sql`
- Rollback commente dans chaque fichier
- JAMAIS modifier une migration deja appliquee
- Derniere migration : `ls {{MIGRATIONS_DIR}}/V*.sql | sort -V | tail -1` (hook `check-stack-drift.sh` avertit en cas de drift)

## l'ORM

- `persist()` = INSERT only. Pour upsert → `getEntityManager().merge()`
- `TranslationRepository` implemente directement par `l'ORMRepository`

## Null safety

- `orElseThrow()` quand l'entite DOIT exister — jamais `orElse(null)` + null checks downstream
- Fallback explicite obligatoire pour les valeurs nullable externes (locale, enum)

## Tests `@QuarkusTest`

- **`@TestTransaction`** (pas `@Transactional`) pour rollback automatique — `@Transactional` commit et pollue les tests suivants. **PIT recurrent**.
- Test data : valeurs uniques par test (generateur AtomicInteger ou UUID), jamais de constantes partagees entre tests

## Qualite du code

- Methodes > 20 lignes → decomposer
- Complexite cyclomatique > 5 → refactorer
- Pas de magic numbers/strings
- Nommage explicite
- **Risque N+1** : `fetch join` ou `@BatchSize`
- Toute liste paginee
- Index DB prevus pour colonnes filtrees/triees

## Pitfalls backend frequents

- `@Transactional` dans tests → pollue tests suivants. Toujours `@TestTransaction`.
- `orElse(null)` + null check downstream → NPE cache. `orElseThrow()`.
- `persist()` pour update → INSERT duplique. `getEntityManager().merge()`.
- Concatenation SQL → injection. Query params obligatoires.
- Migration modifiee apres deploiement → cluster inconsistant. Creer V{n+1}.

## Reference pour approfondir

`.claude/rules-jit/backend.md` (rule versionnee)
`docs/memory/pitfalls.md` (filtre par PIT-XX backend)

<!-- ===== br-events.md ===== -->
# Context-pack domaine : `events`

> Domaine : `events` — gestion des événements d'une timeline (création, mise à jour partielle, suppression, listing par produit), chaque événement étant rattaché à un `Product` et porteur de dates calculées (durée ou date unique).
> Acteurs principaux : `ROLE_USER` (utilisateur authentifié via cookie JWT), `Anonymous` (bloqué), `system` (mappers / `Utils.calculateEndDate` qui calculent dates et valeurs par défaut).

---

## 1. Lifecycles (machines à états)

**EventEntity** — CRUD simple, **pas de lifecycle d'état métier** (aucun champ `status`/`state`, pas de soft-delete : la suppression est physique via `deleteById`).

Le seul "état" implicite est le `type`, qui n'est PAS une transition mais une nature figée à la création :

| `type`     | Description                                              | Conséquence métier                                                                 |
|------------|----------------------------------------------------------|------------------------------------------------------------------------------------|
| `duration` | Événement avec durée → `endDate` = `startDate` + `durationValue` × `durationUnit` | `Utils.calculateEndDate` applique `plusDays/Weeks/Months/Years`                     |
| `single`   | Événement ponctuel → `endDate` = `startDate`             | `calculateEndDate` retourne `startDate` inchangée (branche `if` non prise)          |

⚠️ Aucune contrainte d'enum sur `type` côté backend : toute chaîne hors `duration`/`single` est acceptée et traitée comme `single` (branche `if` non prise → `endDate = startDate`).

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
**⚠️ NON IMPLÉMENTÉ** : aucune contrainte ni backend (`EventCreationRequest.recurrenceUnit` sans `@NotBlank` ni validation conditionnelle) ni frontend (`eventCreationSchema` ne refine pas `recurrenceUnit`). `recurrenceUnit` reste librement null même avec `isRecurring=true`.
**Test attendu** : `EventCreationRequestValidationTest.shouldRequireRecurrenceUnitWhenRecurring` (à créer après ajout de la règle).

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

### BR-EVE-009 — Couleurs cohérentes sur le formulaire d'édition
**Règle** : sur l'édition, `backgroundColor`/`borderColor`/`textColor` DOIVENT être traités de façon cohérente (un seul schéma source de vérité).
**Pourquoi** : éviter des erreurs de validation/runtime divergentes pour le même formulaire.
**⚠️ NON IMPLÉMENTÉ (schéma dupliqué)** : deux `eventEditSchema` divergents — `types/event.ts` (couleurs `optional`, seul `backgroundColor` présent) vs `EventEditForm.tsx` (3 couleurs `z.string()` requises). Aucune validation de format hex côté backend (`backgroundColor/borderColor/textColor` String libres, nullable).
**Test attendu** : `eventEditSchema.test.ts.shouldValidateColorsConsistently` (après consolidation en un schéma unique).

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

---

## 4. Dépendances inter-domaines

- **events → products (fort)** : `EventEntity` `@ManyToOne ProductEntity` (`@JoinColumn product_id, nullable=false`, `@JsonBackReference`). Côté `Product`, `@OneToMany(mappedBy="product", cascade=ALL, orphanRemoval=true, @JsonManagedReference)` → la suppression d'un produit **cascade** sur ses events.
- **Modèle domaine** : `Event` porte `productId: UUID` (pas l'entité) → isolation hexagonale correcte au niveau domaine.
- **Listing des events** : porté par `ProductController` (`GET /api/users/{userId}/products/{productId}/events`), pas par `EventController` → le domaine `events` dépend de l'auth produit/user.
- ⚠️ **Couplage infra-infra** : `EventRepositoryJpaImpl` injecte `ProductRepositoryJpaImpl` (classe concrète) au lieu du port `ProductRepository` → viole l'inversion de dépendance hexagonale.
- ⚠️ **Fuite DTO dans le port domaine** : `EventService` (port domaine) référence `EventCreationRequest` (couche application) dans `createEvent(...)` → le DTO applicatif pollue la définition du port.

---

## 5. Anti-patterns documentés

- ~~**IDOR (PATCH & DELETE)**~~ : ✅ RÉSOLU Sprint 1 #30/#91 — ownership sur create/update/delete (cf. BR-EVE-008).
- ~~**`@Valid` manquant** sur `POST /api/events`~~ : ✅ RÉSOLU Sprint 1 #31 — `@Valid` posé sur tous les `@RequestBody` + `@EnableMethodSecurity` + session STATELESS (cf. BR-EVE-001/007).
- **Fuite du modèle domaine en réponse REST** : `Event` (domaine) renvoyé directement par POST/PATCH et par le GET liste — aucun response DTO.
- **Logique métier dans le controller** : `EventController.updateEvent` contient la boucle de mise à jour champ-par-champ avec `instanceof` (parsing `durationValue`/`isRecurring`) — devrait être en couche service.
- **Mismatch sémantique name↔title** : `EventCreationRequest.name` mappé vers `Event.title`.
- **Exception avalée** : `EventServiceImpl.findEventById` fait `e.printStackTrace()` puis retourne `Optional.empty()` → masque les vraies erreurs.
- **Double round-trip DB** : `deleteById` fait `existsById` puis `deleteById` (2 requêtes) ; `findEventById` fait `existsById` puis `findEventById` (2 requêtes).
- **Check vide dupliqué** : `EventServiceImpl.findDomainEventByProductId` lève `EventNotFoundException` sur liste vide, puis `ProductController` re-teste `isEmpty()` après coup.
- **NPE potentielle** : `Utils.calculateEndDate` `switch(durationUnit)` sans null-guard quand `type='duration'`. (cf. BR-EVE-004)
- **Suppression physique** : `deleteById` supprime réellement la ligne — pas de soft-delete (divergence avec la convention soft-delete du projet).
- ~~**`@CrossOrigin(origins="*")`** sur `EventController`~~ : ✅ RETIRÉ Sprint 1 #30 — CORS gérée uniquement par `SecurityConfig` (`allowCredentials=true` + `allowedOrigins localhost:3000`).
- **Schémas Zod dupliqués/divergents** : `eventEditSchema` défini deux fois (cf. BR-EVE-009) ; champ `allDay` vs `isAllDay` (cf. BR-EVE-010) ; `name.min(3)` front vs `@Size(min=1)` back ; `type` enum strict front vs `@NotBlank` libre back.

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

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dependances intra-sprint
- AUCUNE dépendance sur #135 (fichiers 100% disjoints : backend Java/SQL vs frontend TS).
- Cette issue DÉBLOQUE les sprints S10 (#50 colonne `archived`), S12 (#54 enum RecurrenceUnit + recurrenceEndDate), S13 (#73/#78 avatar User). Ne pas casser le contrat de ces champs.

## ADR OBLIGATOIRE (bloquant avant migration)
- Créer `docs/adr/ADR-XXX-migration-couleurs-v3.md` documentant :
  - choix de `backgroundColor` comme couleur survivante (borderColor + textColor PERDUS)
  - irréversibilité de la migration V7
  - backfill `archived = false` sur les lignes existantes
- Signaler la décision au lead via `[MEMORY:decision]` dans le retour.

## Migration IRRÉVERSIBLE — garde-fou
- La migration V7 supprime `borderColor` et `textColor` : perte de données définitive.
- NE PAS exécuter contre une base de prod sans sauvegarde + confirmation explicite (règle CLAUDE.md).
- En dev/test : migration Flyway normale. Vérifier `flyway validate` + démarrage app OK.
- Numérotation : V7 (V6 est la dernière migration existante — vérifier avant d'écrire).

## Designer
Non applicable (refactor backend pur — aucun composant visuel).

## Contraintes
- Branche cible : sprint/9 (déjà checkout, NE PAS changer de branche).
- Commit : 1 commit logique gitmoji français (ex: `:recycle: Aligner modèle métier sur design v3 (#44)`).
- Architecture hexagonale STRICTE : domain models sans annotations JPA/Spring (cf. pack cp-hexagonal).
- Ordre d'écriture : enum RecurrenceUnit → domain models → entities JPA → migration V7 → mappers/DTO existants.
- `grep -rn "backgroundColor\|borderColor\|textColor" backend/src/` pour trouver TOUS les consommateurs (mappers, DTO, tests, fixtures).
- Tests inline OBLIGATOIRE via ./scripts/test-quiet.sh backend (unit mappers/enum + integration Flyway migrate/validate).
- Si volume tests > 500 OU temps > 3min : signaler RECOMMAND_TEST_RUNNER (le lead lancera test-runner).
- Zod/DTO sync frontend : REPORTÉE aux sprints frontend S10/S11 — ne PAS toucher au frontend ici. Documenter le changement de forme des DTO dans le retour pour la reprise S10/S11.
- Ne PAS toucher aux fichiers frontend (réservés #135) : frontend/src/contexts/AuthContext.tsx, frontend/src/hooks/useCurrentUser.ts, frontend/src/services/authService.ts.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchees (BR-EVT-001, BR-CAT-001) + fichiers cles + migration V7 + pitfalls + tests passed/failed>
- [MEMORY:decision] ADR migration couleurs (backgroundColor survivant, irréversible)
- [MEMORY:*] autres signaux si applicables
- recommandations suite: <RECOMMAND_DB_EXPERT si doute migration / RECOMMAND_FOLLOWUP sync Zod S10 / autre>
- STATUS: COMPLETED en derniere ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
