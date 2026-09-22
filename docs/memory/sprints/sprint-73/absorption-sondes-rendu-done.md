# Absorption tardive 2/2 — Sondes navigateur (issues #458 et #416)

**Sprint :** 73 | **Origine :** triage Phase 4 de `/sprint end 73`, arbitrage dev = « absorber »
**Objet :** prouver AU NAVIGATEUR les deux critères d'acceptation que le sprint n'avait
argumentés que sur modèle.

## Commits
- `d749712` — 2 fichiers, 445 insertions, aucun fichier interdit touché

## Résumé
- `frontend/e2e/sprint-73-model-vs-rendered.spec.ts` (**neuf**, 10 tests)
- `frontend/e2e/support/pixel.ts` — extension `measurePaintedGlyph`, **aucune signature modifiée**
- **Aucun `src/` touché, aucun `data-testid` ajouté** : `product-detail-card` + `h1` et
  `category-swatch-#XXXXXX` + `svg` suffisaient.

Helpers **réutilisés** : `readStable`, `readTextRendering`, `waitForFonts`,
`TRUNCATION_TOLERANCE_PX`, `WCAG_AA_NON_TEXT`, `settleForMeasurement`, `relativeLuminance`,
`contrastRatio`, `captureRegion`, `PROD`/`storageState`, `seedCategory`/`seedProduct`,
`openCategoriesTab`.
Helpers **écrits**, avec justification : `measurePaintedGlyph` (tout `pixel.ts` échantillonne
vers l'EXTÉRIEUR d'un côté ; le glyphe est à l'intérieur d'un disque de 28 px) et
`readTitleGeometry` (local à la spec ; `contrast.ts` ne compare aucune boîte à une autre boîte).

## Sonde (a) — débordement du titre produit (#458) — EXÉCUTÉE, 3/3 passed
| Cas | scrollWidth / clientWidth | Lignes |
|---|---|---|
| mobile 375×812, mot de 64 car. | **281 / 281** | 4 |
| desktop 1280×800 | **906 / 906** | 2 |
| non-régression titre court | **136 / 136**, droite 196,8 ≤ 342,0 | 1 |
`h1 [61,0 ; 342,0]` contenu dans la carte `[33,0 ; 342,0]` ; document `375/375` (aucun
débordement horizontal de page). Police mesurée : **35px / 600**.

## Sonde (b) — contraste peint du glyphe (#416) — EXÉCUTÉE, 2/2 passed, **24/24 cellules**
12 couleurs × 2 thèmes. **Minimum 4,54:1 AU RENDU** (sur `#E5484D`).
Pires appariements annoncés au design : `#3E63DD` → **5,21:1** (encre `#ffffff`),
`#F2A900` → **8,84:1** (encre `#16181d`).
Témoin de peinture : remplissage peint == hex demandé sur **24/24**, polarité peinte ==
polarité calculée sur **24/24**. Témoin de thème `.dark` sur `<html>` : vert.

## Écart modèle vs rendu : AUCUN sur le ratio normatif
Le 4,54:1 calculé par `color.test.ts` est **reproduit à l'identique au rendu**, y compris en
sombre. Les 24 cellules sont numériquement identiques entre les deux thèmes — résultat
attendu (les tokens `--gray-0` / `--gray-900` ne sont pas redéfinis sous `.dark`), désormais
**prouvé** plutôt que supposé.

