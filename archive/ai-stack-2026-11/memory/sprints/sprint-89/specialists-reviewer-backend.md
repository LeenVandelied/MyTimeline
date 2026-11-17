# Revue batch Sprint 89 — domaine backend (reviewer, cycle 1)

> Diff : `*.java` de `origin/dev..6eee23e` (207 lignes) — commits `ad57148` (#546), `6eee23e` (#685).
> Tests uniquement : aucun code de production backend, aucune migration.

**VERDICT : 0 CRITIQUE / 0 MAJEUR / 2 MINEUR**

## Constats OK
- `CategoryDeleteReassignIntegrationTest` — le 409 est prouvé par une requête native qui constate que le produit reste lié (pas seulement le type d'exception) ; le cas avec cible vérifie le produit archivé déplacé. Conforme à `CategoryServiceImpl.deleteCategory` (le comptage inclut les archivés, réassignation avant suppression dans la même transaction).
- `RateLimitTunableCeilingTest` — `bindingRunner` passe par le vrai constructeur `@Value Integer`, `ApplicationConversionService` et `PropertyPlaceholderAutoConfiguration` ; noms de propriétés identiques à `RateLimitingFilter.java:352-358` ; aucune datasource (PIT-S37-002 respecté).
- Isolation — `ApplicationContextRunner.run()` crée un contexte neuf par invocation : aucun état Bucket4j ni horloge partagés entre les 5 nouveaux tests.
- Hexagonal — diff limité à `src/test/**`, aucun import Spring/JPA ajouté dans `domain/`.

## Constats MINEUR
1. `RateLimitTunableCeilingTest.java:150-161` (`blankProperty_bindsToNull_appliesDefault`) — la « propriété blanche » passe par `withPropertyValues` (source de test) et le cas suivant par variable d'environnement ; les deux sont complémentaires, mais le commentaire de section (~l.98-103) ne dit pas laquelle des deux sources il couvre. Correctif : préciser le commentaire.
2. `RateLimitTunableCeilingTest.java:196-205` (`nonNumericProperty_failsTheBinding`) — `hasRootCauseInstanceOf(NumberFormatException.class)` dépend du convertisseur interne de Spring ; fragilité possible à une montée de version (pas de défaut actuel).

## Arbitrage du dev (2026-09-14) : corriger les deux MINEUR utiles avant la fusion
- **MINEUR 1 — CORRIGÉ par le lead.** Le commentaire visé n'était pas aux l.98-103 (position dans le hunk) mais la javadoc de `bindingRunner` : elle nomme désormais les deux sources des cas « valeur blanche » (`withPropertyValues` = propriété de configuration ; `env` via `SystemEnvironmentPropertySource` = variable exportée vide) et dit qu'elles sont complémentaires. Javadoc seule ; `RateLimitTunableCeilingTest` rejoué : 10/10, `mvnw exit=0`.
- **MINEUR 2 (couplage à `NumberFormatException`) — non corrigé**, reste en follow-up : aucun défaut actuel.

## Réserve du lead
Les numéros de ligne cités pour `CategoryDeleteReassignIntegrationTest` (`18-62`) ressemblent à des positions dans le hunk du diff plutôt que dans le fichier : à relocaliser avant toute correction.
