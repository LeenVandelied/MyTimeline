# Revue batch — Sprint 93

> Reviewer spawné par le lead sur `origin/dev..HEAD` (4 commits de code : `6c7f4480`, `54bd2ef7`, `41aa3c76`, `6075ffde`). Briefé sur le piège RTK (diff tronqué) avec contrôle de validité imposé.

**VERDICT : prêt pour PR — 0 CRITIQUE / 0 MAJEUR / 0 MINEUR.**

Réserve du lead : une revue sans aucun constat n'est pas en soi une preuve de qualité. Les points d'appui réels de ce sprint sont l'audit sécurité dédié (`specialists-security.md`), l'armement des tests déclaré par les deux agents, et la suite E2E jouée par le lead.

## Points confirmés
- **Hexagonal** : `CategoryProductCounts` est un record de domaine ; le port `ProductRepository` n'expose aucun type JPA ; le mapping reste dans l'adaptateur.
- **Sécurité #711** : 403 si le `{userId}` du path diffère de l'appelant ; ownership et état dans la clause `WHERE` native ; 404 uniforme pour inconnu / non archivé / produit d'autrui ; les 3 cas et la non-altération en échec sont testés.
- **PIT-S79-006** : les 3 requêtes natives filtrent `archived` explicitement ; contournement documenté.
- **Divergence de comptage assumée** : `countByCategoryId` (tous utilisateurs, garde du 409) vs `countByCategoryForUser` (scopé appelant) — jugée non exploitable (catégories système non supprimables, catégories utilisateur mono-propriétaire).
- **Contrat DTO/Zod #695** : `@JsonInclude(NON_NULL)` au niveau champ + `.optional()` côté Zod, absence vérifiée par un test dédié ; `archivedProductSchema` correspond au DTO.
- **TanStack Query** : invalidations `products.all` + `categories.all` sur archivage et restauration, retrait en place (PIT-S92-004), aucun cache écrit avec un objet privé de compteurs.
- **i18n** : parité stricte des 4 locales, formes plurielles ICU correctes, description du dialog d'archivage réécrite partout.
- **`DeleteConfirmDialog`** : repli 409 → réassignation préservé et re-testé (cas de la carte périmée) ; pas de régression sur les variantes `event` / `category`.
- **E2E** : le chemin d'erreur 409 garde un test dédié ; la mise à jour en place est couverte ; la spec de restauration couvre annulation, confirmation et persistance après rechargement.