Deux écarts **informatifs**, aucun défaut :
1. Le ratio PEINT est systématiquement ~0,05–0,20 sous le ratio des couleurs (anticrénelage
   d'un trait de ~1,3 px CSS). WCAG 2.x se calcule sur les couleurs → l'assertion ne porte
   volontairement PAS sur le ratio peint.
2. `text-xl` rend à **35px** dans le DS Graphite, pas 20px. Le premier jet de la fixture
   « titre court » suffixait le nom d'un `Date.now()` (13 chiffres) : 20 caractères à 35px
   césuraient à 375 px et **le test a rougi sur sa propre fixture**. Corrigé en raccourcissant
   le suffixe, motif documenté dans le code. **L'assertion `≥ 3:1` et les 3 oracles de
   débordement n'ont PAS été touchés** — la fixture a été corrigée, pas l'attente.

## Non couvert (déclaré)
État `disabled + selected` du glyphe (`opacity-50`) ; couleur libre du `PopoverPicker` (hors
`swatchGlyphInk`) ; Firefox / WebKit (chromium seul) ; locales autres que `fr` ; badge
`product-detail-category` (`contrastInk`) ; viewport tablette pour #458 ; couverture
d'anticrénelage non normée ; le mode d'échec « la coche est peinte mais trop fine pour être
vue » n'est pas quantifié.

## Écart au briefing (déclaré)
`.ai-env/context-packs/pit-frontend.md` et `.claude/rules-jit/ux-patterns.md` NON lus — écart
assumé : les pièges nommés (PIT-S63-001, PIT-S53-001, PIT-S61-007, rate-limit register)
étaient déjà cités inline dans le briefing et ont été appliqués.

## Signaux mémoire
`[MEMORY:pitfall]` — Fixture « titre court » pour un test de débordement : le DS Graphite rend
`text-xl` à **35px**, pas 20px (échelle Tailwind par défaut non applicable, famille
PIT-S53-001). Un nom de 20 caractères suffixé d'un `Date.now()` césure à 375 px : le test
rougit sur sa fixture, pas sur le composant. Solution : mesurer `fontSizePx` via
`readTextRendering` et le journaliser dans le message d'échec. **Prévention : dans ce dépôt,
« court / long » se juge en pixels mesurés, jamais en nombre de caractères.**

`[MEMORY:pattern]` — Prouver qu'un glyphe SVG atteint un seuil de contraste : **deux mesures
séparées** — ratio WCAG sur le style CALCULÉ (`readStable(..., 'color')`, normatif, porte
l'assertion) + témoin de PEINTURE par échantillonnage de pixels (atteste l'existence et la
polarité, ne porte pas l'assertion). Anti-pattern : asserter sur le ratio peint d'un trait
fin — l'anticrénelage le tire mécaniquement vers le bas et produit un rouge injustifié.

`[MEMORY:pitfall]` — Deux subagents en fan-out sur le même worktree : `e2e/.auth/run.lock`
sérialise les runs Playwright et fait échouer le second en `globalSetup`. Solution : attendre
la libération du verrou puis relancer, et prendre un port `next dev` dédié. Ici le `:3000`
occupé était un `next start` **standalone sans le rewrite `/api`** — oracle
`curl /api/auth/me` = **404**, pas 401. **Prévention : vérifier l'oracle du proxy AVANT
d'accuser l'auth ou le rate-limit.**

## Recommandations suite
- `RECOMMAND_FOLLOWUP` — étendre la sonde (b) à l'état `disabled + selected` et au
  `PopoverPicker`. Triage XS | Domaine categories.
- `RECOMMAND_FOLLOWUP` — mesurer `product-detail-category` (`contrastInk`) au rendu, même
  méthode. Triage XS | Domaine products.
- **Aucune recommandation bloquante pour le merge** : les deux critères d'acceptation du
  Sprint 73 sont **tenus au navigateur**.


---

## ⚠ RÉGRESSION CAUSÉE PAR CETTE ABSORPTION — corrigée (`0954412`)

Cette sonde a **cassé la CI**. À consigner sans euphémisme : le sprint a introduit une
régression E2E via ses propres tests.

**Mécanisme.** La sonde seedait, sur le compte **partagé** `PROD`, des produits dont le nom
est un seul mot de 40–64 caractères — et `seedProduct` ne nettoyait rien, donc la donnée
persistait. `sprint-62-select-focus-indicator.spec.ts` utilise le **même** compte et ouvre le
`<Select>` produit du `NewEventDrawer` : le popover s'élargissait et le point échantillonné
(x ≈ 412,6) sortait du viewport 390 px. 2 tests rouges, projet `firefox`.

**Cause confirmée en base, pas déduite :** 8 lignes `products` `archived=false`,
`length(name)=64`, nom `Antidisestablishmentarianismelectroencephalographie<timestamp>`,
appartenant à des users `pr*`. Reproduction de l'échec CI en local sur la base sans le
correctif : **256 / 2 / 9**, mêmes 2 tests, même erreur de géométrie.

**Piste écartée avec preuve :** l'ajout à `pixel.ts` est purement additif à partir de la
**ligne 661**, après les lignes 405/510/511 de la pile d'échec, et ne supprime rien.

### Correctif
- `deleteProduct` dans `frontend/e2e/support/products.ts` — route **vérifiée** dans
  `ProductController.java:135` : `DELETE /api/users/{userId}/products/{productId}` → **204**
  (soft delete BR-PRO-007 ; `@SQLRestriction("archived = false")` suffit à dépolluer).
- Branché sur un `test.afterEach` **inconditionnel** (inventaire rempli AVANT le `goto`),
  chaque suppression isolée en `try/catch` pour ne jamais faire rougir un test vert.
- **Catégorie délibérément non supprimée**, après vérification : `DELETE /api/categories/{id}`
  répond **409** même une fois le produit supprimé (le soft delete conserve la FK
  `products.category_id`). Le helper `deleteCategory` a été écrit puis **retiré** — chemin
  mort qui warnait à chaque run.
- `sprint-62-...spec.ts` **n'a pas été touché** : affaiblir un test existant pour couvrir un
  défaut introduit ailleurs aurait été le mauvais correctif.

### Défaut latent corrigé au passage
Nom de catégorie via `unique('S73')` au lieu de `S73 ${Date.now()}` :
`uq_categories_owner_name` est `UNIQUE(owner, name)` et le compte est partagé — à
`workers: 2`, deux tests seedaient dans la même milliseconde. Confirmé dans les logs backend
(`duplicate key value violates unique constraint`), **remonté en 500**, donc facile à
diagnostiquer à tort comme « backend cassé ».

### Purge locale
8 + 2 produits `Antidisestablishmentarianism%` passés `archived=true` (même sémantique que
l'API, `UPDATE` réversible, aucun `DELETE` physique). Plus long nom restant : 38 car., avec
espace, donc sécable.

### Vérification
- `--project=firefox` : **15/15**, trois fois de suite
- sonde S73 seule : **10/10**, deux fois, 0 warning de nettoyage
- suite complète aux **paramètres CI exacts** (`--workers=1 --retries=2`) :
  **258 passed / 0 failed / 9 skipped / 0 flaky**

### Réserve à ne pas masquer
Sans retry (`--retries=0`), deux runs complets ont montré les mêmes 2 tests `sprint-62:551`
en **timeout 30 s** (`waiting for [role="option"][data-highlighted]`) — **mode d'échec
DIFFÉRENT** de l'erreur de géométrie, jamais reproduit en isolation (3 runs firefox verts) et
absent du run aux paramètres CI. Corrélation observée mais **non prouvée** : en suite complète
le compte `PROD` porte 81 produits visibles contre 6 en run isolé. La variable n'a pas été
isolée. L'erreur de géométrie, elle, a **0 occurrence** sur tous les runs avec le correctif.

La fenêtre de pollution n'est **fermée** qu'à `workers: 1` (la CI). En local à `workers: 2`
elle est réduite à la durée d'un test, pas supprimée — la fermer exigerait un compte dédié,
donc un `register` de plus (budget déjà au plafond 5/min/IP).

STATUS: COMPLETED
