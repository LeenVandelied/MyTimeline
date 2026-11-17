# Issue #825 — Nom de produit écrasé dans « Tes produits » (dashboard desktop)
## Résumé
- Cause (confirmée en lecture, prémisse architect exacte) : `ProductList.tsx` nom `min-w-0 flex-1 truncate` (base 0) contre secondaire `hidden truncate sm:inline` (base auto, sans plafond). Rangée = 280 px (aside `lg:grid-cols-[minmax(0,1fr)_280px]` de `app/[locale]/(app)/dashboard/page.tsx`, ≥ 1024 px). Secondaire long → espace libre négatif → le nom en base 0 ne reçoit rien.
- Correctif (`frontend/src/components/dashboard/ProductList.tsx`) : nom = base auto, `min-w-0 truncate sm:max-w-[60%]` (plus de `flex-1`) → largeur naturelle, plafonnée à 60 % dès sm ; secondaire (et repli `noUpcoming`) = `min-w-0 flex-1 truncate text-end hidden sm:inline` → élastique, rogné « … », toujours collé au compteur quand il tient (rendu d'avant conservé) ; compteur `ms-auto shrink-0` (reste en bout de ligne < sm, nom n'étant plus élastique). Mobile : secondaire toujours masqué < sm, pas de plafond du nom sous sm. Testids ajoutés : `dashboard-product-list-name`, `dashboard-product-list-next` (cités par la spec).
- Calcul attendu à 280 px, nom de 36 lettres : nom ≈ 168 px (60 %), secondaire ≈ 50-60 px. NON MESURÉ (navigateur interdit à l'agent) — la spec E2E tranche.
- Tests : `frontend/src/components/dashboard/ProductList.test.tsx` (neuf, structure seule — jsdom ne mesure rien) 4/4 ; suite `src/components/dashboard` 13 fichiers, 186/186. tsc 0 ; `next lint --file` ×3 0 ; prettier --check ×3 OK.
- Test rouge avant correctif : oui (Vitest 4/4 rouges avant, verts après). E2E : rouge attendu avant correctif (nom 0 px / « K. » < 40 %) mais NON exécuté.
- Point d'attention lead : `text-end` sur le secondaire repose sur l'alignement au début d'une ligne qui déborde (CSS Text §6.1). La spec le contrôle (1er caractère du secondaire ≥ bord gauche de sa boîte). Si rouge sur ce seul point : retirer `text-end` (2 occurrences) et le contrôle redevient trivialement vrai.
## Commits
- 24c0f4e5 :bug: fix(dashboard): nom de produit prioritaire dans « Tes produits » (#825)
## Spec E2E à exécuter par le lead
- `frontend/e2e/sprint-114-dashboard-product-name.spec.ts` — sème sur PROD (helpers `seedCategory`/`seedProduct`, purge `seedIsolation`) `Kraftfahrzeughaftpflichtversicherung` et `Wohnungsmietvertrag`, chacun avec un événement J+20 de même titre ; fr + de × 1024 + 1280 px. Prouve : nom ≥ 40 % de la rangée (ou affiché en entier ; le nom long DOIT atteindre 40 %), secondaire `text-overflow: ellipsis`, ≥ 24 px, rogné (`scrollWidth > clientWidth`) pour le nom long, texte commençant au bord de début ; nom < secondaire < compteur sans chevauchement, compteur non rogné et dans la rangée ; `documentElement.scrollWidth <= innerWidth`. `--list` : 4 tests listés (+5 setup).
## Fichiers de contexte lus
- `.ai-env/context-packs/pit-frontend.md` — l.1245 PIT-S85 (#602) « une base `0` le laisse rétrécir jusqu'à rien » / « mesurer la largeur de l'élément élastique » ; l.917 PIT-S77-002 sonde `scrollWidth - clientWidth` ; l.1433 `test.use({ storageState })` par fichier ; l.1796 PIT-S107-002 (sr-only/overflow-x, non applicable ici : aucun sr-only dans la rangée). `truncate` : 0 occurrence.
- `.ai-env/context-packs/br-products.md` — l.42 BR-PRO-001 nom 1..100 (cas long réaliste) ; aucune règle d'affichage spécifique au dashboard.
- `frontend/e2e/support/products.ts` — l.76 `seedProduct` (titre événement = nom produit), l.146 `deleteProduct` (règle « donnée hors-norme purgée »).
- `frontend/e2e/support/fixtures.ts` — l.27 `seedIsolation` auto (purge après test, échec compris).
- `frontend/e2e/sprint-109-section-counts.spec.ts` — motif session/`waitForFonts`/`expectNoPageOverflow`.
- `frontend/playwright.config.ts` — NON LU (seul `--list` exécuté).
- `docs/memory/sprints/sprint-107/issue-608-done.md` — « nom visible 58 px » à 390 (liste produits, autre composant) ; `issue-524-done.md` — en-tête lu, hors périmètre (tabs).
## Signaux mémoire
- [MEMORY:pattern] Problem : ligne flex nom + texte secondaire tronqués, le secondaire mange le nom. Solution : l'élément PRIORITAIRE en base auto plafonnée (`max-w-[N%]`), l'élément sacrifiable en `flex-1 min-w-0 truncate` (base 0), le bout de ligne en `ms-auto shrink-0`. Anti-pattern : `flex-1` (base 0) sur l'élément qu'on veut protéger face à un voisin en base auto (#825, même mécanique que PIT-S85 #602).
## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête touché.
- Pas de RECOMMAND_SECURITY : classes CSS et testids uniquement, aucune donnée ni auth.
- Pas de RECOMMAND_UI_DESIGN : rendu inchangé quand tout tient (secondaire `text-end` contre le compteur) ; seule la répartition en débordement change, conformément aux critères de l'issue.
- Pas de RECOMMAND_TEST_RUNNER : suite dashboard 186/186 jouée par l'agent ; E2E réservé au lead par consigne.
- RECOMMAND_FOLLOWUP: aucun follow-up
STATUS: COMPLETED
