# Issue #356 — CI : job smoke Flyway (base vierge + migrate + ddl-auto=validate)

RETOUR :
- commits: [f9d5058]
- resume: job `flyway-smoke` ajouté dans `.github/workflows/ci.yml` (aucun `needs:`, en
  parallèle). Approche **boot du jar seul**, PAS de CLI `flyway migrate` séparé — écart
  assumé au libellé de l'issue, justifié par la config vérifiée :
  `application.properties:25` `spring.flyway.enabled=true` + `application-dev.properties:9`
  et `application-prod.properties:9` `spring.jpa.hibernate.ddl-auto=validate`. Le boot fait
  donc DÉJÀ migrate puis validate ; un CLI séparé testerait un chemin parallèle pouvant
  diverger du chemin réel (démarrage applicatif prod). 4 steps de fond : build jar
  (`-DskipTests package`), boot en fond sur service container `postgres:16` éphémère,
  poll `/actuator/health` avec échec par défaut (process mort / timeout ⇒ `exit 1` + log),
  puis relecture de `flyway_schema_history` (psql) exigeant `count(success) == nb de
  fichiers V*.sql` ET `première version == 1` — c'est CE step qui rend la virginité de la
  base vérifiable (risque de faux négatif nommé dans l'issue).
- verif:
  - YAML (PyYAML absent ⇒ Psych/ruby) : `["backend","e2e","flyway-smoke","frontend","security"]`,
    `needs=nil`, 7 steps, service postgres OK. `bash -n` OK sur les 5 blocs `run`.
  - Repro locale RÉELLE (docker `postgres:16` jetable, port hôte 55432, jar buildé,
    profil dev, `SERVER_PORT=18080`) — steps rejoués VERBATIM :
    `Flyway: Successfully validated 15 migrations` → `All configured schemas are empty;
    baseline operation skipped` → migrate V1..V15 → Hibernate `validate` OK (aucune
    `SchemaManagementException`) → `Started EventmanagerApplication` →
    `/actuator/health` = `{"status":"UP"}`. Step de vérif :
    `Migrations attendues : 15 | appliquées : 15 | première version jouée : 1` ⇒ VERDICT=0.
  - Test NÉGATIF (le job peut rougir) : même boucle contre une DB injoignable ⇒
    `DETECTED_DEAD_AT_ATTEMPT=9`, `RC=1`. La détection de mort du process fonctionne :
    c'est le mécanisme qui portera une future `SchemaManagementException`.
  - Conteneur `flyway-smoke-local` supprimé (`docker rm -f`), aucun process java résiduel,
    aucun conteneur `docker compose` touché.
  - NON vérifié : exécution réelle sur runner GitHub (pas de push, cf. consigne). Deux
    hypothèses non testables localement : présence de `psql` sur `ubuntu-latest` (client
    PostgreSQL préinstallé sur l'image — si absent, le step de vérif rougirait pour une
    mauvaise raison) et `/actuator/health` joignable en CI (prouvé localement seulement).
- [MEMORY:decision] Contexte: #356 demandait un `flyway migrate` CLI en CI. Décision: prouver
  la propriété via le BOOT du jar contre une base vierge, sans CLI. Pourquoi: la config fait
  déjà migrate+validate au démarrage ; un CLI séparé serait un chemin parallèle divergeable
  du chemin prod, et n'exercerait pas `ddl-auto=validate`.
- [MEMORY:pattern] Problème: un job CI qui lance un serveur en fond ne peut pas rougir (code
  de sortie perdu, cf. job `e2e` ligne 210). Solution: poll avec échec par défaut — `kill -0`
  sur le PID à chaque tour (mort ⇒ exit 1 immédiat + dump log) + preuve POSITIVE de démarrage
  (`/actuator/health` = UP) + timeout ⇒ exit 1. Anti-pattern: `sleep N` puis continuer, ou
  poll qui `break` sans verdict.
- [MEMORY:pitfall] Contexte: le commentaire du job `e2e` dit « Pas d'actuator ». Faux —
  `/actuator/health` répond 200 `{"status":"UP"}` (exposition par défaut Spring Boot,
  vérifié au boot local). Prévention: sonder avant de recopier un commentaire existant.
- recommandations suite:
  - RECOMMAND_FOLLOWUP: après le 1er run vert, envisager d'ajouter `flyway-smoke` aux checks
    requis de `dev`/`main` (périmètre de #361 — NON fait ici : rendre requis un check jamais
    passé bloquerait tous les merges, cf. en-tête ci.yml lignes 3-5).
  - RECOMMAND_FOLLOWUP: le commentaire « Pas d'actuator » du job `e2e` (ci.yml ~ligne 214)
    est faux ; le poll `/api/auth/me` pourrait passer sur `/actuator/health` (readiness plus
    stricte). Hors périmètre #356.

STATUS: COMPLETED
