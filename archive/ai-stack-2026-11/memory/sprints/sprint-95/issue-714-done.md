# Issue #714 — Toast : décision B consignée + mesure E2E

## Commits
- a3b23f24 :memo: docs(toast): arbitrage #714 consigné + oracle E2E du recouvrement résiduel

## Décision appliquée
B — acceptation documentée. `TOASTER_TOP_OFFSET` INCHANGÉ, zéro ancrage contextuel.
- `frontend/src/components/ui/toaster.tsx:54-95` — section « NON DÉGAGÉS » transformée en
  DÉCISION (motifs : PIT-S62-001 `pointer-events` faux ami, bande overlay disjointe,
  borne 4000 ms sourcée `react-hot-toast/dist/index.js`).
- `docs/adr/ADR-008-echelle-z-popover-modale.md:195-203` — « suivis hors ADR » → TRANCHÉS par #714.
- `frontend/src/components/products/ProductDrawer.tsx:255` — commentaire mensonger corrigé.

## Mesures E2E (chiffrées, 3 régimes, stables sur 3 passes)
toast boundingBox (identique aux 3 viewports) : `x=34 y=72 w=340 h=65` → bande 72–137px.

| viewport | sheet top | croix | recouvrement | bande overlay | disjointe |
|---|---|---|---|---|---|
| 390×844 | 171 | x=333 y=188 h=16 | **0.0px** | 0–72 | OUI |
| 390×740 | 67 | x=333 y=84 h=16 | **16.0px (total)** | 0–67 | OUI |
| 390×667 | 53 | x=333 y=70 h=16 | **14.4px (partiel)** | 0–53 | OUI |

- tap overlay ferme la sheet avec toast affiché : **OUI** (390×740, pire cas) → décision B TIENT.

## Prémisses infirmées
1. « swipe-down = fermeture native » (`ProductDrawer.tsx:255`) : FAUX. 0 handler tactile,
   `vaul` absent, Radix n'implémente pas le swipe-to-dismiss. Corrigé.
2. JSDoc S92 « croix ≈ 84–100px à 844px quand le formulaire remplit la sheet » : FAUX **aux deux
   moitiés**. Contenu du drawer ≈ 672px < 92vh (776px) → la sheet n'est JAMAIS clampée à 844px,
   démarre à 171px, croix à 188px : **à 390×844 le recouvrement est NUL**. Il n'apparaît qu'en
   dessous de ≈ 730px de viewport. Le cas tranché existe, mais pas là où le S92 le situait.
3. JSDoc S92 « carte ≈ 46px → 72–118px » : mesuré **65px → 72–137px** (erreur sur 2 lignes).
4. Prémisse Designer « haut de sheet ≈ 68px à 844px » : mesuré 171px. La bande tapable n'est pas
   bornée par la sheet mais par la carte : c'est le décalage FIXE de 72px qui garantit la sortie.

## Tests
- E2E toast (liste complète du lead + nouvelle spec) : **24/24 passed (10.3s)** —
  `settings-profile` 3/3, `settings-security` 3/3, `sprint-92-business-toasts` 3/3,
  `sprint-92-product-detail-actions` 3/3, `sprint-93-restore-product` 1/1,
  `sprint-94-fullscreen-overlays` 2/2, `sprint-95-toast-overlap` 9/9.
- `sprint-95-toast-overlap` rejouée 3× isolément : 9/9, 9/9, 9/9, mesures identiques.
- `sprint-77-theme-visual` : **NON exécutée**, faux rouges macOS connus. **AUCUNE référence
  visuelle régénérée** (`--update-snapshots` jamais employé). CI Linux tranche.
- Unitaires `./scripts/test-quiet.sh frontend` : OK (build + vitest + typecheck + lint).
- `npm run format:check` : OK. `tsc --noEmit` : 0 erreur.
- Pile E2E démontée (compose `s95e2e` + `next start`).

