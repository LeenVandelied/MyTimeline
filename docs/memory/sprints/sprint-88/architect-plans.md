# Mini-plans architect — Sprint 88

> Généré par /sprint plan 5 -c "focus mvp" (architect, 2026-09-13). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> [V] = vérifié dans le code par l'architect ; [D] = déduit.

**Thème :** Harnais de confiance — logs CI, rate-limit E2E, base locale
**Vagues :** V1 = #568 ∥ #545 | V2 = #547 (pile E2E exclusive, plusieurs runs CI)
**Cohésion :** 0.00 (WARNING — split #545 → S89 proposé et écarté : thème commun zéro code produit, #545 = doc seule)

## Arbitrages
- **#545 — TRANCHÉ (dev, 2026-09-13)** : requalifiée en documentation (M → S). Aucun `DROP DATABASE` / `docker compose down -v` sans « oui » explicite.
- **#568 — À CONFIRMER au /sprint start** : option recommandée = `spring.test.mockmvc.print=none` global (1 ligne) ; alternatives : `print=NONE` par classe, ou impression maison masquant les en-têtes sensibles.
- **#547 — À CONFIRMER au /sprint start** : modifie `ci.yml` (règle globale : confirmation explicite) ; recompter TOUS les créneaux du filtre (le flag les coupe tous) ; nombre de runs CI verts consécutifs exigés (proposition : 3).

```yaml
issue_568:
  fichiers_cles: ["backend/src/test/resources/application-test.properties"]
  couches_touchees: [test-config]
  strategie_test: "contrôle négatif : forcer un échec sur RegisterLoginIntegrationTest EN LOCAL, jamais committé, puis vérifier 0 occurrence de 'eyJ' dans la sortie Maven"
  risque_regression: "les 16 classes sans le helper #500 perdent leur dump d'échec"
  ordre_ecriture: "propriété → contrôle négatif → commentaire DEC"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    [V] 17 classes portent @AutoConfigureMockMvc, aucune avec argument (grep 'AutoConfigureMockMvc(' vide).
    [V] application-test.properties : aucune propriété mockmvc ; 'jwt.private-key=' vide → paire RSA
        éphémère par contexte (le jeton publié ne se vérifie avec aucune clé qui survit au run).
    [V] Helper #500 présent seulement dans AuthControllerLegacyPasswordLoginTest.java:226.
    [V] Aucun rapport surefire uploadé (ci.yml upload-artifact : jacoco, vitest, playwright) → fuite
        limitée à la sortie standard des logs CI.
    [V] Spring Boot 3.5.16 (pom.xml:8), pas 3.4 comme l'indique CLAUDE.md.
issue_545:
  fichiers_cles: ["README.md (section dépannage)", "docs/memory/pitfalls.md:304,406 (+ gen-pit-packs.sh)"]
  couches_touchees: [docs]
  strategie_test: "aucune nouvelle ; preuve = job flyway-smoke vert sur base vierge"
  risque_regression: "nul si doc seule ; ne PAS éditer V7 (checksum) ; une V16 ne peut pas s'exécuter avant V7"
  ordre_ecriture: "README dépannage → correction PIT-S47 → gen-pit-packs.sh + --check"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    [V] 'events_recurrence_unit_check' n'apparaît dans AUCUNE migration. V4:95, V7:100, V9:67 posent
        'ck_events_recurrence_unit' → nom auto Postgres = contrainte créée hors Flyway
        ([D] ancien ddl-auto, adopté via baseline-on-migrate=true, application.properties:26).
    [V] flyway-smoke = success au SHA 77666e7 (run 34769112837) : V1..V15 sur Postgres 16 vierge.
        Un clone n'est PAS cassé (revérifié par le lead du plan).
    [V] pitfalls.md:406 (PIT-S47) inexact : le pré-vol V7 lève « V7 abort », pas une violation de CHECK.
    [V] Aucun conteneur Postgres MyTimeline actif au moment du plan : état réel de la base du poste non observé.
issue_547:
  fichiers_cles: [".github/workflows/ci.yml:295", "docker-compose.yml:168", "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:130", "backend/src/main/resources/application-e2e.properties:52", "frontend/src/__tests__/e2e-register-budget.test.ts", "frontend/e2e/auth.setup.ts", "frontend/e2e/support/accounts.ts"]
  couches_touchees: [infrastructure-security, config, ci, e2e]
  strategie_test: "unit (budget recompté, modèle e2e-register-budget) + integration (plafond login du profil e2e) + E2E suite complète locale + 3 runs CI"
  risque_regression: "429 intermittents : CI à workers:2 × 2 passes frontend (:3000/:3001), et les créneaux forgot/reset/avatar sont ré-armés en même temps"
  ordre_ecriture: "recompte de TOUS les créneaux → propriété login-per-minute (modèle registerPerMinute :327) → test IT → retrait du flag compose puis ci.yml → runs"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    [V] Plafond login codé en dur à 10 (RateLimitingFilter.java:130) ; seul register est réglable (:327).
    [V] RATE_LIMIT_ENABLED=false dans le job e2e (ci.yml:295) et le service backend-e2e (docker-compose.yml:168).
    [V] application-e2e.properties:43 : le flag court-circuite le filtre ENTIER.
    [V] Commentaire ci.yml:292 périmé (« register 5/min » ; le profil e2e est à 20).
```
