# Issue #472 — [BUG] Deux flakes E2E résiduels hors famille #467

**Sprint 80, vague 1** · commit `dea0a0c` · vérifié par le lead (`git show --stat`).

## Ce qui a été fait

6 runs E2E **complets** joués en direct (jamais délégués, PIT-S73-004), régime `workers: 2`,
serveur Next externe `:3000` (webpack), backend conteneurisé `s80e2e` `:8086`.

| n° | pass | fail | skip | durée | specs rouges |
|----|------|------|------|-------|--------------|
| 1 | 299 | 11 | 9 | 7,4 mn | 10× réfs visuelles darwin absentes + products/navigation |
| 2 | 299 | 11 | 9 | 8,4 mn | 10× réfs darwin + sprint-62 firefox `ProductDrawer-light` (timeout 30 s) |
| 3 | 308 | 2 | 9 | 8,4 mn | products/navigation + sprint-62 firefox `ProductDrawer-light` |
| 4 | 307 | 3 | 9 | 8,9 mn | golden-path, products/navigation, timeline/today |
| 5 | 308 | 2 | 9 | 8,4 mn | products/navigation, products/édition |
| 6 | 309 | 1 | 9 | 6,9 mn | products/navigation |

Runs 1-3 pré-correctif, 4-6 post-correctif. **Cibles #472 : 24/24 vertes sur les runs 1, 4, 5, 6.**

## Verdicts sur les deux symptômes de l'issue

**Popover Firefox — symptôme DÉCRIT non reproduit en 6 runs** (variantes claire et sombre vertes
partout). Mais une instabilité **réelle** du même fichier a été reproduite 2 fois sur 6, sur un
autre membre (`ProductDrawer — light`), avec **deux causes distinctes établies sur artefact** :

1. **Coût de la sonde — CORRIGÉ.** `probeHighlighted` prenait 18 captures + 18 décodages PNG par
   test. Chiffré en comparant deux tests du **même** fichier, même fixture, dont un seul sonde :
   3,2 s (0 capture) vs 7,8 s (18) au repos ; 6,4 s vs 24,8 s sous charge ⇒ 0,25-1,0 s par capture
   sur Gecko, soit **15-18 s des 30 s de budget**. Pile du timeout au run 2 : `pixel.ts:503`.
   `readStrips` ramène à 1 capture → mesuré ensuite 3,3-5,1 s.
2. **Compilation à la demande de `next dev` — TOLÉRÉE, et écrite dans la spec.** Log serveur du
   run 3 : `Compiled /[locale]/settings in 17.8s` / `GET /fr/settings 200 in 18146ms`. La
   compilation étant sérielle, elle fait échouer le **worker voisin** à 5 s. **Strictement
   locale** : #462 a retiré `next dev` du job CI `e2e` pour cette raison exacte (`ci.yml` l.344-356).

**Suppression de catégorie — NON REPRODUIT en 6 runs complets** (les 4 tests du fichier verts,
2,3-6,8 s). Le régime a changé deux fois depuis la mesure S64 (#469 workers 1→2, #463 purge des
semis). L'explication par l'accumulation que #463 supprime est **plausible mais non démontrée** —
aucune trace S64 ne subsiste. « 0/6 » ne réfute pas un taux annoncé à 1/5 ; c'est consigné dans la
spec, conformément au dernier critère d'acceptation.

## Fichiers touchés

- `frontend/e2e/support/pixel.ts` — `readStrips()` (1 capture / N offsets) ; `readStrip` et
  `dumpOutwardProfile` délèguent, sémantique inchangée.
- `frontend/e2e/sprint-62-select-focus-indicator.spec.ts` — `readSignedProfile` + `stripAt`, les 3
  offsets lus dans la MÊME image ; dossier des 2 causes.
- `frontend/e2e/categories.spec.ts` — verdict « non reproduit » + 2 précautions.
- `frontend/playwright.config.ts` — **commentaire seul** (vérifié : 0 ligne supprimée). `workers` et
  `testMatch` firefox **non touchés**, comme exigé.

Non touché : `support/timeline-lanes.ts`. **Aucun** timeout relevé, **aucun** `retries`, **aucun**
`test.slow()` — l'interdiction de masquer un flake a été respectée.

