# Issue #104 — Ne plus renvoyer le JWT brut dans le body de login

**Commit :** 707e13614d65c718645d365d8fddd0ca5bfd5bb2
**Modèle :** opus-high | **Vague :** 2 (1/3 chaîne AuthController)

## Résumé
- Objectif : login ne renvoie plus le JWT brut en body (anti-pattern A3, BR-AUT-007 + BR-SEC-001).
- Fix : `AuthController.java:88` — `ResponseEntity.ok().body(jwtToken)` → `ResponseEntity.ok(Map.of("message","Authentification réussie"))`. Cookie HttpOnly inchangé (modif localisée ; refresh/Secure/Domain/me NON touchés).
- Test : `AuthControllerSecurityTest.login_doesNotReturnJwtInBody_andSetsHttpOnlyCookie` — body sans JWT, `$.message`, cookie `jwt` httpOnly présent. 4/4 pass.
- Frontend : PAS de régression — `useAuth.login` ignore le retour de `loginService` puis appelle `fetchUser()` (`/auth/me`) ; token lu depuis cookie HttpOnly (`withCredentials:true`).

## [MEMORY] signaux
- [MEMORY:pitfall] Mock Mockito sur méthode surchargée `JwtService.generateToken(String|Authentication)` → matcher ambigu : utiliser `any(Authentication.class)` au lieu de `any()`. Toujours typer le matcher sur méthodes overloadées.

## Recommandations suite
- Aucune RECOMMAND pour #104. Fichier `AuthController.java` laissé en état localisé, prêt pour handoff #105 (refresh expiration) puis #99 (cookies).

STATUS: COMPLETED
