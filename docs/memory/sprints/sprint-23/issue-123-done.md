# Issue #123 — Refactor contrôleurs vers interfaces de service (DIP)

**Vague :** 2 (après #180, anti-collision build) · **Modèle :** opus/high · **Statut :** livré

## Commits
- `46f2adf4749eca7329e2f40d881f870fc8d46cce`

## Résumé
- 2 offenders réels corrigés (grep confirmé) :
  - `ProductController` : ProductServiceImpl/EventServiceImpl/UserServiceImpl → ports ProductService/EventService/UserService
  - `AuthController` : UserServiceImpl → port UserService
- `UserController` / `GlobalExceptionHandler` : mentions `ServiceImpl` en COMMENTAIRE seul, aucune injection → non touchés. `EventController`/`CategoryController` déjà propres (ports).
- Pas de port `AuthService` inventé : AuthController n'utilise que `findDomainUserByUsername`/`createUser` (présents sur `UserService`) + ports existants SessionService/PasswordResetService. Choix documenté dans le commit.
- 1 seule impl `@Service` par port → injection interface résolue sans ambiguïté, aucun `@Primary`/`@Qualifier`.
- Mocks tests basculés sur interfaces : `ProductControllerOwnershipTest`, `AuthControllerSecurityTest`, `AuthControllerValidationTest` (@Mock), `AuthControllerDevProfileCookieTest` (@Bean factory), `EventControllerOwnershipTest` (@MockBean, commentaire A8 périmé réécrit). `*ImplTest` + 2 tests d'intégration (mentions commentaire) laissés intacts.
- ArchUnit règle 3 `controllersShouldNotDependOnConcreteServiceImplementations` (FreezingArchRule) : 42+14 violations gelées (Product/Auth) résolues → freeze store auto-purgé à 0 (nouvelle baseline = 0, committée).
- Tests : **270 passed / 0 failed**, BUILD SUCCESS (`./scripts/test-quiet.sh backend`, Testcontainers OK).

## [MEMORY:pattern]
DIP contrôleur : injecter le PORT domaine, jamais le `*ServiceImpl`. Anti-pattern = champ/constructeur typé sur l'impl concrète. Vérif : `grep -rln "import .*application.services\..*ServiceImpl" backend/src/main/java`. Règle ArchUnit gelée (FreezingArchRule) qui se purge seule quand les violations disparaissent → baseline 0 committée pour figer l'acquis.

## [MEMORY:pitfall]
`@MockBean`/`@Mock` sur `*ServiceImpl` concret « fonctionnait » (l'impl IS-A le port) mais violait le critère d'acceptation et gardait un commentaire trompeur. Après un refactor DIP repo-wide : basculer les mocks sur l'interface ET purger les commentaires justifiant l'ancien câblage concret.

## Recommandations suite
- RECOMMAND_FOLLOWUP (mineur) : la règle ArchUnit 3 reste en `FreezingArchRule.freeze(rule)`. Baseline désormais à 0 → envisager de la passer en règle STRICTE (`rule.check(...)` sans freeze) pour un échec immédiat plutôt qu'un gel silencieux. Hors périmètre #123 (touche le style de la règle, pas les contrôleurs).

STATUS: COMPLETED
