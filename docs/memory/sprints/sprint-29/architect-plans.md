# Mini-plans architect — Sprint 29

> Généré par /sprint plan (architect, focus MVP, 2026-07-07). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implémentation").
> Thème : Conteneurisation & artefacts de déploiement. Cohésion 0.53. Migrations : aucune (Flyway head = V12).
> Vagues : V1 = #37 ∥ #181 (disjoints) | V2 = #112 ISOLÉ, DESTRUCTIF, en dernier.

issue_37:
  fichiers_cles:
    - "docker-compose.yml"
    - "backend/Dockerfile"
    - "frontend/Dockerfile"
    - ".dockerignore"
    - "backend/.dockerignore"
    - "frontend/.dockerignore"
  couches_touchees: ["infrastructure/devops"]  # aucun code domaine/application
  strategie_test: "build local des 3 images + `docker compose up` smoke (backend /actuator/health, frontend :3000, postgres ready) ; pas de test unitaire, step CI build-only optionnel"
  risque_regression: "faible — nouveaux fichiers isolés ; risque = divergence config env (ports, DATABASE_URL) vs application-*.properties existant → aligner sur profils prod"
  ordre_ecriture: ".dockerignore x3 → backend/Dockerfile (multi-stage mvnw) → frontend/Dockerfile (next build standalone) → docker-compose.yml (postgres+backend+frontend+réseau+volumes)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_181:
  fichiers_cles:
    - "scripts/flyway-validate.sh (nouveau, ops)"
    - "backend/src/main/resources/db/migration/V*.sql (lecture seule)"
  couches_touchees: ["infrastructure/devops"]
  strategie_test: "opération ops sur dump/staging — checksum + `flyway validate` + `flyway migrate` dry-run"
  risque_regression: "AUCUN ALTER manuel (règle STOP DB). Documenter résultat, pas de code applicatif."
  ordre_ecriture: "préparer dump staging → validate → migrate dry-run → documenter"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_112:
  fichiers_cles:
    - "historique git complet (pas de fichier source)"
  couches_touchees: ["devops/ops"]
  strategie_test: "vérifier absence des valeurs compromises post-purge (git log -p | grep) ; ré-clonage de contrôle"
  risque_regression: "⚠ DESTRUCTIF — STOP obligatoire. Réécriture historique = force-push origin, invalide tous clones/worktrees/PR ouvertes (dont PR release #23). Réversibilité : backup miroir AVANT. Rotation des secrets purgés en parallèle (RTK.md §sécurité). Attendre 'oui' dev explicite + fenêtre planifiée + freeze PR."
  ordre_ecriture: "backup miroir → filter-repo (path/patterns application.properties + valeurs compromises) → force-push fenêtre planifiée → rotation secrets → communication équipe"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