## [MEMORY:*] signaux
[MEMORY:pitfall] Contexte: `test-quiet.sh frontend` reconstruit `.next` PENDANT qu'un
`next start` sert la même arborescence (S81 étendu au couple build/start). Symptôme trompeur :
toutes les pages rendent 200, mais l'hydratation casse → le projet `setup` Playwright échoue sur
`register-form` introuvable, ce qui ressemble à un rate-limit ou à un CORS. Solution: rebuild +
restart du serveur. Prévention: ne jamais lancer `test-quiet.sh` (qui builde) pendant un run E2E.
[MEMORY:pitfall] Contexte: `npx playwright test --repeat-each=N` rejoue AUSSI le projet `setup`,
qui course sur `.auth/accounts.json` partagé → 12 tests « did not run ». Solution: N passes
séquentielles du runner. Prévention: `--repeat-each` inutilisable sur ce dépôt.
[MEMORY:pitfall] Contexte: une note de géométrie écrite sans oracle (JSDoc S92) a survécu 3
sprints avec 3 chiffres faux, et l'arbitrage Designer #714 s'est appuyé dessus. Solution: mesurer
les 3 régimes de hauteur avant de consigner. Prévention: toute affirmation géométrique dans un
commentaire doit citer la spec qui la mesure.
[MEMORY:decision] Contexte: #714, recouvrement toast/croix. Décision: B — acceptation, position
inchangée. Pourquoi: le décalage fixe 72px garantit PAR CONSTRUCTION un ruban d'overlay tapable
en haut d'écran, disjoint de la carte ; le tap y ferme la sheet (mesuré) ; toast borné à 4000 ms ;
l'ancrage contextuel n'a pour signal que `body{pointer-events:none}`, faux ami (PIT-S62-001).
[MEMORY:pattern] Problème: tester une décision d'ACCEPTATION sans test arrangé. Solution:
assertion ENCADRANTE (min ET max) sur la borne mesurée + une assertion falsifiante isolée qui
fait tomber la décision si elle rougit. Anti-pattern: asserter l'absence de recouvrement, ou
n'asserter qu'un plafond (une amélioration silencieuse passerait inaperçue).

## Recommandations suite
RECOMMAND_FOLLOWUP: à 390×600 la croix du `ProductDrawer` a été mesurée à **y=-12** (hors
viewport) : elle est `absolute top-4` DANS le conteneur `overflow-y-auto`, donc elle défile avec
le contenu au lieu d'être `sticky`. Hors périmètre #714 (indépendant du toast), mais c'est une
perte réelle de contrôle de fermeture sur écran court — ouvrir une issue dédiée.
RECOMMAND_FOLLOWUP: la JSDoc de `toaster.tsx` cite encore d'autres cotes non mesurées (contrôles
« DÉGAGÉS » : hamburger, drawer paysage). Seuls le FAB et le hamburger ont un oracle (S92). Les
autres restent des relevés de code non peints.

## Fichiers de contexte lus
- `frontend/src/components/ui/toaster.tsx`, `ui/toast.tsx`, `ui/dialog.tsx`,
  `ui/palette-color-picker.tsx`
- `frontend/src/components/products/ProductDrawer.tsx`, `ProductsListView.tsx`,
  `AddProductButton.tsx`
- `frontend/src/services/apiClient.ts`, `apiErrorMessages.ts`, `networkStatus.ts`,
  `productService.ts`, `components/shared/OfflineBanner.tsx`
- `frontend/src/styles/ds/components/i18n.css`, `frontend/public/locales/fr/errors.json`
- `docs/adr/ADR-008-echelle-z-popover-modale.md`
- `frontend/playwright.config.ts`, `docker-compose.yml`
- `frontend/e2e/sprint-92-business-toasts.spec.ts`, `sprint-94-fullscreen-overlays.spec.ts`,
  `support/fixtures.ts`, `support/products.ts`
- Briefing #714 (context-packs `br-products` + `cp-frontend` inlinés)

STATUS: COMPLETED
