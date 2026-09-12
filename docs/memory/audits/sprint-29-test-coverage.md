# Audit tests — Sprint 29 (Conteneurisation & déploiement)

> Généré en fin de Phase 6. Aucun `[MISSING]` → Phase 9 PR débloquée.

## Couverture par BR-XX

Sprint 29 = devops/ops pur. **Aucune BR métier impactée** (les 3 issues déclarent "BR impactées : Aucune"). Aucun cross-system flow métier nouveau → aucun E2E métier requis.

| Issue | Nature | Cross-system flow | Vérification | Statut |
|-------|--------|:---:|--------------|:---:|
| #37 Docker | infra/devops + actuator health | NON | Smoke stack complet (`up`→health UP→`down`) + suite unit backend/front | ✅ |
| #181 Flyway | outillage ops | NON | shellcheck clean + garde-fous testés (refus URL prod, gate count>0) ; validation données réelles = dev/ops | ✅ tooling |
| #112 Secrets | runbook doc | NON | Aucune exécution ; revue "pas de secret exposé" | ✅ doc |

## Tests exécutés
- **Backend** : `./scripts/test-quiet.sh unit` (Spring Boot + Testcontainers Postgres) → **301/301 OK**, 0 failed, 0 skipped (82s).
- **Frontend** : `./scripts/test-quiet.sh frontend` (Vitest + TS strict) → **383/383 OK**, 0 failed, 54 fichiers (37s). Warnings aria-describedby non bloquants.
- **Smoke Docker (#37, par le fullstack-dev)** : `compose build` back+front OK ; `up` → postgres Healthy → backend `/actuator/health` `{"status":"UP"}` (DB check inclus) → frontend HTTP 307 (redirect locale) ; `down` OK.
- **E2E Playwright** : NON lancé — aucun nouveau `data-testid` (Phase 8 coverage = OK), aucun parcours UI nouveau.

## Sécurité
- `SecurityConfig` : `/actuator/health` permitAll — vérifié sans bypass d'auth (test-runner) ; les autres endpoints actuator restent sécurisés (défaut Spring). Confirmation finale attendue du reviewer batch.

## Reste ouvert (hors périmètre agent, délégué au dev/ops)
- #181 : `validate`/`migrate`/count sur dump prod réel (accès DB requis) — cases ouvertes §5 runbook.
- #112 : purge historique + rotation secrets — session ops dédiée + fenêtre planifiée + "oui" dev.

## Conclusion
Aucun `[MISSING]`. Régression = 0. Prêt pour PR → `dev` (sous réserve du rapport reviewer).
