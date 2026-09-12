# Issue #458 — [BUG] Titre produit sans break-words déborde sur mot long

**Sprint :** 73 | **Taille :** XS | **Modèle :** sonnet | **Epic :** epic:products

## Commits
- `3d98ce9`

## Résumé
`frontend/src/components/products/ProductDetailView.tsx:308` —
`className="text-ink text-xl font-semibold tracking-tight"`
→ `className="text-ink min-w-0 text-xl font-semibold tracking-tight break-words"`

Le `<h1>` est enfant direct de `<div className="flex items-center gap-3">`. `break-words`
seul était **insuffisant** : `min-width:auto` sur un enfant flex conserve la taille
min-content du mot le plus long, et `overflow-wrap:break-word` (contrairement à `anywhere`)
ne réduit pas min-content. D'où `min-w-0` — déjà la convention du projet (13 occurrences :
AppShell, ProductsListView, SessionList…).

Correction confinée au `h1`. Aucun parent modifié, aucun autre fichier touché.
`ProductDetailView.test.tsx` étendu (1 test ajouté).

## Tests
- Ciblé : 16/16 PASS
- Suite complète `./scripts/test-quiet.sh frontend` : 106 fichiers / 1169 tests, 0 échec
- Prettier : clean

## Non vérifié (déclaré par le subagent)
- **Rendu navigateur réel : AUCUN.** Pas de screenshot, pas de mesure
  `rect.right > clientWidth`. Le critère d'acceptation « ne déborde plus » n'est PAS prouvé —
  seulement rendu plausible par la règle CSS.
- Le test ajouté n'assert QUE la présence des classes. jsdom ne calcule aucun layout : il
  prouve la non-régression de l'attribut, pas l'absence de débordement.
- Non-régression visuelle sur titre de longueur normale : non observée.
- Aucun E2E ajouté ni exécuté.
- Badge `product.category.name` (ligne ~320) non traité — hors périmètre de l'issue.

## Écart au briefing (déclaré)
`coverage-products.md`, `rules-jit/frontend.md`, `rules-jit/ux-patterns.md` NON lus
(cp-frontend inline jugé suffisant pour un changement de 2 classes Tailwind).

> **Correction du lead (post-review) :** `.claude/rules-jit/frontend.md` n'existe PAS dans
> ce dépôt — seul `ux-patterns.md` est présent sous `.claude/rules-jit/`. Le briefing
> pointait un chemin fantôme (repris tel quel de la liste générique du skill, sans
> vérification). Cette partie de l'« écart » est imputable au briefing, pas au subagent.

## Signaux mémoire
`[MEMORY:pitfall]` — PIT-S63-013 signalait « le h1 titre produit n'a pas de break-words ».
Ajouter `break-words` seul NE corrige PAS le débordement quand l'élément est enfant direct
d'un conteneur flex : `min-width:auto` garde la taille min-content du mot le plus long, et
`overflow-wrap:break-word` (contrairement à `anywhere`) ne réduit pas min-content.
**Solution :** `min-w-0` + `break-words`, ou `overflow-wrap:anywhere`.
**Prévention :** tout correctif de débordement textuel doit remonter la chaîne flex avant
de conclure.

## Recommandations suite
`RECOMMAND_FOLLOWUP` — E2E Playwright mesurant le débordement réel (nom produit 40+ car.
sans espace, viewport mobile + desktop, assertion `h1.scrollWidth <= card.clientWidth`).
C'est le seul niveau qui valide réellement le critère d'acceptation.
Fichier cible `frontend/e2e/products.spec.ts` — hors périmètre fichiers autorisés de l'issue.
Triage estimé : XS | Domaine : products.

STATUS: COMPLETED
