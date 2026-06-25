[BRIEFING ISSUE #120]

## Issue
[SECURITY] Externaliser/durcir CORS et cookie par profil (origins, exposedHeaders, SameSite)

## Contexte

La configuration CORS et cookie du backend (`SecurityConfig`) présente trois points à durcir, identifiés lors du triage de clôture du Sprint 4 (PR #113) :

1. **Origins CORS hardcodées** : `allowedOrigins("http://localhost:3000")` est en dur dans le code — l'origine de production n'est pas configurée, et il n'y a pas de séparation dev/prod.
2. **`Authorization` dans `exposedHeaders`** : depuis la migration vers les cookies JWT (#104), le header `Authorization` n'est plus utilisé. L'exposer côté CORS est inutile et légèrement bruyant.
3. **`SameSite=Lax`** : pour une API pure (pas de navigation cross-site), `SameSite=Strict` offre une protection CSRF renforcée sans inconvénient fonctionnel.

**Source :** `docs/memory/sprints/sprint-4/` — triage de clôture PR #113.

## À faire

1. Externaliser `allowedOrigins` par profil : lire depuis une propriété `app.cors.allowed-origins` configurée dans `application-dev.properties` et `application-prod.properties`
2. Retirer `Authorization` de la liste `exposedHeaders` dans la configuration CORS
3. Évaluer et documenter la décision de passer `SameSite=Strict` (si aucun flux cross-site légitme n'est identifié, appliquer le changement)

## BR impactées

Aucune fonctionnellement.

## Critères d'acceptation

- [ ] `allowedOrigins` n'est plus hardcodé dans `SecurityConfig` — lu depuis une propriété externalisée
- [ ] `application-dev.properties` contient `app.cors.allowed-origins=http://localhost:3000`
- [ ] `application-prod.properties` contient la valeur de production (ou la variable d'environnement correspondante)
- [ ] `Authorization` est retiré de `exposedHeaders`
- [ ] La décision sur `SameSite` (Lax ou Strict) est documentée dans un commentaire ou dans le runbook, avec justification

## Piste technique

- `src/main/java/.../config/SecurityConfig.java`
- `src/main/resources/application-dev.properties`
- `src/main/resources/application-prod.properties`

## Dépendances

- #99 (externalisation config cookies — terminé, même pattern à appliquer)
- #104 (migration cookie-only JWT — terminé, justifie le retrait d'`Authorization`)

## Risques techniques

- S'assurer que la propriété `app.cors.allowed-origins` est bien définie dans tous les environnements (local, CI, prod) avant de déployer — une valeur manquante bloquerait toutes les requêtes CORS frontend.
- `SameSite=Strict` peut rompre des flux d'authentification initiés depuis un lien externe (email de confirmation, lien partagé). À vérifier avant d'appliquer.

## Estimation

S — configuration externalisée + nettoyage + décision documentée.


## Plan d'implementation
Follow-up S4. Le body de l'issue ci-dessus EST le plan. Trois durcissements CORS/cookie dans SecurityConfig :
1. Externaliser `allowedOrigins` (aujourd'hui en dur "http://localhost:3000") → lire une propriété `app.cors.allowed-origins` ; valeur dev dans application-dev.properties (http://localhost:3000), valeur prod dans application-prod.properties (ou var d'env). Même pattern d'externalisation que #99 (cookies). Supporter une liste (séparée par virgules) si plusieurs origines.
2. Retirer `Authorization` de `exposedHeaders` (plus utilisé depuis le passage cookie-only JWT, #104).
3. Évaluer/documenter SameSite : passer Lax→Strict SI aucun flux cross-site légitime ; sinon justifier le maintien de Lax. Documenter la décision (commentaire + runbook).
ATTENTION : #119 (vague 1, déjà committé) a déjà touché SecurityConfig.java (accessDeniedHandler) — pars de l'état ACTUEL du fichier sur HEAD. Tu ne touches QUE le bean CORS / cookie / exposedHeaders, PAS l'accessDeniedHandler.

## Triage
Taille: S
Modele: opus
Effort: high
