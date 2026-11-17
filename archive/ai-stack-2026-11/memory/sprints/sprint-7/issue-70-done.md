# Issue #70 — endpoints profil /api/me — DONE

## Fait
- Reprise travail non-commité (~90%). AUDIT + finalisation, pas réécriture.
- GET /api/me : profil sans hash (BR-AUT-008 OK, UserResponse projection).
- PATCH /api/me : update name/email/username, 409 si username pris par AUTRE compte (BR-AUT-001 OK), renvoie UserResponse.
- POST /api/me/change-password : 400 ancien pwd faux, 204 succès.
- A15 : @Transactional sur updateUser + changePassword.

## GAP ARCHI TRANCHÉ (A8/DIP) -> REFACTOR
- Logique change-password (matches + re-hash) DÉPLACÉE du UserController (infra) vers le PORT.
- Port UserService.changePassword(caller, old, new) déclaré (domain).
- Logique dans UserServiceImpl (application) ; injecte PasswordEncoder (interface Spring Security, pas framework lourd ; cohérent avec imports application existants @Service/@Transactional).
- Échec ancien pwd -> InvalidCredentialsException (domain, NOUVEAU) -> 400 {error:"invalid current password"} via GlobalExceptionHandler (corps plat, cohérent login/register).
- UserController.changePassword ne fait plus que router (drop PasswordEncoder du ctor).
- PAS de port d'encodage créé (scope-creep hors #70). 409 username reste mapping HTTP dans contrôleur (comme register/AuthController).

## Tests — VERTS
- UserControllerTest 8/8 (ctor 2 args, change-password stub via port doThrow/doNothing).
- Suite backend complète : 64/64, BUILD SUCCESS. Aucune régression (DI Spring résout PasswordEncoder).

## Fichiers (absolus sous backend/src/...)
- M services/UserServiceImpl.java (PasswordEncoder + changePassword)
- M ports/services/UserService.java (+changePassword)
- M controllers/GlobalExceptionHandler.java (+handler 400)
- A controllers/UserController.java
- A exceptions/InvalidCredentialsException.java
- A dtos/ChangePasswordRequest.java, UserUpdateRequest.java
- A test/.../UserControllerTest.java
- UserResponse.java déjà commité (7bb6af4).

## Commit
b9b334c — backend uniquement. AUCUN frontend ni .eslintcache touché.

## Notes lead
[MEMORY:decision] Contexte: change-password violait A8 (logique infra). Décision: port UserService.changePassword + logique UserServiceImpl, InvalidCredentialsException->400. Why: hexagonal strict, pas de port d'encodage (scope min, PasswordEncoder = interface légère déjà tolérée en application).
[MEMORY:pattern] Erreur métier contrôleur -> exception domain mappée GlobalExceptionHandler en corps plat {error}, vs buildBody détaillé pour les 404/validation.

STATUS: COMPLETED
