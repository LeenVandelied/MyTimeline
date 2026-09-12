# Issue #186 — NPE createProduct si events null

commits: [fb1209120059c6de10d34b00fa3524c1aa451986]

## Resume
- Objectif: null-guard sur request.getEvents() dans ProductServiceImpl.createProduct (NPE/500 si liste nulle).
- BR: BR-PRO-005 (produit sans événement autorisé).
- Fichiers cles:
  - backend/.../application/services/ProductServiceImpl.java L67 : `Optional.ofNullable(request.getEvents()).orElseGet(List::of).forEach(...)` (Optional/List déjà importés).
  - backend/.../application/services/ProductServiceImplTest.java : test régression `createProduct_nullEvents_doesNotThrow_savesProductWithNoEvents` (events=null -> pas de NPE, save capturé, hasEvents()==false).
- Pitfalls: aucun nouveau. Convention create id=null intacte (aucune ligne touchée).
- Tests: `./scripts/test-quiet.sh backend` -> 270 run, 0 fail, BUILD SUCCESS.

## Signaux MEMORY
Aucun (fix trivial localisé, pattern null-guard déjà connu).

## Recommandations suite
- Autre point de garde events null : VÉRIFIÉ. Seul createProduct itère getEvents(). updateProduct (ProductUpdateRequest) ne manipule pas d'events — pas de champ events dans le PATCH. Aucun autre service n'itère getEvents(). Pas de RECOMMAND_FOLLOWUP.
- Pas de RECOMMAND_TEST_RUNNER (270 tests < 500, run rapide).
- Note (hors scope, non bloquant) : le DTO ProductCreationRequest.events reste sans @NotNull ; garde côté service suffit pour BR-PRO-005. Aucune action requise.

STATUS: COMPLETED
