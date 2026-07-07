[BRIEFING ISSUE #124 + #41 — FUSIONNÉES (même code ProductService, backend produits)]

## Contexte worktree (garde-fou HEAD — LIRE EN PREMIER)
- Le repo de travail est `/Users/herrh/VSProjects/MyTimeline` (PAS le cwd par défaut si tu es lancé ailleurs).
- **PREMIÈRE ACTION** : `cd /Users/herrh/VSProjects/MyTimeline` puis `git branch --show-current` → DOIT afficher `sprint/28`. Sinon STOP et signale-le.
- Architecture hexagonale STRICTE : `domain/` (aucun import Spring/JPA) → `application/` → `infrastructure/`.

## Issue #124 — [FEATURE] Réécrire la requête produits avec filtre user_id en SQL (exploiter l'index)
La récupération des produits charge TOUS les produits puis filtre côté Java. L'index `idx_products_user` (posé au Sprint 5, #110) ne sert à rien tant que le filtre n'est pas en SQL.

À faire :
- Remplacer `findAllProducts()` + filtre Java par une requête filtrant `WHERE user_id = :userId` en SQL (JPQL `findByUserId` ou `@Query`).
- Vérifier que l'index `idx_products_user` est utilisé (EXPLAIN ANALYZE si possible).

Critères d'acceptation :
- Aucun `findAllProducts()` suivi d'un filtre Java par `userId` ne subsiste.
- La requête SQL générée contient `WHERE user_id = ?`.
- Les tests couche service/repository couvrent le filtrage par utilisateur.

## Issue #41 — [CHORE] Fix getProductsWithEvents (produits sans events invisibles)
Bug fonctionnel : les produits SANS événement associé sont invisibles. `ProductServiceImpl.getProductsWithEvents()` applique `filter(Product::hasEvents)` qui exclut les produits sans event. Contraire à la règle métier : un produit existe indépendamment des événements.

À faire :
- Retirer/ajuster le filtre `Product::hasEvents` qui exclut les produits sans événements.
- Garantir que la liste d'événements d'un produit sans event est `[]` (pas `null`) dans le DTO.

Critères d'acceptation :
- Un produit créé sans événement apparaît dans la liste des produits de l'utilisateur.
- `events` = `[]` (pas `null`) pour un produit sans event.
- Les produits AVEC événements continuent d'afficher leurs événements.
- Aucune régression sur les endpoints produits.

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_0041_0124:
  fichiers_cles:
    - "backend/.../application/service/ProductServiceImpl.java"
    - "backend/.../domain/port/ProductRepository.java"
    - "backend/.../infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java"
  couches_touchees: ["domain (port)","application","infrastructure"]
  strategie_test: "integration (produit sans event VISIBLE ; filtre user_id en SQL utilise l'index)"
  risque_regression: |
    getProductsWithEvents actuel filtre hasEvents EN PLUS de user. Le nom de #41 dit
    'produits sans events invisibles' -> CLARIFIER : getProductsWithEvents doit-il rester
    events-only (auquel cas #41 vise un AUTRE endpoint de listing) ? À TRANCHER par toi.
  ordre_ecriture: "domain (port findByUserId LEFT JOIN) -> application (remplacer stream filter) -> infrastructure (JPQL/native indexée)"
  etat_reel_du_code: |
    ProductServiceImpl:99-104 = findAllProducts().stream().filter(userId).filter(hasEvents).
    #124: filtre user_id EN MÉMOIRE (pas SQL, pas d'index). #41: le double filter hasEvents
    cache les produits sans events. MÊME code -> combinables. Scope exact de #41 à préciser.
```

**Décision à trancher toi-même** (le note dans le done.md) : le double `.filter(userId).filter(hasEvents)` sur `findAllProducts()` est le point commun. Le fix #124 (filtrer user_id en SQL via `findByUserId`) + le fix #41 (ne plus exclure les produits sans event) se combinent naturellement sur la MÊME méthode. Vérifie le vrai nom/scope de la méthode de listing dans le code (le nom `getProductsWithEvents` peut couvrir la liste principale des produits) et confirme que l'endpoint réellement consommé par le frontend liste TOUS les produits de l'utilisateur.

## Triage
Taille: S (fusion #124 S + #41 XS)
Modèle: opus
Effort: high