## Signaux mémoire

- `[MEMORY:pitfall]` Une sonde de pixels qui prend une capture par offset paie N `page.screenshot` +
  N décodages PNG par test. Invisible sur Chromium (0,25 s/capture), fatal sur Gecko sous charge
  (1,0 s). Symptôme trompeur : « le membre qui tombe varie » ressemble à un flake de composant,
  c'est un défaut de **coût** — tous les tests du fichier sont au même niveau de budget.
- `[MEMORY:pitfall]` `next dev` compile les routes App Router à la demande **et les évince après
  inactivité** : une route déjà compilée est RE-compilée plus tard dans le même run (`/[locale]/settings`
  1,0 s puis 17,8 s). Budget par défaut d'un `expect` = 5 s ⇒ dépassement systématique, et la
  compilation sérielle frappe AUSSI le worker voisin. Le log `next dev` tranche en une commande.
- `[MEMORY:pitfall]` Le hook RTK réécrit `npx playwright test` en y injectant `--reporter=json` et
  tronque la sortie à 2 000 caractères — log vide, `EXIT=` faux. Même famille que PIT-S65-003 mais
  sur le RUN, pas le listing. Parade : `rtk proxy` + `PLAYWRIGHT_JSON_OUTPUT_NAME`.
- `[MEMORY:pattern]` Départager « défaut de composant » de « défaut de coût/environnement » :
  comparer deux tests du MÊME fichier, même fixture, dont un seul fait la chose suspecte. Le delta
  EST la mesure — sans run isolé, donc **sans faire disparaître le flake** (PIT-S64-009).
- `[MEMORY:decision]` La compilation à la demande de `next dev` est **tolérée** en local plutôt que
  corrigée par du budget : relever un timeout achèterait du vert local en faisant perdre au local un
  signal que la CI garde (elle sert un build de production).
- `[MEMORY:decision]` Sur macOS local, `sprint-77-theme-visual.spec.ts` produit 10 rouges
  **structurels** (références committées en `-chromium-linux.png`). Ce n'est pas un flake. Les PNG
  darwin générés ont été supprimés, **pas** committés.

## Recommandations suite

- Pas de `RECOMMAND_TEST_RUNNER` : 6 runs joués en direct.
- Pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` : aucun schéma ni surface d'auth touchés.
- **`RECOMMAND_REVIEWER`** : `readStrips` est un helper **partagé** —
  `sprint-62-control-focus-contrast.spec.ts` consomme `dumpOutwardProfile`, qui délègue désormais.
  Vérifier que la marge unique (`max|offset|+3`) ne change aucun clip pour ce consommateur.
  Mesuré vert sur 4 runs, mais c'est le point à relire.

### Conséquences pour les vagues suivantes (à ne pas perdre)

- **#476 (vague 2)** : la cause racine des rouges locaux est la **compilation à la demande**, pas le
  parallélisme. La borne de charge locale n'est donc pas le sujet mesuré ici.
- **#408 (vague 3)** : ⚠ **la baseline LOCALE n'est pas verte et ne peut pas l'être.**
  `products.spec.ts :: navigation liste vers détail produit` est rouge 4 runs sur 6, systématiquement,
  parce que `/[locale]/products/[productId]` n'est visité que par ce test (donc toujours froid,
  6,5 s mesurés) contre un `expect` à 5 s. **La preuve de #408 doit être jouée contre la CI**, pas
  contre `next dev`.

## RECOMMAND_FOLLOWUP

1. `products.spec.ts :: navigation liste vers détail produit et retour` — rouge 4/6 en local, cause
   identifiée (route compilée à froid en 6,5 s vs `expect` 5 s). Décider : préchauffage des routes au
   `globalSetup`, ou desserrage d'`onDemandEntries` réservé à la recette e2e. [triage S] [frontend/e2e]
2. Références visuelles `sprint-77-theme-visual` inexploitables hors Linux : 10 rouges garantis sur
   tout poste macOS, aucun garde-fou ne le dit. Documenter ou `test.skip` hors `-linux`. [triage XS]
   [frontend/e2e]

STATUS: COMPLETED
