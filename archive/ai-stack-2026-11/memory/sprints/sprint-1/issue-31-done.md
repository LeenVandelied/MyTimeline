# Issue #31 — DONE

**Titre :** [SECURITY] @Valid partout + @EnableMethodSecurity + session STATELESS
**Vague :** V3 | **Modèle :** opus/high | **Commit :** de0c095

## Résumé
- `@Valid` ajouté sur les `@RequestBody` manquants : AuthController.login+register, EventController.createEvent, ProductController.createProduct, CategoryController.createCategory. updateEvent déjà `@Valid` (#28, non doublé). Imports `jakarta.validation.Valid` ajoutés.
- SecurityConfig : `@EnableMethodSecurity` + `.sessionManagement(STATELESS)`. CORS + authorizeHttpRequests + chaîne JwtFilter intacts. Ownership #30 / GlobalExceptionHandler non touchés.
- Tests 400 : AuthControllerValidationTest (email invalide, password vide) + EventControllerValidationTest (nom vide, service jamais appelé). MethodArgumentNotValidException → 400 confirmé.
- **Non-régression suite COMPLÈTE : 6 classes / 14 tests, 0 failure / 0 error.** Contexte Spring boote sous STATELESS + @EnableMethodSecurity. Pas de JSESSIONID (sessions désactivées, auth = cookie JWT custom). Compile OK.

## Signaux mémoire
- [MEMORY:pattern] `@Valid` est inerte si le DTO n'a aucune contrainte Bean Validation. `AuthRequest` n'a aucune annotation → `@Valid` sur login est cohérent mais sans effet. Vérifier que le DTO porte bien des contraintes.

## Recommandations suite (RECOMMAND_FOLLOWUP)
1. JWT malformé dans `checkEventOwnership` (EventController) → `JwtException` non mappée → 500 (hérité de #30, hors scope #31).
2. `AuthRequest` sans contraintes : ajouter `@NotBlank` username/password pour rejeter payload vide en 400.
3. Category model : confirmer présence d'annotations sinon `@Valid` createCategory inerte.

STATUS: COMPLETED
