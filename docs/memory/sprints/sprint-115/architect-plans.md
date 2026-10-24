# Mini-plans architect — Sprint 115

> Généré par /sprint plan 5 (architect, 2026-10-24, base `86337a24`), déroulé à la main par le lead.
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **bugs visibles + suites du S112** ; Phase 0.5 scriptée remplacée par une contre-vérification
> manuelle (architect sur chaque issue, puis lead sur 8 affirmations clés). Numéros de ligne relevés sur `86337a24` : à re-grepper au démarrage.
> i18n : `frontend/public/locales/{fr,en,es,de}/*.json`. Mesures : `/usr/bin/grep` (RTK fausse `grep`, `grep -c`, `wc -l`).

**Thème :** Landing honnête et lisible à 200 %, sessions E2E contrôlées — cohésion 0.00 ⚠ (landing et harnais E2E hors br-packs ; cohésion par fichiers : #797 et #799 sur la landing)
**Effort :** 6 pts | **Migrations Flyway :** aucune | **Dépend de :** Sprints 113 et 114 (#840 migre aussi leurs specs)
**Décision produit au démarrage :** #797 — reformuler (recommandé) ; implémenter des rappels sort de l'axe.

**Vagues :**
- V1 : #797 (i18n ×4 + rejeu `sprint-103-use-case-frieze`) ∥ #799 (détient Playwright ; s'interdit les locales).
- V2 : #840 seul (Playwright, lots de ~10 specs rejoués et espacés, PIT-S96-006).

```yaml
issue_797:
  fichiers_cles:
    - "frontend/public/locales/{fr,en,es,de}/common.json"
    - "frontend/src/components/landing/HowItWorksSection.tsx"
    - "frontend/e2e/sprint-103-use-case-frieze.spec.ts"
  couches_touchees: ["frontend (i18n)"]
  strategie_test: "unit+E2E (sprint-103-use-case-frieze reste vert ; Vitest HowItWorksSection)"
  risque_regression: "Garder la clé interne 'reminder' et les data-testid ; le titre ET le sous-titre promettent aussi le rappel"
  ordre_ecriture: "décision dev consignée, libellés fr, puis en/es/de"
  zod_dto_sync: "NON"
  premisse_verifiee: "oui — fr/common.json:245-251 (titre, sous-titre, jalon « Un rappel avant chaque échéance », vérifié par le lead) ; 0 occurrence remind/notification dans backend/src/main"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — périmètre plus large que l'énoncé : 3 chaînes par locale, pas seulement le 1er jalon."

issue_799:
  fichiers_cles:
    - "frontend/src/components/landing/HeaderSection.tsx"
    - "frontend/src/components/landing/LandingMobileMenu.tsx"
    - "frontend/e2e/sprint-104-landing-sticky-nav.spec.ts"
    - "frontend/e2e/landing-mobile-overflow.spec.ts"
  couches_touchees: ["frontend", "E2E"]
  strategie_test: "E2E (tokens --text-* doublés, fr et de, 375 et 1024 px, scrollWidth ≤ clientWidth)"
  risque_regression: "HeaderSection porte un budget de largeur mesuré à la main (commentaires :31-75) ; 4 specs landing l'épinglent (logo, typographie, menu mobile, overflow)"
  ordre_ecriture: "audit des 5 sections en ×2, E2E rouge, correctif ciblé sans toucher aux locales"
  zod_dto_sync: "NON"
  premisse_verifiee: "partielle — non re-mesuré ; le test ×2 existant (sprint-104-landing-sticky-nav.spec.ts:268) n'asserte que la hauteur, l'assertion scrollWidth :391 porte sur le texte nominal"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_840:
  fichiers_cles:
    - "frontend/e2e/support/session.ts"
    - "frontend/e2e/*.spec.ts (70 fichiers, 96 occurrences `storageState: X.storageState`)"
  couches_touchees: ["E2E"]
  strategie_test: "E2E (lots rejoués) + garde unit dans e2e-rate-limit-budget.test.ts si une règle « pas de .storageState brut » est ajoutée"
  risque_regression: "Ne pas migrer `{ storageState: { cookies: [], origins: [] } }` (anonyme, ex. auth-signature.spec.ts:125) ni les specs qui lisent le fichier elles-mêmes (elles passent par assertUsableSession)"
  ordre_ecriture: "lister par /usr/bin/grep (PAS grep sous RTK), lots de ~10 fichiers, rejeu par lot"
  zod_dto_sync: "NON"
  premisse_verifiee: "partielle — helper présent (session.ts:59, 4be8ce20) ; compte réel 96 occurrences dans 70 fichiers, pas « 75 specs » ; déjà migrés : sprint-112-focus-return, settings-navigation"
  possibly_done: false
  etat_reel_du_code: "Plutôt M que S en volume (96 sites, rejeux)."
```
