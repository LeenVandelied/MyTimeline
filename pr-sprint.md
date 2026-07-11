## Sprint 30 — Garde-fous de boot prod & fiabilité auth

Thème : durcir le démarrage en production et fiabiliser le parcours auth. Sprint 100 % backend,
cohésion 0.76, aucune migration Flyway. Dépend du Sprint 29 (#37 fournit le profil prod conteneurisé
où ces garde-fous s'activent).

### Issues livrées (4)

| # | Type | Objet | Commit |
|---|------|-------|--------|
| #140 | bug | HealthIndicator Brevo : `/actuator/health` remonte DOWN si `BREVO_API_KEY` absente en prod (fini le NO-OP silencieux) | `fc92c7b` |
| #129 | chore | Filet de régression : test chargeant `application-prod.properties` → cookie JWT `Secure=true` | `5b80967` |
| #130 | feat | Log INFO au boot prod de la config cookie/CORS effective (diagnostic misconfig sans incident) | `55254fa` |
| #216 | security | Fail-fast : refuse le boot si `app.rate-limit.enabled=false` en environnement prod effectif | `2433738` |

### Vagues d'exécution
- **Vague 1** (parallèle, fichiers disjoints) : #140 ∥ #129
- **Vague 2** (parallèle, fichiers disjoints) : #216 ∥ #130

### Changements clés
- `ProfileSafetyGuard` (#216) : un seul `ApplicationListener`, désormais 2 checks fail-fast indépendants
  aux prédicats disjoints — #111 (marqueur prod + profil dev) inchangé et prioritaire, puis #216 (prod
  effectif + rate-limit off). Le job CI e2e (dev/test + `enabled=false`) n'est jamais bloqué ; property
  absente = défaut fail-safe `true`.
- `BrevoHealthIndicator` (#140) et `ProdConfigStartupLogger` (#130) : beans `@Profile("prod")` stricts,
  aucun effet en dev/test.
- **Anti-fuite secret** (transversal, croise #160) : #130 et #140 n'exposent/loggent QUE des flags de
  config non-sensibles ; aucun `DB_PASSWORD`/`JWT_SECRET`/`BREVO_API_KEY`. Test de non-fuite dédié (#140).
- `AuthControllerProdProfileCookieTest` (#129) : contexte léger (`@SpringJUnitWebConfig` +
  `@TestPropertySource`), pas de `@SpringBootTest`/Testcontainers — le test casse si `Secure` est retiré
  du fichier prod.

### Tests
- Backend : **318 tests, 0 failed** (`./scripts/test-quiet.sh backend`). +17 tests ce sprint
  (4 #140, 1 #129, 5 #130, 7 #216).
- Frontend / E2E : N/A (aucune modif frontend ; check coverage-E2E Phase 8 = OK).
- Audit complet : `docs/memory/audits/sprint-30-test-coverage.md`.

### Revue
- Review batch reviewer sur le diff complet (résultat consigné dans les artefacts sprint).

### Follow-ups détectés (à trier en /sprint end)
- Validation dure fail-fast si `COOKIE_DOMAIN`/`CORS_ALLOWED_ORIGINS` vides en prod (#130 avertit mais ne bloque pas).
- Fail-fast possible sur `app.cookie.secure=false` en prod effectif (même famille que #216).
- Alerting réel sur le composant `brevo` de `/actuator/health` (le healthcheck Docker ne lit que le statut global).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
