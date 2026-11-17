# Mini-plans architect — Sprint 31

> Généré par /sprint plan (architect, focus MVP, 2026-07-07). Lu par /sprint start Phase 4.1.
> Thème : Sécurité d'exposition — CVE & fuite logs. Cohésion 0.37 (point faible du plan, > 0.3 → pas de split forcé).
> Migrations : aucune. Vagues : V1 tout parallèle (#222 front, #223 back, #160 logs — fichiers disjoints).
> Split optionnel possible : sortir #223 vers S30 (backend hardening) → S31 = frontend-security pur.

issue_222:
  fichiers_cles:
    - "frontend/package.json"
    - "frontend/package-lock.json"
    - ".github/workflows/ci.yml"
  couches_touchees: ["frontend/build", "infrastructure/ci"]
  strategie_test: "`npm audit --audit-level=high` → 0 HIGH/CRITICAL ; suite vitest verte post-bump ; job CI security sans --omit=dev passe"
  risque_regression: "bump vite/vitest = breaking config (vite.config, plugins) → vérifier build Next + tests unitaires ; retirer --omit=dev peut ré-exposer d'autres CVE dev à corriger dans le même lot (scope potentiellement > M)"
  ordre_ecriture: "bump ciblé vitest/vite chain → réparer config si breaking → relancer audit → retirer --omit=dev dans ci.yml → valider run CI"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

# issue_223 (S) : trivy fs --severity HIGH backend/ → identifier 4 CVE HIGH résiduelles post-#180.
#   Bump patch/minor dans pom.xml OU documenter acceptation motivée (risque+raison) dans fichier de suivi. Re-scan.

issue_160:
  fichiers_cles:
    - "frontend/src/components/.../AddProducts*"
    - "frontend/src/services/authService*"
  couches_touchees: ["frontend/services"]
  strategie_test: "grep console.error(err brut sur les 2 fichiers résiduels ; remplacer par safeErrorMessage ; vérifier aucun objet axios brut loggé"
  risque_regression: "faible — remplacement mécanique par helper existant @/lib/safe-error"
  ordre_ecriture: "grep AddProducts + authService D'ABORD → fix si nécessaire"
  zod_dto_sync: "NON"
  possibly_done: true
  etat_reel_du_code: |
    2/4 sites déjà migrés vers safeErrorMessage (dashboard/page.tsx + EventContent.tsx confirmés
    par le lead Phase 0.5). Résiduel = AddProducts + authService uniquement.
    RE-SCOPER/vérifier avant respawn : possiblement déjà quasi-fait → risque de sprint à vide.
    Fullstack-dev doit grep `console.error(err`/axios brut sur ces 2 fichiers d'abord ;
    si déjà propres → fermer #160 sans commit.
