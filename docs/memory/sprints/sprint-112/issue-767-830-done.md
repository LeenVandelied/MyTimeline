# Issue #767-830 — Dernières cibles tactiles à 375 px (#767) et bascule de thème du tiroir mobile à 44 px (#830)

## Commits

- `2001e03e` :white_check_mark: test(e2e): dernières cibles tactiles mesurées à 375 px, CTA d'état vide portés à 44 px (#767). Auteur de Laforcade Loïc. 4 fichiers (`git diff --cached --stat` vérifié avant commit, rien n'était indexé avant mon `git add`).
- `e916b5ad` :lipstick: fix(theme): bascule de thème du tiroir mobile portée à 44 px de haut (#830). Auteur de Laforcade Loïc. 3 fichiers.
- Les deux commits précédents dans `git log` (`fb09570a` #831, `1b604fa5` #833) viennent des autres agents. Aucun de leurs fichiers n'est dans mes commits.

## Résumé

### #767

- Objectif : mesurer à 375 px les 4 dernières cibles, et ne corriger que celles sous 44 px.
- MESURÉ AVANT correction (spec neuve, build HEAD `00da5ecf` + mes sources, log `/tmp/s112-767-e2e-measure2.log`) :
  - `products-empty-cta` : **168,3×36** (cva `h-9`) → sous 44.
  - `categories-empty-cta` : **182,2×36** → sous 44.
  - bouton désarchiver (`product-detail-unarchive-<id>`) : hôte 131,8×32, `::before` 44×44, 4 coins cliquables (`elementFromPoint`). **Conforme, non modifié** (il portait déjà `TOUCH_TARGET_HITBOX`).
  - `⋯` `timeline-event-more` (frise portrait `/fr/timeline`) : boîte 44,0×44,0, rayon 5 px, 8 points de bord cliquables. **Conforme, non modifié** (`.mt-tlm__evt-more` 44×44 en CSS).
- Correctif : `className={TOUCH_TARGET_BUTTON}` (`max-md:h-11`, `src/lib/touchTarget.ts`, DEC-S101-003) sur les deux CTA, dans `frontend/src/components/products/ProductsListView.tsx` et `frontend/src/components/products/CategoriesView.tsx`. APRÈS : 168,3×44 et 182,2×44. Desktop 1280 : 36 px conservés (test dédié).
- Spec : `frontend/e2e/sprint-112-touch-targets.spec.ts` (5 tests). États vides obtenus par stub GET des listings (motif `sprint-90`). Produits semés sur PROD, purgés par la fixture AUTO `trackSeed`, même quand le test échoue. Aucun `register`, aucune connexion par formulaire.
- Helper étendu : `frontend/e2e/support/touch-targets.ts`, nouvelle fonction `expectClickableBox`, pour une cible dont la boîte porte la taille, sans `::before`. `expectHitbox` exige un `::before` ≥ 44, il ne convenait pas au `⋯`. Le défilement a été factorisé dans `scrollToCenter`, sans changer le comportement de `measureHitbox` (specs 99/101/102 vertes après).
- Décision de méthode (MESURÉE) : ma première version sondait les coins à 1 px de l'arête, comme `measureHitbox`. Elle a rougi sur le `⋯`, avec les coins du bas qui désignaient le wrap parent. J'ai sondé une grille de pixels sur le bouton : aucun voisin ne le recouvre, et les seuls pixels manqués sont ceux de l'arrondi `border-radius: 5px`, que le hit-testing de Chromium respecte. Les coins sont donc sondés à `1 + ceil(r·(1 − 1/√2))` = 3 px de l'arête, et les 4 milieux d'arête restent à 1 px. Contrôle négatif : un voisin transparent `z-index:5` qui recouvre les 10 px du bas fait rougir (3 points manqués : bas, bas-gauche, bas-droite). Log : `/tmp/s112-767-negative.log`. La sonde n'est pas committée.
- fichiers de contexte lus: `docs/memory/sprints/sprint-112/briefing-767-830.md`, `docs/memory/sprints/sprint-112/issue-768-done.md`, `frontend/e2e/support/touch-targets.ts`, `frontend/src/lib/touchTarget.ts`, `frontend/e2e/sprint-102-touch-targets.spec.ts`, `frontend/e2e/sprint-101-touch-targets.spec.ts` (en-tête + rangée dense), `frontend/e2e/sprint-90-first-contact.spec.ts` (en-tête + états vides), `frontend/e2e/sprint-61-archived-events.spec.ts` (semis archivé), `frontend/e2e/support/products.ts`, `frontend/e2e/support/fixtures.ts`, `frontend/e2e/support/timeline-lanes.ts` (extraits), `frontend/e2e/support/theme-preference.ts`, `frontend/e2e/sprint-111-theme-toggle-unified.spec.ts`, `frontend/src/components/ui/theme-toggle.tsx`, `frontend/src/components/ui/theme-toggle.test.tsx` (gabarits), `frontend/src/components/dashboard/MobileDrawer.tsx` (grep), `frontend/src/components/shared/EmptyState.tsx` (en-tête), `ProductsListView.tsx` / `CategoriesView.tsx` / `ProductDetailView.tsx` / `TimelineMobilePortrait.tsx` (extraits), `src/styles/ds/components/timeline.css` (règles `.mt-tlm__*`).

### #830

- MESURÉ AVANT (ancien build, log `/tmp/s112-830-e2e-before.log`) : `dashboard-mobile-drawer-theme-toggle` **285,75×36** en clair. Le test s'arrêtait à cette assertion, donc le sombre n'a pas été mesuré avant.
- Correctif : `h-11` dans la classe de la variante `labeled` (`frontend/src/components/ui/theme-toggle.tsx`). twMerge remplace le `h-9` de la cva `Button`. Classe sans préfixe `max-md:`, comme la variante `square` (`h-11 w-11`) ; ce gabarit n'est monté que dans le tiroir mobile.
- APRÈS : **285,75×44 en clair ET en sombre** (×2 runs).
- E2E : `frontend/e2e/sprint-111-theme-toggle-unified.spec.ts`. Nouveau helper `expectLabeledToggleTouchable`, qui reprend la même assertion `boundingBox` ≥ 44 (largeur et hauteur) que la variante `square`. Il est appelé à l'état initial clair puis après la bascule en sombre, sous `keepThemeOffSharedAccount` (déjà en place dans `openDashboard`). Les `PUT` écrits restent `['dark','light']`.
- Test jsdom ajouté (`theme-toggle.test.tsx`) : `h-11` présent, `h-9` absent. C'est une classe DÉCLARÉE, la hauteur rendue est prouvée par l'E2E.

## Tests

- Oracles `:3100` avant chaque série : `/api/auth/me` = 401, `/fr/login` = 200.
- Rebuild fait une fois après les modifications sous `frontend/src/` : kill par PID du port, `next build` avec `E2E_API_PROXY_TARGET=http://localhost:8087 NEXT_PUBLIC_API_URL=/api` → build=0, puis `next start -p 3100`, oracles 401/200. **Le serveur `:3100` reste DEBOUT.** Le build a été fait après les commits #833/#831, que `git status` ne montrait plus modifiés.
- `sprint-112-touch-targets` + `sprint-111-theme-toggle-unified` ×2 après correctif : **12 passed / 12 passed** (5,5 s, 5,3 s), 0 flaky. Logs : `/tmp/s112-767-830-after1.log`, `/tmp/s112-767-830-after2.log`.
- Régression sur toutes les specs qui citent les surfaces touchées ou le helper (grep `mobile-drawer|theme-toggle|products-empty|categories-empty|product-detail-unarchive|timeline-event-more|support/touch-targets`, plus la liste du briefing) : `landing-auth-theme-toggle`, `sprint-99/101/102/112-touch-targets`, `sprint-106-product-detail`, `sprint-111-theme-account-preference`, `sprint-111-theme-toggle-unified`, `sprint-61-archived-events`, `sprint-63-de-overflow-audit`, `sprint-73-tablet-sidebar`, `sprint-90-first-contact`, `sprint-91-event-pin`, `sprint-91-more-contrast`, `sprint-96-auth-banner-overlap`, `timeline-mobile`, `timeline.spec` → **181 passed (1,2 min), 0 failed**. Log : `/tmp/s112-767-830-regress.log`. Ce total inclut les tests du projet `setup`.
- `npx vitest run` ProductsListView + CategoriesView → 47/47. `src/components/ui/` + `dashboard-mobile.test.tsx` → 117/117. `e2e-rate-limit-budget.test.ts` → 37/37 (aucun login ni register ajouté).
- `npx tsc --noEmit` → 0 erreur. `rtk proxy npx next lint --file` ×7 → « No ESLint warnings or errors ». Le résumé RTK affiche « Errors: 1 », à cause du bandeau de dépréciation de `next lint` ; la sortie brute est propre. `rtk proxy npx prettier --check` ×7 → OK.
- PAS vérifié :
  - la CI Linux et Firefox ;
  - la suite E2E complète ;
  - le `⋯` de la frise PAYSAGE (`TimelineMobileLandscape`, hors périmètre ; lane de 34 px, cf. PIT-S91-003) ;
  - le `⋯` de la frise de la fiche produit (même composant portrait, autre conteneur) ;
  - le bouton de déconnexion du tiroir mobile : `<Button>` sans taille, probablement 36 px via la cva `h-9`, mais NON mesuré ;
  - l'entraxe entre deux boutons désarchiver voisins : un seul événement archivé est semé, donc aucune rangée verticale de hitboxes n'est mesurée (PIT-S101-008) ;
  - la hauteur de #830 dans le thème sombre AVANT le correctif.

## Critères d'acceptation

### #767
- [x] Les 4 zones sont mesurées à 375 px, largeur et hauteur, avec `::before` pour le bouton désarchiver et `elementFromPoint` pour le désarchiver et le `⋯`. Preuve : les lignes `[#767 …]` des logs, chiffres dans le Résumé.
- [x] Toute cible sous 44 px est corrigée via `touchTarget.ts` : les 2 CTA d'état vide, avec `TOUCH_TARGET_BUTTON`. Elles passent de 36 à 44.
- [x] Les cibles conformes ne sont pas modifiées : `ProductDetailView.tsx`, `TimelineMobilePortrait.tsx` et `timeline.css` sont absents du diff.
- [x] Un test E2E couvre les 4 zones à 375 px : `sprint-112-touch-targets.spec.ts`, 4 tests mobiles + 1 garde desktop, verts ×2.

### #830
- [x] Hauteur ≥ 44 px mesurée en E2E à 375 px : 44 (avant : 36).
- [x] Même assertion `boundingBox` que celle de la variante `square` : `toBeGreaterThanOrEqual(44)` sur `width` et `height`.
- [x] Clair ET sombre : 285,75×44 dans les deux thèmes.

## Signaux mémoire

- [MEMORY:pitfall] Contexte : #767, sonde `elementFromPoint` aux coins d'une zone 44×44, à 1 px de l'arête, sur une cible dont la boîte fait déjà 44 px (`⋯`, `border-radius: 5px`). Les coins désignaient le parent, ce qui ressemblait à un recouvrement par la lane voisine. Solution : une grille de pixels a montré que seuls les pixels de l'arrondi manquaient, car le hit-testing de Chromium suit `border-radius`. Les coins sont donc sondés à `1 + ceil(r·(1 − 1/√2))` px. Prévention : avant de conclure à un recouvrement, cartographier les points manqués et lire `border-radius`. `expectHitbox` n'est pas concerné : sa zone vient d'un `::before` sans arrondi.
- [MEMORY:pattern] Problème : prouver qu'une cible dont la BOÎTE porte la taille (sans pseudo) n'est ni recouverte ni rognée. Solution : `expectClickableBox` (`e2e/support/touch-targets.ts`), 8 points de bord (milieux à 1 px, coins rentrés du rayon), contrôle négatif par un voisin injecté qui recouvre 10 px (vu rouge). Anti-pattern : `boundingBox` seul, ou `expectHitbox` détourné sur une cible sans `::before`.

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun schéma, aucune requête touchés.
- Pas de RECOMMAND_SECURITY : classes CSS et specs E2E seulement, aucune surface auth ni donnée.
- Pas de RECOMMAND_UI_DESIGN : les deux corrections appliquent des conventions arbitrées (DEC-S101-003 `TOUCH_TARGET_BUTTON` ; `h-11` aligné sur la variante `square`), le rendu desktop des CTA est inchangé (36 px, mesuré).
- Pas de RECOMMAND_TEST_RUNNER : 17 specs rejouées (181 passed), specs neuves et modifiées ×2, vitest ciblé, tsc, lint, prettier, budget.
- RECOMMAND_FOLLOWUP: mesurer à 375 px le bouton de déconnexion du tiroir mobile (`MobileDrawer.tsx`, `<Button>` sans taille ⇒ probablement 36 px, NON mesuré), voire tout le tiroir via `expectAllTouchable`. [XS | frontend]
- RECOMMAND_FOLLOWUP: mesurer le `⋯` de la frise PAYSAGE (`TimelineMobileLandscape`, lanes de 34 px, PIT-S91-003) avec `expectClickableBox`. [XS | frontend/e2e]

STATUS: COMPLETED
