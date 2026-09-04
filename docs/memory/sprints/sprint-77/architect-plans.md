# Mini-plans architect — Sprint 77

> Généré par /sprint plan (architect, 2e vague S74-S77). Lu par /sprint start Phase 4.1.
> Type : QA-hardening (valeur anti-régression indirecte, pas de gain utilisateur direct — assumé).
> Vagues : V1 #294 ∥ #457 → V2 #191 (si #191 édite core.css lu par #457, sinon V1).

```yaml
issue_0294:
  fichiers_cles: ["frontend/e2e/landing-auth-visual.spec.ts (nouveau)"]
  couches_touchees: ["frontend"]
  strategie_test: "E2E (toHaveScreenshot, 2 thèmes x 5 écrans)"
  risque_regression: "faux positifs de diff visuel selon rendu fonts CI vs local ; générer les refs EN CI ; aucune BR"
  ordre_ecriture: "spec -> refs commitées générées en CI -> tolérance de diff"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "pas de spec visuelle landing/auth existante ; toggle next-themes déjà en place"
```
```yaml
issue_0457:
  fichiers_cles: ["frontend/src/styles/__tests__/ (nouvelle garde .tsx)", "frontend/src/styles/__tests__/control-border-tier.test.ts (~l.158, angle mort documenté)"]
  couches_touchees: ["frontend"]
  strategie_test: "unit statique + contrôle négatif (mutation volontaire rouge)"
  risque_regression: "faux positifs si la garde grep interdit ring-* légitime ; documenter DEC-S58-001 ; aucune BR"
  ordre_ecriture: "garde (test/ESLint/script) -> contrôle négatif -> référence DEC-S58-001"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "control-border-tier.test.ts existe mais ne lit jamais de .tsx"
```
```yaml
issue_0191:
  fichiers_cles: ["frontend/src/components/ui/*", "frontend/src/styles/ds/core.css", "frontend/src/components/timeline/* (stories)"]
  couches_touchees: ["frontend"]
  strategie_test: "revue visuelle manuelle (ui-design) clair+sombre ; pas de test auto"
  risque_regression: "risque de déborder en volume de correctifs si écart shadcn/Radix vs Graphite large"
  ordre_ecriture: "revue clair -> revue sombre -> corriger écarts OU créer tickets suivi"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "22 stories livrées S16 ; revue visuelle jamais faite"
```
