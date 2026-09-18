# Issue #58 — PR #263 correctifs review

commits: 57670a60f9b307bfb71ef6e35e2d39b6c94cd1df

## resume
- [C1] ExportServiceImpl.download - retrait @Transactional(readOnly=true) ; SELECT unique (findByIdAndOwnerId) ferme sa propre connexion, I/O disque storagePort.load hors pool. getJob/submitAsync intacts. Retours/404 inchangés.
- [C2] CsvExportRenderer.render - 4 helpers privés extraits (appendProfileSection/appendCategoriesSection/appendProductsSection/appendEventsSection), render orchestre. row/escape/neutralizeFormula NON touchés.
- Sortie CSV BYTE-IDENTIQUE confirmee : ExportRenderersTest inchange, reste vert.
- Tests : 355/355 verts (./scripts/test-quiet.sh unit, BUILD SUCCESS).
- git add cible 2 fichiers, push origin sprint/32 OK (remote HEAD == 57670a6).

STATUS: COMPLETED
