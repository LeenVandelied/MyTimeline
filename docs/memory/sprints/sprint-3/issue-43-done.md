# Issue #43 — Audit JPA : timestamps + @Version + equals/hashCode — COMPLETED

**Commits :** 888721f (sprint/3)
**Vague :** V3

## Résumé
Traçabilité (createdAt/updatedAt) + verrou optimiste (@Version) + equals/hashCode stables sur les 4 entités JPA. Prérequis gestion conflit 409 (Wave 6).

## Décisions techniques
- **@Version = Integer** (col `version integer NOT NULL DEFAULT 0`). Backfill lignes dev existantes ; Hibernate gère l'incrément.
- **equals/hashCode = pattern Vlad Mihalcea** (id transient car `@GeneratedValue(AUTO)` assigné au flush) : `hashCode()` = `getClass().hashCode()` (constante, stable avant/après persist) ; `equals()` = même `getClass()` + `id != null && Objects.equals(id, that.id)`. Deux transient jamais égales par accident. Identique sur les 4 entités.
- **@EnableJpaAuditing** sur `EventmanagerApplication`.

## Fichiers
- `EventmanagerApplication.java` — `@EnableJpaAuditing`.
- 4 entités (`UserEntity`, `EventEntity`, `ProductEntity`, `CategoryEntity`) — `@EntityListeners(AuditingEntityListener.class)`, createdAt/updatedAt, @Version, equals/hashCode.
- `db/migration/V3__add_audit_columns.sql` (NEW) — `created_at`/`updated_at timestamp NOT NULL DEFAULT now()` + `version integer NOT NULL DEFAULT 0` sur users/categories/products/events. V1/V2 non touchés.
- `AuditingAndEqualityTest.java` (NEW, 3 tests) — audit peuplé au persist, version 0→1 au update, equals transient-safe + hashCode stable. `@Transactional` (rollback, base dev non polluée).

## Tests
Flyway "Successfully validated 4 migrations", schema version 3, EntityManagerFactory OK (validate passe). Suite **VERTE 32/32** (29 existants + 3 nouveaux).

## Signaux mémoire
- [MEMORY:pattern] equals/hashCode entité JPA à PK @GeneratedValue : `hashCode()=getClass().hashCode()` constant, `equals()` compare id quand non-null + même getClass(). Anti-pattern : equals/hashCode sur id direct ou Objects.hash(id).
- [MEMORY:decision] ddl-auto=validate + tables peuplées → @Version=Integer NOT NULL DEFAULT 0, audit cols timestamp NOT NULL DEFAULT now(). validate exige type/nullability identiques entité↔colonne.
- [MEMORY:pitfall] ajout colonnes avec validate actif : `@Column(nullable=false)` DOIT matcher NOT NULL SQL sinon boot échoue → tous @SpringBootTest cassent. Croiser type/nullability avant run.

## Recommandations suite
- RECOMMAND_NONE (scope complet, suite verte, dernière vague). La gestion conflit 409 (Wave 6) consommera ces @Version — hors scope.

STATUS: COMPLETED
