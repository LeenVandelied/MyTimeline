[BRIEFING ISSUE #118]

## Issue
[CONFIG] Définir le domaine cookie de prod (COOKIE_DOMAIN) avant déploiement

## Contexte

Le Sprint 4 (#99) a externalisé la configuration des cookies JWT : le domaine est désormais lu depuis la variable d'environnement `COOKIE_DOMAIN` (propriété `app.cookie.domain`). Si cette variable n'est pas définie, le cookie est émis sans attribut `Domain`, ce qui le rend « host-only » — il ne sera partagé qu'avec le domaine exact, sans couvrir les sous-domaines.

Pour un déploiement en production avec plusieurs sous-domaines (ex. `api.mytimeline.app` et `app.mytimeline.app`), ce comportement par défaut empêcherait le bon fonctionnement de l'authentification.

**Source :** `docs/memory/sprints/sprint-4/` — triage de clôture PR #113.

## À faire

Avant tout déploiement en production :
1. Définir la valeur de `COOKIE_DOMAIN` dans l'environnement de production (variable d'environnement ou `application-prod.properties`)
2. Documenter cette étape obligatoire dans le runbook de déploiement

## BR impactées

Aucune

## Critères d'acceptation

- [ ] La variable `COOKIE_DOMAIN` est documentée dans le runbook de déploiement comme étape obligatoire pré-déploiement
- [ ] La valeur est fournie dans l'environnement de production (ex. `COOKIE_DOMAIN=mytimeline.app` pour couvrir tous les sous-domaines)
- [ ] Un commentaire dans `application.properties` ou `application-prod.properties` explique l'impact d'une valeur manquante

## Piste technique

- Fichier : `src/main/resources/application.properties` ou `application-prod.properties`
- Propriété : `app.cookie.domain=${COOKIE_DOMAIN:}`
- Runbook de déploiement : `docs/` (à créer ou compléter)

## Dépendances

- #99 (externalisation config cookies — terminé, précondition de cette issue)

## Risques techniques

**Bloquant avant mise en production** si des sous-domaines sont utilisés. En l'absence de `COOKIE_DOMAIN`, l'authentification peut fonctionner en mono-domaine mais échouer silencieusement en multi-sous-domaines.

## Estimation

XS — configuration + documentation, aucun code applicatif à modifier.


## Plan d'implementation
Follow-up S4. Le body de l'issue ci-dessus EST le plan. Issue de CONFIG + DOC (aucun code applicatif).
- Le cookie JWT lit déjà `app.cookie.domain=${COOKIE_DOMAIN:}` (externalisé en #99). Si COOKIE_DOMAIN absent → cookie host-only (pas de sous-domaines).
- À FAIRE :
  1. Documenter COOKIE_DOMAIN comme étape OBLIGATOIRE pré-déploiement prod (ex: COOKIE_DOMAIN=mytimeline.app pour couvrir les sous-domaines).
  2. Ajouter un commentaire explicatif dans application-prod.properties (impact d'une valeur manquante).
  3. Compléter le runbook de déploiement.
- IMPORTANT cohérence runbook : #111 a créé docs/runbook/deploiement-profils.md (ENVIRONMENT=production) et #120 a créé docs/runbook/cors-cookie-samesite.md (CORS_ALLOWED_ORIGINS). REGROUPE/RÉFÉRENCE ces vars d'env prod obligatoires de façon cohérente (ne crée pas un 3e runbook isolé qui se contredit — relie-les, ou complète le plus pertinent). Liste finale des env prod obligatoires : SPRING_PROFILES_ACTIVE=prod, ENVIRONMENT=production, CORS_ALLOWED_ORIGINS, COOKIE_DOMAIN (+ secrets DB/JWT existants).

## Triage
Taille: XS
Modele: sonnet
Effort: medium
