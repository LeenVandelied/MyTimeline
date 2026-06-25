[BRIEFING ISSUE #117]

## Issue
[TEST] Couvrir le profil dev (cookieSecure=false) pour les cookies JWT

## Contexte

Les tests d'authentification (`AuthControllerSecurityTest`) injectent les valeurs de configuration des cookies JWT via `ReflectionTestUtils`, avec les valeurs correspondant au profil de production (`cookieSecure=true`). Aucun test ne vérifie le comportement en environnement de développement, où `app.cookie.secure=false` est attendu pour permettre l'utilisation sur HTTP (localhost).

Sans ce test, une régression sur la configuration dev pourrait passer inaperçue et bloquer les développeurs en local.

**Source :** `docs/memory/sprints/sprint-4/` — triage de clôture PR #113.

## À faire

Ajouter un test `@SpringBootTest` avec le profil Spring `dev` actif qui vérifie que :
- le cookie JWT est créé avec `Secure=false`
- le domaine du cookie est `localhost`

## BR impactées

Aucune

## Critères d'acceptation

- [ ] Un test annoté `@ActiveProfiles("dev")` ou équivalent est présent dans la suite
- [ ] Ce test vérifie que l'attribut `Secure` du cookie JWT est `false` en profil dev
- [ ] Ce test vérifie que le domaine du cookie est `localhost` en profil dev
- [ ] Les tests existants (profil prod/par défaut) continuent de passer

## Piste technique

- Fichier existant : `src/test/java/.../AuthControllerSecurityTest.java`
- Configuration : `src/main/resources/application-dev.properties` (valeur `app.cookie.secure=false`)
- Mécanisme : `@SpringBootTest` + `@ActiveProfiles("dev")` ou `@TestPropertySource`

## Dépendances

- #99 (externalisation config cookies — terminé)
- #113 (refactoring AuthController — terminé)

## Risques techniques

Aucun — test ajditif, aucun impact sur le code de production.

## Estimation

XS — un test supplémentaire dans une classe existante.


## Plan d'implementation
Follow-up S4. Le body de l'issue ci-dessus EST le plan.
Résumé : ajouter dans AuthControllerSecurityTest (ou une classe de test dédiée si plus propre) un test profil dev qui vérifie que le cookie JWT a Secure=false et domaine localhost en profil `dev`. Mécanisme : @SpringBootTest + @ActiveProfiles("dev") OU @TestPropertySource. La valeur app.cookie.secure=false vient de application-dev.properties (déjà présent, #99). Les tests existants (profil prod/défaut) doivent continuer à passer.
ATTENTION : #116 (vague 1) vient d'ajouter login_withBadCredentials_returns401WithJsonError dans AuthControllerSecurityTest — pars de l'état actuel du fichier (déjà committé sur HEAD), ne le casse pas.

## Triage
Taille: XS
Modele: sonnet
Effort: medium
