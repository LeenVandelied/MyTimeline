# Issue #93 — Unifier l'extraction d'identité via SecurityContextHolder

**Vague :** V1 (∥ #122) · **Taille :** M · **Modèle :** opus/xhigh
**Commit :** b95710a — `:recycle: #93 Unifier l'extraction d'identité via SecurityContextHolder (CallerResolver)`

## Résumé
Factorisé les 4-5 `resolveCaller` dupliqués en un helper unique `CallerResolver`
(`infrastructure/security/CallerResolver.java`, `@Component`, dépend du port `UserService`).
Le helper lit l'identité via `SecurityContextHolder.getAuthentication().getName()` (peuplé par
`JwtFilter`, cookie OU Bearer). Corrige le bug d'incohérence : une requête `Authorization: Bearer`
valide n'est plus rejetée en 401 par le check cookie manuel.

Rebranché : EventController, CategoryController, UserController, SessionController.
**ProductController NON touché** (auth inline réservée #154 ; `catch(Exception)` getProducts réservé #92).
SessionController garde le cookie UNIQUEMENT pour `extractJti` (claim jti absent du SecurityContext).

## Contrat CallerResolver (INPUT #154)
```java
public Optional<User> currentUser()
```
- PRÉSENT : `User` domaine du principal authentifié.
- `Optional.empty()` : pas d'auth exploitable OU username inconnu/purgé. Ne lève JAMAIS d'exception.
- L'appelant décide du statut → les contrôleurs renvoient 401 sur empty. `@Component` injectable.

## BR touchées
BR-AUT-005 (401 sans fuite — préservé), BR-AUT-011 (cookie OU Bearer), BR-EVT-001 (ownership 403 inchangé),
ADR-002 (ownership 403/404 catégories inchangé).

## Fichiers
- `infrastructure/security/CallerResolver.java` (nouveau, +71) + `CallerResolverTest.java` (+95, 4 tests)
- `EventController.java`, `CategoryController.java`, `UserController.java`, `SessionController.java`
- Tests ajustés : CategoryControllerTest, UserControllerTest, EventControllerValidationTest, 2× GlobalExceptionHandler*Test

## Tests
52 unit (dont +4 CallerResolverTest) + 27 intégration Security = **79 verts, 0 échec**.

## [MEMORY] signaux
- [MEMORY:pattern] Helper unique `CallerResolver.currentUser()` lisant SecurityContextHolder (cohérent cookie/Bearer), renvoie `Optional<User>` pour préserver le 401 par contrôleur. AP : ré-extraire le JWT du cookie brut en aval de JwtFilter.
- [MEMORY:pitfall] Subagent depuis worktree : `cd /repo/backend` cible le repo PRINCIPAL (dev), pas le worktree → edits invisibles au `git status` du worktree. Vérifier `git rev-parse --show-toplevel` ; préfixer les chemins par le worktree complet. (Confirme [[sprint-subagent-worktree-cwd]])

## Recommandations suite
- **RECOMMAND_FOLLOWUP** [triage XS | domaine auth] : SessionController `getActiveSessions`/`revokeOtherSessions`
  gardent le cookie pour `extractJti` ; une requête Bearer résout l'identité mais `currentJti=null`
  (session courante non flaggée). Latent, hors scope #93 — à traiter si le support Bearer des sessions devient requis.
- Input direct pour #154 : ProductController rebranche sur `callerResolver.currentUser()` (déjà injectable),
  supprimer le bricolage Bearer manuel de `getProducts`, NE PAS toucher son `catch(Exception)` (#92).

STATUS: COMPLETED
