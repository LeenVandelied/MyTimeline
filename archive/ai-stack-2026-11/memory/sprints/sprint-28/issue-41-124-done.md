# DONE — Issues #124 + #41 (backend produits)

commits:
- e2e7744 :zap: #124 filtre produits par user_id en SQL indexé
- 7f56fb7 :bug: #41 produits sans événement visibles dans le listing

resume:
- Objectif: listing produits filtré par user EN SQL (index) + produits sans event visibles.
- BR touchées: BR-PRO-006 (filtre user, ex full-scan Java -> SQL indexé), levée du sous-filtre hasEvents.
- Fichiers clés:
  - domain/ports/repositories/ProductRepository.java — ajout `findByUserId(UUID)`.
  - infra/.../jpa/ProductRepositoryJpaImpl.java — JPQL `SELECT DISTINCT p FROM ProductEntity p LEFT JOIN FETCH p.events WHERE p.user.id = :userId`.
  - application/services/ProductServiceImpl.java — `getProductsWithEvents` délègue à findByUserId, DROP `.filter(hasEvents)`.
- Filtre SQL remplace filtre Java: `p.user.id` compile sur colonne FK `user_id` (pas de jointure users). @SQLRestriction ajoute `archived=false`. `findAllProducts()` conservé (utilisé par un test archived) mais plus par le listing user.
- Décision scope #41: l'endpoint réel `GET /users/{userId}/products` -> `getProductsWithEvents` EST le listing principal consommé par le front. #41 s'y applique. Nom `getProductsWithEvents` gardé (renommage éviterait un abus mais riplerait port/controller/tests) -> recommandé en follow-up. events=[] déjà garanti par ProductMapper.toDomain (liste toujours construite) + ProductResponse.fromDomain (null->emptyList); seule action réelle = retrait du filtre.

tests:
- Lancés: `backend/./mvnw -Dtest=ProductServiceImplTest,ProductArchivedFilterIntegrationTest -Ddocker.api.version=1.44 test` -> 26/26 OK (BUILD SUCCESS). Docker/Testcontainers.
- Unit (ProductServiceImplTest +2): délégation findByUserId (plus findAllProducts); produit sans event retourné events=[] + non-régression produit avec events.
- Intégration Postgres (ProductArchivedFilterIntegrationTest +4): filtre user (exclut autre user), produit sans event visible events==[] (pas null), produit avec events pré-chargés (size 2), archivés exclus.
- SQL vérifié RÉELLEMENT (re-run avec SPRING_JPA_SHOW_SQL=true): `... from products pe1_0 left join events e1_0 on ... where (pe1_0.archived = false) and pe1_0.user_id=?`. WHERE user_id=? confirmé, pas de jointure users. PAS d'EXPLAIN ANALYZE exécuté (pas de dataset volumineux ni accès DB manuel) — éligibilité index idx_products_user déduite du prédicat sur user_id, non prouvée par plan.

[MEMORY:*] signaux:
- [MEMORY:pattern] Problem: filtrer une @ManyToOne par id sans charger l'entité liée. Solution: JPQL `WHERE p.user.id = :id` -> Hibernate cible la colonne FK user_id (aucune jointure), index-friendly. Anti-pattern: full findAll + filtre stream Java.

recommandations suite:
- Pas de RECOMMAND_DB_EXPERT: aucune requête native introduite; JPQL standard, index idx_products_user préexistant (Sprint 5), aucune migration.
- Follow-up (non bloquant): renommer `getProductsWithEvents` -> `getProductsByUser` (port+controller+tests) pour lever l'abus de nom.

STATUS: COMPLETED
