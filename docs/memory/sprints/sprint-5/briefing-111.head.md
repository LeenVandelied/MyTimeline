[BRIEFING ISSUE #111]

## Issue
[SECURITY] Durcir SPRING_PROFILES_ACTIVE (fallback prod → dev silencieux)

## Contexte
Détecté pendant la review sécurité Sprint 3 (#34, PR #106). `application.properties` définit `spring.profiles.active=${SPRING_PROFILES_ACTIVE:dev}`.

## Problème
Si `SPRING_PROFILES_ACTIVE` est absent en production, Spring active SILENCIEUSEMENT le profil `dev` — avec ses defaults non-secrets (`motdepasse_dev_local`, jwt dev) au lieu du profil `prod` fail-fast. Mitigation actuelle : la DB URL dev pointe `localhost` → un prod mal configuré crashe à la connexion plutôt que de tourner en clair, mais c'est de la défense passive.

## À faire (au choix)
- Retirer le default `:dev` et exiger `SPRING_PROFILES_ACTIVE` explicite (casse le confort dev → documenter), OU
- Garder le default dev mais ajouter un garde-fou prod (ex : check au démarrage qui refuse de booter en profil dev si une variable d'env `ENVIRONMENT=production` est présente), OU
- Documenter clairement dans `.example` + runbook déploiement que `SPRING_PROFILES_ACTIVE=prod` est OBLIGATOIRE.

## Triage estimé
S | Domaine : devops / sécurité


## Plan d'implementation (architect, /sprint plan)
```yaml
issue_111:
  fichiers_cles: ["backend/src/main/resources/application.properties", "backend/src/main/resources/application.properties.example"]
  couches_touchees: ["config"]
  strategie_test: "integration — au boot, si garde-fou choisi : le contexte refuse de demarrer en profil dev quand ENVIRONMENT/condition prod est presente ; sinon doc-only (commentaire + .example + runbook)"
  risque_regression: "retirer le default :dev casse le confort dev (tout mvn/IDE devrait alors fixer SPRING_PROFILES_ACTIVE). PRIVILEGIER un garde-fou prod (ex: ApplicationListener / @PostConstruct qui refuse le boot si profil dev actif ET marqueur d'env prod present) plutot qu'une suppression seche du fallback."
  ordre_ecriture: "option recommandee : garder ${SPRING_PROFILES_ACTIVE:dev} + ajouter un check au demarrage (fail-fast si dev en prod) + documenter dans .example + runbook. 3 options listees dans le body de l'issue — choisis-en une et JUSTIFIE le choix dans le done.md."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "BUG CONFIRME — application.properties: spring.profiles.active=${SPRING_PROFILES_ACTIVE:dev} (fallback silencieux vers dev)."
```

## Triage
Taille: S
Modele: opus
Effort: high
