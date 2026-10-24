# Mini-plans architect — Sprint 116

> Généré par /sprint plan 5 (architect, 2026-10-24, base `86337a24`), déroulé à la main par le lead.
> Lu par /sprint start Phase 4.1 (section « Plan d'implémentation » du briefing fullstack-dev).
> Axe arbitré par le dev : **bugs visibles + suites du S112** ; Phase 0.5 scriptée remplacée par une contre-vérification
> manuelle (architect sur chaque issue, puis lead sur 8 affirmations clés). Numéros de ligne relevés sur `86337a24` : à re-grepper au démarrage.
> i18n : `frontend/public/locales/{fr,en,es,de}/*.json`. Mesures : `/usr/bin/grep` (RTK fausse `grep`, `grep -c`, `wc -l`).

**Thème :** Débit et harnais auth : 429 informatif, budget E2E, thème sans bandeau — cohésion 1.00 (br-packs : auth)
**Effort :** 5 pts | **Migrations Flyway :** aucune | **Dépend de :** aucune
**À trancher au démarrage :** #567 `Retry-After` seul ou aussi `X-RateLimit-*` (divulguent la config du throttle ; security-expert, ADR-010 §7 à amender) ;
#838 ne plus alimenter le bus #76 sur un 500 traité inline ([MEMORY:decision]) ; **#839 modifie `ci.yml` : confirmation explicite du dev avant merge**,
run CI complet vert avec Running T = passed + skipped (PIT-S88-007) ; #406 (commentaire « Pas d'actuator » faux, `ci.yml:312`) à joindre si le dev l'accepte.

**Vague :**
- V1 : #839 ∥ #567 ∥ #838 — fichiers disjoints (CI et harnais / filtres backend / `apiClient.ts`). #838 seul détenteur de Playwright ; #839 se valide par un run CI réel.

```yaml
issue_839:
  fichiers_cles:
    - ".github/workflows/ci.yml"
    - "frontend/e2e/auth.setup.ts"
    - "frontend/e2e/support/accounts.ts"
    - "frontend/src/__tests__/e2e-rate-limit-budget.test.ts"
    - "backend/src/main/resources/application-e2e.properties"
  couches_touchees: ["CI", "E2E", "tests de budget", "config"]
  strategie_test: "unit (budget) + run CI complet vert, Running T = passed + skipped"
  risque_regression: "auth.setup.ts:252 boucle sur ALL_ACCOUNTS : il faut un filtre (variable d'environnement), le filtre CLI ne sélectionne pas un compte ; 'persist account identities' doit rester entier. Test de budget :910 (« passe 2 qui re-provisionne ») et modèle :37 à réécrire."
  ordre_ecriture: "modèle du test de budget (rouge), filtre dans auth.setup.ts, ci.yml:571 + commentaire :568-570, lignes BUDGET :52-53, run CI, confirmation dev"
  zod_dto_sync: "NON"
  premisse_verifiee: "oui — ci.yml:571 lance auth.setup.ts + auth-signature.spec.ts, qui provisionne les 4 comptes (accounts.ts:346) ; auth-signature n'utilise que SHARED (:329)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_567:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java"
    - "backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java"
    - "backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (TimeMeter contrôlable, contrôle négatif PAT-S81-002) + unit sur UserRateLimitingFilter"
  risque_regression: "writeTooManyRequests (:606) partagé byte pour byte avec UserRateLimitingFilter (#831) : 12 slots, pas 11. tryConsume (:434, :524) devient tryConsumeAndReturnRemaining. Si un appel est cross-origin, Retry-After exige Access-Control-Expose-Headers."
  ordre_ecriture: "décision (ADR-010 §7, [MEMORY:decision]), tests d'en-tête rouges sur 2 slots + par utilisateur, signature writeTooManyRequests(response, retryAfterSeconds), call sites"
  zod_dto_sync: "NON"
  premisse_verifiee: "oui — RateLimitingFilter.java:606-611 n'écrit ni Retry-After ni X-RateLimit-* ; 0 occurrence Retry-After dans backend/src/main (vérifié par le lead)"
  possibly_done: false
  etat_reel_du_code: "Portée élargie depuis l'énoncé : + UserRateLimitingFilter (PUT /api/me/preferences, #831)."

issue_838:
  fichiers_cles:
    - "frontend/src/services/apiClient.ts"
    - "frontend/src/services/inlineErrorHandling.ts"
    - "frontend/src/services/networkStatus.ts"
    - "frontend/src/contexts/AuthContext.tsx"
    - "frontend/src/components/shared/OfflineBanner.tsx"
  couches_touchees: ["frontend (services)"]
  strategie_test: "unit+E2E (Vitest intercepteur + store ; E2E page.route 500 sur PUT /api/me/preferences : network-banner absent, thème appliqué ; témoin 429 inchangé)"
  risque_regression: "Couper le bus #76 sur un 500 marqué inline masque un serveur malade si c'est la seule requête en échec ; les autres requêtes continuent d'alimenter le bus."
  ordre_ecriture: "1) décision : handlesStatusInline(config,500) ⇒ pas de reportServerError 2) test rouge 3) garde dans apiClient.ts:196 4) mise à jour du commentaire inlineErrorHandling.ts:26-27"
  zod_dto_sync: "NON"
  premisse_verifiee: "oui — apiClient.ts:194-197 appelle reportServerError sur tout ≥500 avant le court-circuit ; le commentaire inlineErrorHandling.ts:26-27 assume que le bus reste alimenté"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
```
