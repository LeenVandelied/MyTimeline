# Mini-plans architect — Sprint 42 (Modale conflit comparative 409)

> Généré par /ai-env:sprint plan 5 (2026-07-13). Lu par /sprint start Phase 4.1.
> Cohésion 0.60 | epic dominant: events | migrations: aucune.
> Vagues : V2 séquentiel strict (backend 409 → frontend diff → E2E #232).
> ⚠ SÉCURITÉ : invoquer security-expert sur #231 (risque fuite données d'autrui dans le corps 409).

```yaml
issue_0231:
  fichiers_cles:
    - "backend .../infrastructure/adapters/controllers/GlobalExceptionHandler.java"  # enrichir corps 409 optimistic-lock
    - frontend/src/components/shared/ConflictDialog.tsx     # existe (S25) → étendre en comparatif (actuellement version "recharger" plate)
    - "type/DTO corps 409 côté frontend"                    # nouveau shape serverVersion + entité serveur
  couches_touchees: [application, infrastructure, frontend]
  strategie_test:
    - "backend: corps 409 inclut serverVersion + entité serveur, SANS fuite données d'autrui (ownership vérifié AVANT sérialisation)"
    - "frontend: diff champ-par-champ; 'Garder mes modifs' re-soumet avec version serveur (pas de boucle 409); 'Prendre version serveur' discard+refresh"
  risque_regression: MOYEN — évolution contrat API 409 (BR-EVE-015); ordre check-ownership vs sérialisation CRITIQUE; boucle 409 si version serveur non réinjectée
  ordre_ecriture: [backend enrichir 409, DTO frontend, ConflictDialog diff+2 boutons, tests 2 couches]
  zod_dto_sync: OUI — type TS du corps 409 doit matcher EXACTEMENT le JSON backend (serverVersion, yourVersion, entité). Divergence = diff cassé silencieux
  possibly_done: false  # ConflictDialog existe mais version "recharger" plate, PAS comparative
  fichier_partage_risque: "GlobalExceptionHandler.java — CONFLIT avec #290 (S43) : S42 avant S43, #290 rebase sur le 409 enrichi"
  RECOMMAND_SECURITY: "audit ownership/sérialisation du corps 409 (fuite données d'autrui)"

issue_0232:
  fichiers_cles: ["E2E Playwright: conflit 409 + toggle archived"]
  couches_touchees: [E2E]
  strategie_test: "scénario 2 clients → 409 → modale comparative → chaque bouton; toggle archived"
  risque_regression: FAIBLE — dépend du contrat #231 livré (même sprint, APRÈS)
  possibly_done: false
```
