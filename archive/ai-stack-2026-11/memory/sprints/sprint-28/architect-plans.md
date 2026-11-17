# Mini-plans architect — Sprint 28

> Généré par /sprint plan 5 (architect). Lu par /sprint start 28 Phase 4.1.
> Thème : Couverture E2E Produits/Catégories + fiabilité CI tests. Cohésion 0.68. Migrations : aucune.
> #207 débloque un vrai run Playwright pour #218 (ordre intra-sprint strict).

```yaml
issue_0207_0133:
  fichiers_cles: ["scripts/test-quiet.sh", ".github/workflows/ (CI frontend)", "frontend/package.json"]
  couches_touchees: ["devops"]
  strategie_test: "meta (run_frontend scope=frontend -> vitest ; scope=e2e -> playwright ; CI verte)"
  risque_regression: "séparer les 2 scopes sans casser le skip explicite existant (test-quiet.sh:96-97) quand aucun runner ; CI ne doit pas bloquer si e2e a besoin d'un backend up"
  ordre_ecriture: "devops (test-quiet.sh: scope frontend=npm test, scope e2e=npm run test:e2e -> CI)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    run_frontend (test-quiet.sh:87-100) lance 'npm test'=vitest pour scopes 'e2e|frontend' (l.116).
    package.json a bien test:e2e=playwright (l.13) mais JAMAIS appelé. Bug alias confirmé.
    #207 et #133 touchent le MÊME script -> fusionner le fix (séquentiel).

issue_0218:
  fichiers_cles: ["frontend/e2e/products.spec.ts (a creer)", "frontend/e2e/categories.spec.ts (a creer)", "frontend/e2e/support/"]
  couches_touchees: ["frontend"]
  strategie_test: "E2E (Playwright: CRUD produit, CRUD catégorie, assignation produit->catégorie, produit sans event visible)"
  risque_regression: "dépend de l'auth.setup.ts + seeding catégorie déjà établi (golden-path.spec.ts:99). Réutiliser le pattern seed via page.request.post."
  ordre_ecriture: "frontend (specs Playwright APRÈS #207 corrigé)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    MISSING. frontend/e2e/ n'a que golden-path + settings-*. golden-path couvre création produit+event
    mais PAS le CRUD produit/catégorie complet. Aucun products.spec.ts / categories.spec.ts.
    Vague 2 : dépend du scope e2e corrigé (#207).

issue_0041_0124:
  fichiers_cles: ["backend/.../application/services/ProductServiceImpl.java", "backend/.../domain/port/ProductRepository.java", "backend/.../infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java"]
  couches_touchees: ["domain (port)","application","infrastructure"]
  strategie_test: "integration (produit sans event VISIBLE ; filtre user_id en SQL utilise l'index)"
  risque_regression: "getProductsWithEvents actuel filtre hasEvents EN PLUS de user -> le nom de l'issue #41 dit 'produits sans events invisibles' : clarifier si getProductsWithEvents DOIT rester events-only (alors #41 vise un AUTRE endpoint de listing) — a determiner par fullstack-dev"
  ordre_ecriture: "domain (port findByUserId LEFT JOIN) -> application (remplacer stream filter) -> infrastructure (JPQL/native indexée)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    ProductServiceImpl:99-104 = findAllProducts().stream().filter(userId).filter(hasEvents).
    #124: filtre user_id en MÉMOIRE (pas SQL, pas d'index). #41: le double filter hasEvents cache les
    produits sans events. Même code -> combinables. ATTENTION: le scope exact de #41 (quel endpoint) est à préciser.
```

> **Vagues** : V1 = #207+#133 (même script, fusionnés séquentiel) ∥ #41+#124 (backend). V2 = #218 (après scope e2e corrigé).
