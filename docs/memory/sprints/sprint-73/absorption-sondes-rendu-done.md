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

STATUS: COMPLETED
