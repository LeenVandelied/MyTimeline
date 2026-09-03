# Mini-plans architect — Sprint 72

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1.

#72 ∥ #142 parallélisables (frontend Timeline vs backend Brevo).

```yaml
issue_0072:
  fichiers_cles: ["frontend/src/components/timeline/ (Timeline)", "frontend/src/components/events/EventCard.tsx", "frontend/src/styles/ds/ (classes mt-date--short, mt-num)", "frontend/package.json (retrait date-fns inutilisé)"]
  couches_touchees: ["frontend"]
  strategie_test: "unit (formatage par locale) + E2E (bascule fr/en/es/de rend le bon format)"
  risque_regression: "rupture d'affichage si une locale manque de fallback Intl ; retrait date-fns peut casser un import résiduel (build)"
  ordre_ecriture: "frontend : util de formatage Intl → Timeline → EventCard → purge date-fns"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — NO-OP vérifié réel : dayjs().format encore utilisé)"
```
```yaml
issue_0142:
  fichiers_cles: ["infrastructure/adapters/BrevoEmailService", "abstraction emailLocale", "templates Brevo (EN/DE/ES)"]
  couches_touchees: ["application","infrastructure"]
  strategie_test: "integration (sélection template selon emailLocale)"
  risque_regression: "emailLocale manquant/mal résolu → mauvais template ou fallback FR silencieux"
  ordre_ecriture: "application (résolution emailLocale) → infra (BrevoEmailService + templates)"
  zod_dto_sync: "NON (frontend non concerné)"
  possibly_done: false
  etat_reel_du_code: "(à déterminer par fullstack-dev)"
```
