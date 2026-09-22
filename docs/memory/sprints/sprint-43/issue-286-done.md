# Issue #286 — Split create/consume du port PasswordResetTokenRepository

commits: [a541617]

resume:
- Objectif: éliminer le `findById` (SELECT) superflu sur le chemin create (forgot-password).
- Split port `save()` → `create()` (pur INSERT, aucun findById) + `markConsumed()` (findById → saveAndFlush).
- Verrou anti-TOCTOU #143 PRÉSERVÉ: `markConsumed` = code identique à l'ancien `updateManaged`
  (charge l'entité MANAGÉE via findById → saveAndFlush → UPDATE `WHERE version=<CHECK>`).
- Fichiers: port `domain/ports/repositories/PasswordResetTokenRepository.java`,
  impl `infrastructure/.../jpa/PasswordResetTokenRepositoryJpaImpl.java`,
  service `application/services/PasswordResetServiceImpl.java` (requestReset→create, resetPassword→markConsumed),
  + 5 classes de test.
- BR touchées: aucune (optim technique, sécurité #143 inchangée).

tests:
- 14 tests verts (5 classes ciblées) via `-Dtest=` (pas de suite complète, working tree partagé).
- NEW `PasswordResetTokenCreateStatisticsIntegrationTest`: stats Hibernate → create ⇒
  `getEntityLoadCount()==0` (findById supprimé) + `getEntityInsertCount()==1`.
- Concurrence #143 (`PasswordResetTokenConcurrencyIntegrationTest`) verte, comportement inchangé.

[MEMORY:pattern] Prouver l'absence d'un SELECT superflu sur un chemin JPA : @SpringBootTest +
`entityManagerFactory.unwrap(SessionFactory.class).getStatistics()` → clear() après seed puis
assert `getEntityLoadCount()==0`. Un simple verify Mockito de routage ne prouve pas le comportement JPA réel.

recommandations suite: aucun (RECOMMAND_* néant)

STATUS: COMPLETED
