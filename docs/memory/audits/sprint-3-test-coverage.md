# Audit tests — Sprint 3

> Généré en fin de Phase 6. Un marqueur de couverture manquante bloquerait la Phase 9 PR. Aucun ici (table 100% ✅/N-A).
> Sprint d'infrastructure (secrets, Flyway, audit JPA) — pas de flux fonctionnel user-facing nouveau.

## Couverture par sujet

| Sujet | Cross-system flow | Unit/intégration backend | E2E métier | Statut |
|-------|:---:|:---:|:---:|:---:|
| #34 Externalisation secrets (boot via env, profils dev/prod, fail-fast prod) | NON | ✅ smoke boot (EventmanagerApplicationTests, profil dev OK ; profil prod fail-fast vérifié manuellement) | N/A (config) | OK |
| #42 Flyway baseline V1 + uniques V2 (`validate`, baseline-on-migrate) | NON | ✅ Flyway valide 3→ puis 4 migrations, Hibernate `validate` OK au boot ; uniques username/email actives | N/A (infra DB) | OK |
| #43 Audit JPA : createdAt/updatedAt + @Version + equals/hashCode | NON | ✅ AuditingAndEqualityTest (3) : audit peuplé au persist, version 0→1 au update, equals/hashCode transient-safe | N/A (refactor persistance) | OK |

Aucun des 3 sujets n'est un flux cross-system 2+ rôles/systèmes user-facing → pas d'E2E métier requis (issues infra/transversales, BR fonctionnelle nulle ou indirecte).

## Tests créés ce sprint
- `backend/src/test/.../infrastructure/entities/AuditingAndEqualityTest.java` (#43) — 3 tests (`@Transactional`, rollback).

## Résultats runs (sprint/3 HEAD = 888721f)
- Backend : **32 tests, 32 passed, 0 failed, 0 errors** (`cd backend && SKIP_DELEGATION=1 DB_PASSWORD=motdepasse mvn test`).
- Flyway : `Successfully validated 4 migrations`, schema "public" version 3, `validate` OK.
- Frontend : aucun changement frontend testable (#34 a ajouté `frontend/.env.example` uniquement — pas de code).
- E2E : aucun nouveau parcours (pas de testid frontend ajouté).

## Notes / dette connue (non bloquant)
- ⚠️ Aucune isolation des tests : les `@SpringBootTest` tapent la base dev réelle `eventmanager` (pas de Testcontainers/H2, pas d'`application-test.properties`). Surfacé par #42 (data sale dédupliquée ce sprint). RECOMMAND_FOLLOWUP → à traiter (Testcontainers / profil test).
- Default DB password du profil dev (`motdepasse_dev_local`) ≠ vrai mot de passe local → boot/test exige `DB_PASSWORD=motdepasse` en env. RECOMMAND_FOLLOWUP.

## Conclusion
Prêt pour PR. Suite verte (32/32), schéma versionné cohérent (Flyway v3, validate OK), aucune couverture manquante bloquante.
