# Mini-plans architect — Sprint 16

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

issue_0166:
  fichiers_cles:
    - "backend/pom.xml (archunit-junit5)"
    - "backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java (nouveau)"
  couches_touchees: ["infrastructure"]
  strategie_test: "unit (ArchUnit — 4 règles hexagonales + FreezingArchRule baseline)"
  risque_regression: "FreezingArchRule pour ne pas casser sur les violations existantes ; câbler APRÈS #165 (S15) qui réduit la baseline (port sans DTO applicatif). Disjoint du frontend."
  ordre_ecriture: "infra (dép pom → règles → freeze baseline)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_0046:
  fichiers_cles:
    - "frontend/src/components/ui/ (shadcn à aligner Graphite)"
    - "frontend/src/components/**/*.stories.tsx (nouvelles stories)"
    - ".storybook/ (config)"
    - "frontend/src/styles/ds/ (tokens Graphite portés S6)"
  couches_touchees: ["frontend"]
  strategie_test: "build Storybook (npm run storybook:build) + visual"
  risque_regression: "Conflit variables CSS shadcn (--primary) vs tokens Graphite — peut nécessiter refonte, pas seulement stories. calendar.tsx orphelin : décision supprimer/documenter."
  ordre_ecriture: "frontend (config storybook → tokens → composants core → stories)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(greenfield design — rien n'existe)"

issue_0047:
  fichiers_cles:
    - "frontend/src/components/TimelineCalendar.tsx (à décomposer — 256 lignes)"
    - "frontend/src/components/timeline/ (cible : Ruler, Lane, EventBar, Minimap, Cursor, DateStamp, EventPill)"
    - "frontend/src/styles/calendar.css (à SUPPRIMER — sélecteurs .fc-* morts)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest sous-composants) + stories Storybook + vérif visuelle non-régression"
  risque_regression: "Contrat de props de TimelineCalendar.tsx doit rester INCHANGÉ (parents dépendants). BR-EVE-001 : extraction ne doit pas casser le filtrage par user. Audit complet avant suppression calendar.css (aucun sélecteur non-.fc-* utilisé)."
  ordre_ecriture: "frontend (extraction sous-composant par sous-composant + story à chaque étape → suppression css en dernier)"
  zod_dto_sync: "NON (mais consomme le contrat #150 — d'où dépendance S15)"
  possibly_done: false
  etat_reel_du_code: "(greenfield — Timeline frontend pas encore extraite)"
