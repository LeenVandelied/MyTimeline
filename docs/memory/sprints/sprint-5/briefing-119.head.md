[BRIEFING ISSUE #119]

## Issue
[REFACTOR] Unifier la réponse 403 AccessDeniedException (handler unique + test d'intégration réel)

## Contexte

Deux mécanismes coexistent pour produire la réponse HTTP 403 (accès refusé) dans le backend :

1. **`GlobalExceptionHandler`** (`@RestControllerAdvice`) : renvoie `{timestamp, status, error, message}` lorsqu'une `AccessDeniedException` est levée dans un contrôleur.
2. **`SecurityConfig.accessDeniedHandler`** : renvoie `{"error": "forbidden"}` + 403.

En production, c'est le filtre Spring Security qui intercepte les accès refusés, **avant** que la requête n'atteigne le `DispatcherServlet`. Le `@RestControllerAdvice` n'est donc jamais appelé pour les 403 de sécurité. Le test `EventControllerOwnershipTest` (monté en `standaloneSetup`, sans filtre Security) valide le chemin du `@RestControllerAdvice` — un chemin différent de ce qui s'exécute réellement en production.

Les deux handlers produisent aujourd'hui `{"error":"forbidden"}` + 403, mais la duplication est un risque de divergence future et le test ne couvre pas le vrai comportement prod.

**Source :** `docs/memory/sprints/sprint-4/` — triage de clôture PR #113.

## À faire

1. Supprimer le handler `AccessDeniedException` dans `GlobalExceptionHandler` (le `SecurityConfig.accessDeniedHandler` est le seul point de vérité)
2. Remplacer le test `EventControllerOwnershipTest` par un test `@SpringBootTest` avec le filtre Spring Security actif, qui valide que le corps de la réponse 403 effectivement servi en production est bien `{"error":"forbidden"}`

## BR impactées

Aucune fonctionnellement, mais concerne la robustesse du contrat d'API.

## Critères d'acceptation

- [ ] Un seul handler produit la réponse 403 (`SecurityConfig.accessDeniedHandler`)
- [ ] Le handler `AccessDeniedException` dans `GlobalExceptionHandler` est supprimé ou désactivé
- [ ] Un test `@SpringBootTest` (avec contexte Security complet) vérifie le corps `{"error":"forbidden"}` + 403 sur un endpoint protégé par ownership
- [ ] Le test actuel `EventControllerOwnershipTest` est mis à jour ou remplacé en conséquence
- [ ] Aucun autre test existant n'est cassé

## Piste technique

- `src/main/java/.../exception/GlobalExceptionHandler.java` — retirer le handler `AccessDeniedException`
- `src/main/java/.../config/SecurityConfig.java` — conserver `accessDeniedHandler`
- `src/test/java/.../EventControllerOwnershipTest.java` — migrer vers `@SpringBootTest` avec `@AutoConfigureMockMvc`

## Dépendances

- #100 (uniformisation 403 ownership — précédente itération, terminé)
- #113 (refactoring AuthController — terminé)

## Risques techniques

- Migrer `standaloneSetup` vers `@SpringBootTest` peut allonger le temps d'exécution des tests (contexte Spring complet chargé).
- S'assurer qu'aucune `AccessDeniedException` métier (levée dans le code applicatif, pas dans les filtres) ne dépend du handler `GlobalExceptionHandler` pour produire une réponse personnalisée.

## Estimation

S — suppression propre d'un handler + réécriture d'un test d'intégration avec contexte Security complet.


## Plan d'implementation
Follow-up S4 (triage PR #113). Le body de l'issue ci-dessus EST le plan (voir 'Piste technique').
Resume :
1. Supprimer le handler @ExceptionHandler(AccessDeniedException) de GlobalExceptionHandler — SecurityConfig.accessDeniedHandler devient l'unique point de verite pour le 403.
   AVANT suppression : verifier qu'aucune AccessDeniedException *metier* (levee hors filtre Security, dans un controleur/service) ne dependait de ce handler pour son corps de reponse. Si un tel chemin existe, le documenter et adapter plutot que casser silencieusement.
2. Migrer EventControllerOwnershipTest de standaloneSetup vers @SpringBootTest + @AutoConfigureMockMvc (filtre Security actif) et valider que le 403 reellement servi en prod a bien le corps {"error":"forbidden"}.
PERIMETRE SecurityConfig : ne touche QUE accessDeniedHandler (le conserver). NE MODIFIE PAS le bean CORS ni exposedHeaders — c'est reserve a #120 (vague 2, meme fichier).

## Triage
Taille: S
Modele: opus
Effort: high
