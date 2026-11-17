# Issue #119 — Unifier la réponse 403 AccessDeniedException — DONE

**Commit :** 136915b
**Fichiers :** GlobalExceptionHandler.java (-handler AccessDeniedException) + EventController.java (javadoc) + EventControllerOwnershipTest.java (migré standaloneSetup → @SpringBootTest). SecurityConfig NON modifié (CORS intact pour #120).
**Résumé :** Handler @ExceptionHandler(AccessDeniedException) supprimé de GlobalExceptionHandler → SecurityConfig.accessDeniedHandler = unique point de vérité 403. Vérifié : AccessDeniedException métier d'EventController (ownership) remonte à ExceptionTranslationFilter → routée vers accessDeniedHandler, aucun corps perdu. Test migré valide `{"error":"forbidden"}`+403 servi par la chaîne Security RÉELLE (@WithMockUser ROLE_USER).

**Tests :** 55 tests 0 fail ~14s (<3min). Suite finale full = 55/55 green.

**[MEMORY:pitfall]** 403 sécurité : en prod l'ExceptionTranslationFilter intercepte AVANT le DispatcherServlet → le @RestControllerAdvice n'est JAMAIS atteint, même pour une AccessDeniedException métier levée en contrôleur. Tester le 403 en @SpringBootTest (filtre actif), jamais standaloneSetup.
**[MEMORY:pattern]** @SpringBootTest + contrôleurs à injection concrète (anti-pattern A8) : @MockBean sur le type CONCRET *ServiceImpl (pas l'interface). Boot 3.2 = @MockBean.
**[MEMORY:decision]** @WithMockUser(authorities=ROLE_USER) requis pour franchir hasAuthority et atteindre le 403 d'ownership (sinon on teste un 403 d'autorité).

## Recommandations suite
- RECOMMAND_SECURITY : review du contrat 403 / accessDeniedHandler unifié.
- RECOMMAND_FOLLOWUP [M | transversal] : anti-pattern A8 — contrôleurs Auth/Product/Category injectent les *ServiceImpl concrets (viole hexagonal/DIP), refactor vers interfaces.

STATUS: COMPLETED
