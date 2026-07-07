## Dépendances intra-sprint
- Aucune dépendance sur l'agent devops (#207+#133) qui tourne en parallèle. Fichiers 100% disjoints : toi = `backend/**`, lui = `scripts/` + CI + `frontend/package.json`. Ne touche PAS à `scripts/`, `.github/`, ni au frontend.
- Migrations : AUCUNE (l'index `idx_products_user` existe déjà depuis le Sprint 5). Ne crée pas de migration.

## Designer
Non applicable (backend pur).

## Contraintes
- Repo : `/Users/herrh/VSProjects/MyTimeline` — Branche cible : `sprint/28` (déjà checkout). Vérifie `git branch --show-current` avant tout commit.
- Architecture hexagonale : le port `ProductRepository` (domain) ne doit importer aucun Spring/JPA. L'implémentation JPA vit dans `infrastructure/`. Respecte le mapping domain↔entity existant.
- Commit : 1 à 2 commits logiques gitmoji français (ex: `:zap: #124 filtre produits user_id en SQL indexé` / `:bug: #41 produits sans event visibles`).
- **Tests inline OBLIGATOIRES** via `./scripts/test-quiet.sh unit` (ou scope backend) :
  - test service/repository couvrant le filtrage par `userId` (le bon utilisateur ne voit que ses produits).
  - test « produit sans événement VISIBLE » avec `events == []` (pas `null`).
  - non-régression : produit avec événements affiche ses events.
- Vérifie que la requête générée filtre bien en SQL (`spring.jpa.show-sql` ou log) : `WHERE user_id = ?`. Si tu ne peux pas faire un vrai EXPLAIN ANALYZE, documente-le honnêtement dans le done.md (ne prétends pas l'avoir fait).
- Ne PAS toucher : `scripts/`, `.github/`, `frontend/**`, aucune autre couche métier que products.

## Livrable attendu (format strict, MAX 500 tokens caveman)
Écris `docs/memory/sprints/sprint-28/issue-41-124-done.md` avec :
- commits: [SHA1, ...]
- resume: <objectif + BR touchées (BR-PROD-001 / BR-PRO-006) + fichiers clés + décision sur le scope endpoint #41 + comment filtre SQL remplace filtre Java>
- tests: <tests créés/lancés + résultat réel ; précise si EXPLAIN ANALYZE fait ou non>
- [MEMORY:*] signaux: <si applicable>
- recommandations suite: <RECOMMAND_* explicites, ou "Pas de RECOMMAND_X car ..." ; ex RECOMMAND_DB_EXPERT si tu introduis une requête native/index non trivial>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR si bloqué).
