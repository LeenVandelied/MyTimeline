# Audit tests — Sprint 119

> Montée de plateforme (#886) : aucune règle métier ajoutée ni modifiée. L'audit vérifie la non-régression.

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| — | aucune BR touchée (dépendances seules) | NON | ✅ 688/688 | ✅ (Testcontainers Postgres) | N/A (frontend inchangé) | ✅ suite CI + parcours navigateur | N/A |

## Tests créés / modifiés
- `BomDriftTest#jackson3IsTheManagedSerializer` (garde de version Jackson 3).
- 25 fichiers de test adaptés (imports Boot 4, `@MockitoBean`, Jackson 3) sans changement d'assertion.

## Résultats runs
- Backend : 688 tests, 688 passés, 0 échec (`mvnw verify`, local).
- Boot réel `java -jar` sur base vierge : Flyway V1→V16, `ddl-auto=validate` OK.
- Parcours navigateur : inscription → connexion → catégorie → produit → événement → frise : OK.
- CI PR #893 : à compléter au SHA final.

## Conclusion
Prêt pour PR une fois la CI verte au SHA final.
