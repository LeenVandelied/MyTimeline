## Dependances intra-sprint — LIRE ATTENTIVEMENT (Vague 1 #65 déjà mergée sur sprint/11)

L'issue #65 (Vague 1) est DÉJÀ livrée sur ta branche. Elle a créé des fichiers que tu dois **RÉUTILISER, PAS RECRÉER** :

- ✅ `frontend/src/hooks/useCategories.ts` — hook TanStack Query `GET /api/categories`. **RÉUTILISE-LE** pour ta combobox catégorie. Ne crée PAS un second hook.
- ✅ `frontend/src/services/categoryService.ts` — `getCategories` + parse Zod. Réutilise.
- ✅ `frontend/src/types/category.ts` — `categorySchema` (+ booléen `system`). Réutilise pour typer les catégories.
- ✅ `frontend/src/components/shared/DeleteConfirmDialog.tsx` — composant partagé, props `variant: 'event'|'product'|'category'`, `onConfirm`, `onCancel`, `isRecurring?`, `linkedProductsCount?`. Si le drawer expose une action "Supprimer ce produit", branche la **variante `product`** de ce composant. NE crée PAS ton propre dialog de suppression.
- ✅ `frontend/src/components/shared/DeleteConfirmDialog.test.tsx`, `frontend/vitest.setup.ts` (stubs Radix Pointer Capture) — déjà en place.

**Pitfall hérité de #65 (IMPORTANT)** : `DeleteConfirmDialog.onConfirm` attend une promesse qui **REJETTE** en cas d'erreur (l'erreur axios avec `error.response.status`) pour afficher le 404/409 inline. Quand tu branches la variante produit, ne « avale » pas l'erreur : propage-la (throw/reject) depuis le handler que tu passes à `onConfirm`.

- Câblage catégories : lis d'abord `useCategories.ts` pour connaître sa signature exacte (queryKey, forme du retour) avant de l'utiliser dans la combobox.

## Designer
Non applicable en pré-implem, mais respecte la charte Graphite (drawer latéral 452px desktop, bottom sheet plein écran mobile, tokens couleur). Réutilise les primitives `frontend/src/components/ui/` (dialog/sheet, select, form, input, spinner). Cohérence visuelle avec `DeleteConfirmDialog` (#65).

## Contraintes
- Branche cible : sprint/11 (déjà checkout — NE PAS changer de branche).
- Garde-fou : vérifie `git branch --show-current` == sprint/11 avant de committer.
- Commit : 1 commit logique, gitmoji français (ex: `:sparkles: #61 ProductDrawer création/édition + fin UUID hardcodés`).
- Zod ↔ DTO : aligner `productCreateSchema.name` sur `min(1).max(100)` (contrat backend #50). Vérifier la forme couleur attendue par le DTO backend avant d'envoyer.
- i18n : tous les libellés via next-intl (namespace `products`), aucun FR hardcodé. Ajouter les clés dans `public/locales/{fr,en,es,de}/products.json`.
- Migration appelants : après suppression d'`AddProducts.tsx`, mets à jour TOUS ses importeurs pour pointer vers `ProductDrawer`. `next build` / `tsc --noEmit` DOIT passer (un import cassé = build rouge invisible aux tests RTL).
- Tests inline via `./scripts/test-quiet.sh <scope>` (OBLIGATOIRE) — Zod (nom vide rejeté, min(1)), hooks create/update (mock axios), composant ProductDrawer (création + édition + combobox peuplée depuis fetch mocké, aucun UUID en dur), état submitting/error, fallback combobox vide.
- Si volume tests > 500 OU temps > 3min : signaler RECOMMAND_TEST_RUNNER.
- Ne PAS toucher aux fichiers livrés par #65 listés ci-dessus autrement que pour les CONSOMMER (imports). Si tu dois modifier l'API de `DeleteConfirmDialog`, signale-le en RECOMMAND_FOLLOWUP plutôt que de casser son contrat/ses tests.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + BR touchees + fichiers cles + pitfalls + tests>
- [MEMORY:*] signaux: <liste si applicables>
- recommandations suite: <RECOMMAND_* ou pitfall subtil ; sinon "Pas de RECOMMAND_X car ...">
- STATUS: COMPLETED en derniere ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
