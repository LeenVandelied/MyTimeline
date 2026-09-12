# Issue #100 — Uniformiser le corps de réponse 403 d'ownership (EventController)

**Commit :** 3c36a7f791e6609dbfc523b1b9e29e4a83756d2a
**Modèle :** opus-high | **Vague :** 1

## Résumé
- Objectif : uniformiser body 403 ownership EventController via handler central.
- BR : BR-EVT-005 (ownership event), BR-AUT-007 (erreurs uniformes).
- Fichiers : `EventController.java` (3× `ResponseEntity.status(FORBIDDEN).build()` → `throw new AccessDeniedException("forbidden")` ; import `org.springframework.security.access.AccessDeniedException` ajouté ; Javadoc helper MAJ). `EventControllerOwnershipTest.java` (`.setControllerAdvice(new GlobalExceptionHandler())` + `jsonPath($.error==forbidden)` sur PATCH/DELETE cross-user).
- Handler vérifié : `GlobalExceptionHandler.handleAccessDenied` → 403 body `{timestamp,status,error:"forbidden",message:"forbidden"}`.
- Tests : 9/9 OK (EventControllerOwnershipTest 3, ProductControllerOwnershipTest 3, AuthErrorContractIntegrationTest 3).

## Note scope
EventController n'a **aucun endpoint GET** → le critère d'acceptation "GET /api/events/{id}" est sans objet. Cas réels couverts = PATCH/DELETE + createEvent ownership. 401/404 inchangés (hors scope).

## [MEMORY] signaux
- [MEMORY:pitfall] Tests MockMvc `standaloneSetup` d'un controller qui throw une exception interceptée par `@RestControllerAdvice` : ajouter `.setControllerAdvice(new GlobalExceptionHandler())` au builder, sinon l'exception propage et le test casse (standaloneSetup ne scanne pas les advices ; `@WebMvcTest` le ferait).
- [MEMORY:pattern] 403 ownership avec body vide rompt le contrat → `throw new AccessDeniedException` → handler central. Anti-pattern : `ResponseEntity.status(FORBIDDEN).build()` dans le controller.

## Recommandations suite
- RECOMMAND_FOLLOWUP : `scripts/test-quiet.sh` ABSENT + `./mvnw` racine cassé (`.mvn/wrapper/maven-wrapper.properties` manquant). Fallback utilisé : `mvn -f backend/pom.xml`. Outillage de test à corriger.
- Pas de RECOMMAND_TEST_RUNNER (9 tests, <5s). Aucune autre régression.

STATUS: COMPLETED
