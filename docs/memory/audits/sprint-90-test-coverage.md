# Audit tests — Sprint 90

> Généré en fin de Phase 6 par le lead. SHA de code mesuré : `f4a8e1d` (#630, dernier commit applicatif).
> **BROUILLON** — lignes « E2E couverture » et « Revues » à finaliser après la spec de couverture et la review batch.

## Couverture par comportement

Sprint frontend seul : aucune règle métier backend modifiée, aucune migration. La seule règle métier citée est **BR-EVE-002** (sans produit, aucun événement créable), qui dicte la cible du CTA de la frise vide.

| Issue | Comportement | Flux inter-systèmes | Unit / IT backend | Vitest frontend | E2E parcours | E2E métier |
|---|---|---|:---:|:---:|:---:|:---:|
| #624 | Dashboard sans frise complète ni `AddProductButton` ; « Ouvrir la frise » → `/timeline` ; création de produit via `/products` | OUI (création produit API → apparition dans la frise) | N/A (backend inchangé) | ✅ `dashboard/page.test.tsx` (armé : `TimelineEditHost` remis → 1 rouge), `DensityRibbon.intl.test.tsx` (4 locales réelles) | ✅ `sprint-84-section-titles`, `sprint-85-timeline-sidebar`, `sprint-85-timeline-toolbar`, `timeline.spec` (re-routés) | ✅ `golden-path.spec.ts` : produit créé depuis `/products`, absence de `timeline-view` sur le dashboard, clic « Ouvrir la frise », NOM du produit asserté dans la frise |
| #629 | Squelettes montés : `loading.tsx` (timeline, products, fiche produit, settings) + branches internes (frise, liste produits, catégories), testids conservés | NON (état d'attente UI) | N/A | ✅ 4 `loading.test.tsx`, `timeline/page.test.tsx`, `ProductsListView.test.tsx`, `CategoriesView.test.tsx` | ✅ `timeline.spec.ts` « chargement des données » (porte sur le listing) | N/A |
| #630 | `EmptyState` + piste pointillée ; 7 surfaces vides avec CTA ; frise vide → lien `/products` (BR-EVE-002) | OUI (listing vide API → état vide → CTA → écran de création) | N/A | ✅ `EmptyState.test.tsx`, `empty-states.i18n.test.ts` (parité 4 locales), tests de surface (armé : `track={false}` → 1 rouge) | ✅ `timeline.spec.ts` « écran vide » (piste, CTA `href=/fr/products`, clic → `products-empty`) | ✅ même test : frise vide → CTA → écran produits vide avec son CTA |

## Tests créés ou modifiés
- `frontend/app/[locale]/(app)/dashboard/page.test.tsx` (#624, nouveau)
- `frontend/src/components/dashboard/DensityRibbon.intl.test.tsx` (#624)
- `frontend/app/[locale]/(app)/{timeline,products,products/[productId],settings}/loading.test.tsx` (#629, nouveaux)
- `frontend/app/[locale]/(app)/timeline/page.test.tsx` (#629, #630)
- `frontend/src/components/products/{ProductsListView,CategoriesView}.test.tsx` (#629, #630)
- `frontend/src/components/shared/EmptyState.test.tsx`, `empty-states.i18n.test.ts` (#630, le second nouveau)
- `frontend/src/components/dashboard/{dashboard-components,dashboard-mobile}.test.tsx` (#630)
- `frontend/e2e/golden-path.spec.ts`, `sprint-84-section-titles.spec.ts`, `sprint-85-timeline-sidebar.spec.ts`, `sprint-85-timeline-toolbar.spec.ts` (#624), `timeline.spec.ts` (#624, #630)

## Résultats des runs
- **Backend** : non joué — aucun fichier `backend/` dans `a6b39ad..HEAD` (vérifié par `git diff --stat`).
- **Frontend** (lead, rejoué depuis le worktree) : SHA `f4a8e1d` → Vitest 134 fichiers / 1630 tests passés ; SHA `d6f17e4` (après correctifs de review cycle 1) → 134 fichiers / 1646 tests passés ; **SHA `0de3ec6` (code final, après correctifs de review cycle 2) → Vitest 134 fichiers / 1651 tests passés** (S89 : 1587), `tsc --noEmit` exit 0, `prettier --check .` exit 0, `next lint` 0 warning. Les chiffres des agents correctifs (1646, 1651) sont confirmés par contre-mesure du lead.
- **Build de production** (lead, `NEXT_PUBLIC_API_URL=/api` + `E2E_API_PROXY_TARGET` au build) : exit 0 sur `ec6d9f6` puis sur `f4a8e1d`.
- **E2E suite complète** (lead, `next start` :3000, backend lancé depuis la branche sur :8086 contre un Postgres jetable `mytimeline-s90-e2e-db` :5436, schéma créé par Flyway, 2 workers) :
  - SHA `ec6d9f6` (vague 1) : **377 passés / 1 échoué / 8 sautés / 1 non exécuté**, 2,5 min.
  - SHA `f4a8e1d` (vague 2) : **377 passés / 1 échoué / 8 sautés / 1 non exécuté**, 2,6 min.
  - SHA `d6f17e4` (code après correctifs de review cycle 1, avec `sprint-90-first-contact.spec.ts`) : **389 passés / 1 échoué / 8 sautés / 1 non exécuté**, 2,6 min — les 12 tests supplémentaires sont ceux de la spec de couverture, agendas « avec / sans produit » compris.
  - **SHA `0de3ec6` (code FINAL, après correctifs de review cycle 2) : 388 passés / 2 échoués / 8 sautés / 1 non exécuté**, 2,6 min (399 tests).
    - Échec 1 : `sprint-77-theme-visual.spec.ts:620`, faux rouge darwin (voir ci-dessous).
    - Échec 2 : `sprint-84-palette.spec.ts:128` « clavier : flèche droite depuis la pastille cochée déplace focus ET sélection » — `toBeFocused` échoue alors que la pastille suivante est bien `aria-checked="true"` (la sélection se déplace, le focus est repris ensuite). **Instabilité PRÉEXISTANTE sur `dev`, démontrée par A/B** : worktree jetable sur la base `a6b39ad` (dépendances et spec identiques, vérifié par `git diff --quiet`), build et `next start` :3100 contre le même backend, même spec rejouée 5 fois de chaque côté en séquence → **base : 3 verts / 2 rouges ; sprint : 2 verts / 3 rouges**. Indiscernable sur 5 essais. Le sprint ne touche ni `palette-color-picker.tsx`, ni `EventEditForm.tsx`, ni `NewEventDrawer.tsx`, ni le shell ; le gestionnaire clavier focalise AVANT `onChange` (l.108-109), aucun auto-focus dans le drawer. Cause non localisée → follow-up.
  - L'**échec** récurrent des runs précédents est `sprint-77-theme-visual.spec.ts:620` (armement de la comparaison) : « Référence absente … `landing-hero-light-chromium-darwin.png` » — références Linux seules, faux rouge macOS connu, landing non touchée par le sprint. Aucun PNG `-darwin` généré (arbre `e2e/` propre). Le non-exécuté suit l'échec dans le même `describe`.
- **Vérification navigateur réelle** (lead, sonde Playwright jetable non committée, 1280 px, SHA `ec6d9f6`) : lanes du squelette frise 6 × **46 px** ; en-tête frise immobile à la bascule (y=32, h=72 avant/après) ; contenu démarre au top du squelette (128 px) ; onglets produits immobiles, contenu au top du squelette (225,6 px) ; catégories en cartes 114 px ; `animationDuration` **1e-05 s** sous `reducedMotion: reduce` contre 2 s sinon ; captures clair/sombre conformes.
- **Coverage E2E des testids** (phase 8) : 10 testids neufs non cités à l'origine (6 CTA d'états vides, 4 squelettes de segment) → spec `sprint-90-first-contact.spec.ts` (`5ad23f3`, agendas réécrits en `d6f17e4`) qui les exerce au rendu : 3 runs verts consécutifs par l'agent, armement prouvé sur 4 mutations (CTA recherche inerte, CTA agenda inerte, testid squelette faux, squelette retiré du DOM) ; 2 mutations « porte relâchée » restent vertes (les portes stabilisent, elles ne sont pas la preuve). Spec verte dans les suites complètes `d6f17e4` et `0de3ec6`. Contrôle heuristique relancé : les 10 testids sont désormais cités.

## Revues
- Frontend cycle 1 (`a6b39ad..f4a8e1d`) : 0 CRITIQUE / 0 MAJEUR / 6 MINEUR — **tous absorbés** sur décision dev (`e04f7df`, `d21235c`, `ef5a1be`, `d6f17e4`) — `sprints/sprint-90/specialists-reviewer-frontend.md`.
- Frontend cycle 2, relecture des correctifs (`7e5351b..d6f17e4`) : 0 CRITIQUE / **1 MAJEUR** / 2 MINEUR — MAJEUR (assertion `sprint-84` vacante) mesuré puis corrigé et **armé par le lead** (`8276b9a`) ; mineur focus-après-annulation corrigé (`0de3ec6`, armé en unitaire par l'agent) ; mineur « région live insérée peuplée » → follow-up — `sprints/sprint-90/specialists-reviewer-frontend-cycle2.md`. Pas de cycle 3 (protocole : re-review max 1 cycle).

- **Vérification navigateur #630** (lead, 2e sonde jetable non committée, SHA `f4a8e1d`, listing produits stubbé vide) : piste `timeline-empty-track` = 3 lanes `dashed` 2 px, `aria-hidden="true"`, couleur `rgb(122,126,135)` identique en clair et sombre (≈ 4,1:1 sur fond clair, ≈ 4,7:1 sur fond sombre — décoratif, lisible) ; captures conformes (instruction + CTA « Créer un produit ») ; dashboard vide **375 px en allemand** : `scrollWidth` = `clientWidth` = 375, aucun débordement ni chevauchement avec le FAB. La capture montrait les défauts 5 et 6 de la review (CTA « Ereignis hinzufügen » sans produit, libellé « Produkt hinzufügen » sur un simple lien) → corrigés par le cycle correctif.

- **MAJEUR du cycle 2 mesuré au navigateur** (lead, 3e sonde jetable, SHA `d6f17e4`, 375 px, fr et de) : plus long jeton du salut `sh5634257427276,` (16 caractères) = **178 px** de largeur naturelle pour un `h1` de **343 px** ; classe `break-words` retirée du DOM → `scrollWidth` = `clientWidth` = 343. L'assertion `scrollWidth <= clientWidth` de `sprint-84` était donc bien **vacante** (estimation du reviewer : ≈ 250 px, non mesurée — le constat tient avec une marge plus large encore).
- **Correctif du MAJEUR armé par le lead** (`8276b9a`, jeton `'W'.repeat(60)` injecté + précondition en pixels) : `sprint-84-section-titles -g "jeton insécable"` → **6 passés** ; mutation `h1.classList.remove("break-words")` en tête du callback → **1 échoué** (« jeton du salut qui déborde de son titre », attendu ≤ 343, reçu **1159**) ; retour arrière vérifié par `git diff --quiet` → **6 passés**. L'assertion n'est plus vacante.

## Non vérifié
- Squelettes de chargement à **375 px** au navigateur (mesurés à 1280 px ; specs mobiles existantes vertes).
- Firefox / WebKit : Chromium seul.
- CI Linux : fait foi pour `sprint-77-theme-visual` (références `-linux`) et pour l'instabilité `sprint-84-palette:128`.
- Annonce réelle des régions live (`EmptyState`, `LoadingSkeleton`) sous VoiceOver/NVDA : non testable sous jsdom ni Playwright.
- Retour de focus Radix de bout en bout au navigateur après création/annulation depuis un CTA d'état vide : couvert en unitaire (drawer moqué + test du relais Radix réel), pas en E2E.

## Conclusion
**Prêt pour PR.** Aucune lacune de couverture ouverte : les deux comportements « flux inter-systèmes » (#624 création produit → frise ; #630 listing vide → CTA → création) ont leur E2E métier. Deux échecs dans la suite finale, tous deux **hors sprint et démontrés comme tels** : faux rouge darwin (`sprint-77`, référence absente) et instabilité préexistante (`sprint-84-palette:128`, A/B base 2/5 rouges contre sprint 3/5). Le check `e2e` de la CI Linux reste le gate de merge.
**BROUILLON levé** — l'en-tête ci-dessus est conservé pour la traçabilité de la construction de l'audit.
