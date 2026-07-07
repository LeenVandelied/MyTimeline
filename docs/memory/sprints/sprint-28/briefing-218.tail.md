## Dépendances intra-sprint
- Vague 1 (#207, #133, #41, #124) déjà livrée sur `sprint/28`. Le scope `e2e` de test-quiet.sh fonctionne (Playwright réel). Un produit sans event est visible → tu peux l'asserter.
- Aucun autre agent ne tourne en parallèle sur `frontend/e2e/`. Tu es seul sur ce périmètre.

## Designer
Non applicable (tests E2E, aucun composant UI nouveau — tu réutilises les `data-testid` existants).

## Contraintes
- Repo : `/Users/herrh/VSProjects/MyTimeline` — Branche cible : `sprint/28` (déjà checkout). Vérifie `git branch --show-current` avant tout commit.
- **Réutilise les `data-testid` EXISTANTS** (préfixes `products-*`, `product-detail-*`, `categories-*`, `category-*`). N'en ajoute pas de nouveaux dans le code source. Si un testid manque pour un scénario, note-le en RECOMMAND_FOLLOWUP plutôt que d'instrumenter à la va-vite (mais vérifie d'abord par grep qu'il n'existe pas déjà).
- **Flux de réassignation (BR sensible)** : la suppression d'une catégorie AVEC produits liés déclenche un flux de réassignation. NE SUPPOSE PAS le comportement de l'API : lis le vrai code (`CategoryDrawer`, service/hook catégories, endpoint backend) et assert le comportement RÉEL. Documente ce que fait l'API si ce n'est pas trivial.
- **Seeding** : réutilise le pattern `page.request.post` de `golden-path.spec.ts` pour créer l'état (user/produits/catégories) plutôt que de tout piloter à la souris. Auth via `auth.setup.ts`.
- **Exécution** : lance `./scripts/test-quiet.sh e2e` pour valider tes specs. Playwright a besoin du backend + du serveur dev frontend up. Si cet environnement full-stack n'est PAS disponible dans ton contexte, NE fabrique PAS un faux vert : vérifie au minimum que les specs sont syntaxiquement valides (`npx playwright test --list` pour lister les tests sans les exécuter) et documente honnêtement dans le done.md quels scénarios ont été réellement exécutés vs seulement écrits/listés.
- Ne PAS toucher : `backend/**`, `scripts/`, `.github/`, ni la logique applicative `frontend/src/**` (hors ajout éventuel — à éviter — d'un testid manquant clairement justifié).

## Livrable attendu (format strict, MAX 500 tokens caveman)
Écris `docs/memory/sprints/sprint-28/issue-218-done.md` avec :
- commits: [SHA1, ...]
- resume: <specs créées (products.spec.ts / categories.spec.ts) + scénarios couverts (mapper aux 7 critères) + data-testid réutilisés + comportement réel de l'API de réassignation>
- tests: <ce que tu as réellement lancé (`test-quiet.sh e2e` full run ? `playwright test --list` ?) + résultat honnête : combien de scénarios exécutés vs seulement écrits>
- [MEMORY:*] signaux: <si applicable>
- recommandations suite: <RECOMMAND_* explicites ou "Pas de RECOMMAND_X car ..." ; ex RECOMMAND_FOLLOWUP si un testid manque>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR si bloqué).
