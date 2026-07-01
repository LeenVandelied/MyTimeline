## Dependances intra-sprint
- AUCUNE dépendance amont : tu es en Vague 1, tu livres le composant `DeleteConfirmDialog` que l'issue #61 (Drawer Produit, Vague 2) consommera ensuite.
- Ton composant DOIT être livré AVANT #61. Expose une API de props propre et stable (cf. Piste technique).
- Dépendance runtime : `GET /api/categories` (livré par S10 #52) pour le select de réassignation. Si le hook `useCategories` n'existe pas encore dans le repo, crée-le (TanStack Query, pattern PAT-S7-001 axios mock pour les tests).

## Designer
Non applicable — composant partagé suivant la charte existante (tokens Graphite danger + états désactivés). Réutilise les primitives Dialog/Sheet déjà présentes dans le repo si elles existent (vérifie `frontend/src/components/ui/`).

## Contraintes
- Branche cible : sprint/11 (déjà checkout — NE PAS changer de branche)
- Garde-fou : tu dois committer sur sprint/11. Vérifie `git branch --show-current` == sprint/11 avant de committer.
- Commit : 1 commit logique, gitmoji français (ex: `:sparkles: #65 DeleteConfirmDialog 3 variantes (event/product/category)`)
- Tests inline via `./scripts/test-quiet.sh <scope>` (OBLIGATOIRE) — unit sur les 3 variantes, bouton désactivé sans réassignation, état deleting, erreur inline 404/409
- Si volume tests > 500 OU temps > 3min : signaler RECOMMAND_TEST_RUNNER
- Ne PAS toucher aux fichiers du domaine produit (`frontend/src/components/products/**`) — c'est le périmètre de #61 en Vague 2. Ton scope = `frontend/src/components/shared/` + hook `useCategories` si absent.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchees + fichiers cles + pitfalls + tests>
- [MEMORY:*] signaux: <liste si applicables>
- recommandations suite: <RECOMMAND_* ou pitfall subtil ; sinon "Pas de RECOMMAND_X car ...">
- STATUS: COMPLETED en derniere ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
