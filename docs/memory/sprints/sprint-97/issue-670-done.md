# #670 — `--color-ink-faint` réservé au non-textuel (Sprint 97)

## Objectif

Appliquer la décision de charte du dev : `--color-ink-faint` garde sa valeur (clair `#969AA3`,
sombre `#5E626B`) mais ne porte plus AUCUN texte ; tout texte migre vers `ink-muted`, les
indicateurs de contrôle vers `ink-muted` / `rule-emphasis` (1.4.11) ; le décoratif reste
`ink-faint`. Recenser tous les consommateurs, mesurer ≥ 4,5:1 clair ET sombre sur rendu réel.

## Fichiers modifiés

- Migration texte `text-ink-faint` → `text-ink-muted` :
  `frontend/app/[locale]/(app)/timeline/page.tsx`, `.../timeline/loading.tsx`,
  `frontend/src/components/dashboard/{GreetingHeader,ProductCarousel,ProductList,WeekAgenda,CompactAgenda,DensityRibbon,MobileDrawer}.tsx`,
  `frontend/src/components/products/{ProductsListView,ProductDetailView}.tsx`,
  `frontend/src/components/shared/StateScreen.tsx`, `frontend/src/components/settings/AvatarUpload.tsx`,
  `frontend/src/components/landing/FooterSection.tsx`.
- CSS : `frontend/src/styles/ds/components/core.css` (placeholders, affixe, tag__x, pouce de switch).
- Charte : `frontend/src/styles/ds/tokens/colors.css` (commentaire, valeur inchangée),
  `frontend/src/styles/ds/readme.md` (règle « jamais pour du texte, placeholders compris »),
  `frontend/src/styles/ds/a11y-audit.md` (nouveau §10 : table de mesures + tri).
- Garde-fous : `frontend/e2e/sprint-97-ink-faint-contrast.spec.ts` (nouvelle),
  `frontend/src/styles/__tests__/ink-faint-non-text.test.ts` (nouveau, statique).

## Recensement (critère 2) — occurrence → classe → décision

Comptage `/usr/bin/grep -rn ink-faint frontend/src frontend/app` au départ : **64 lignes** (le
lead en comptait 66 ; l'écart = comptage de lignes de commentaire, sans incidence).

| Occurrence | Classe | Décision |
|---|---|---|
| `timeline/page.tsx:64` eyebrow | texte | → `ink-muted` |
| `timeline/loading.tsx:32` eyebrow du squelette | texte | → `ink-muted` |
| `GreetingHeader.tsx:49` eyebrow dashboard | texte | → `ink-muted` |
| `ProductCarousel.tsx:111,115` « aucun à venir », compteur | texte | → `ink-muted` |
| `ProductList.tsx:96,101` libellé, compteur | texte | → `ink-muted` |
| `WeekAgenda.tsx:127` nom de produit | texte | → `ink-muted` |
| `CompactAgenda.tsx:56,131` nom de produit, « rien aujourd'hui » | texte | → `ink-muted` |
| `DensityRibbon.tsx:155` indice de défilement (mono 10px) | texte | → `ink-muted` |
| `MobileDrawer.tsx:81,88` eyebrows | texte | → `ink-muted` |
| `ProductDetailView.tsx:365,381,386,463` `<dt>`, « sans catégorie », badge | texte | → `ink-muted` |
| `ProductsListView.tsx:355` « sans catégorie » (mono) | texte | → `ink-muted` |
| `ProductsListView.tsx:374` tiret « — » (aria-hidden + sr-only) | texte (glyphe visible porteur de « aucun ») | → `ink-muted` |
| `ProductsListView.tsx:204` loupe de recherche | icône d'indice de champ (règle 2) | → `ink-muted` |
| `StateScreen.tsx:82` code 404/500 (24px 600) | texte (grand, 3:1 ; `ink-faint` 2,75 échoue quand même) | → `ink-muted` |
| `AvatarUpload.tsx:157` « ? » sans avatar | texte (glyphe) | → `ink-muted` |
| `AvatarUpload.tsx:190` indice de format | texte (zone `aria-disabled` seulement quand `disabled` → pas exempt au repos) | → `ink-muted` |
| `FooterSection.tsx:120` copyright | texte | → `ink-muted` |
| `core.css` `.mt-input/.mt-textarea::placeholder` | texte | → `ink-muted` |
| `core.css` `.mt-select__placeholder` | texte | → `ink-muted` |
| `core.css` `.mt-input-affix__icon` | icône d'indice (règle 2) | → `ink-muted` |
| `core.css` `.mt-tag__x` | contrôle (bouton suppr.) | → `ink-muted` |
| `core.css` `.mt-switch__thumb` (état off) | **ambigu** : indicateur d'état d'un contrôle | → `rule-emphasis` (3,70 / 4,10 sur surface-2 ; même palier que le contour de piste) |
| `core.css` `.mt-btn--secondary:hover`, `.mt-iconbtn:hover`, `.mt-select__trigger:hover` (border) | bordure de survol | reste `ink-faint` (règle 3) — cf. FOLLOWUP ci-dessous |
| `timeline.css` `.mt-tl-ruler__maj--month`, `.mt-tlv__tick--month`, `.mt-tlm__tick--month` | filets décoratifs | reste |
| `timeline.css` `.mt-tlv-side__legend-ghost` | pastille fantôme | reste |
| `base.css:175` pouce de scrollbar au survol | décoratif | reste |
| `SettingsIndex.tsx:47` chevron `aria-hidden` | **ambigu** → décoratif (le libellé du bouton porte le sens) | reste |
| `EmptyState.tsx:95` illustration `aria-hidden` | **ambigu** → décoratif (titre + texte portent le sens) | reste |
| `globals.css:50` mapping `@theme` | plomberie Tailwind | reste |
| `colors.css:66,145` définitions | token | valeur inchangée, commentaire |
| commentaires (`timeline.css:224,593,594,623,646`, `hero-timeline.css:200`, `TimelineSidebar.tsx:32`, `WeekAgenda.tsx:59`, `StateScreen.tsx:12`, `readme.md`) | doc | inchangés (historique exact) |
| tests (`section-titles.test.tsx`, `ProductDetailView.test.tsx`, 4 `page.test.tsx` d'auth) | assertions NÉGATIVES (`not.toContain`, `toBeNull`) | inchangés — restent vraies |

Aucun cas « contrôle désactivé » (règle 4) n'a été laissé en `ink-faint`.

## Écarts d'énoncé constatés

- L'énoncé cite « placeholders du DS » : le champ `Input` (shadcn, `ui/input.tsx`) utilisé partout
  a DÉJÀ `placeholder:text-muted-foreground` = `ink-muted` ; les consommateurs réels de
  `.mt-textarea::placeholder` en prod se limitent à `Textarea` (drawer catégorie). `.mt-input` et
  `.mt-select__placeholder` n'ont aucun consommateur `.tsx` à ce jour (corrigés quand même : charte).
- Le briefing mentionne une « ligne ink-faint » dans `a11y-audit.md` : il n'y en avait aucune →
  ajout d'un §10 dédié.
- `rule-emphasis` sombre = `gray-450 #7A7E87` (non inversé) → 4,10:1 sur surface-2 sombre : conforme
  au chiffre du lead.

## Tests (commandes exactes + résultats)

Harnais : postgres `mytimeline-e2e-postgres-e2e-1` (`:5436`, `docker start`) ; backend depuis HEAD
(`./mvnw package -DskipTests`, `java -jar` `:8086`, profil `dev,e2e`, CORS `:3000,:3100`,
`RATE_LIMIT_ENABLED=false`) ; front `next build` (`NEXT_PUBLIC_API_URL=/api
E2E_API_PROXY_TARGET=http://localhost:8086` au build) + `next start -p 3100`. Oracles :
`/fr/login` = 200, `/api/auth/me` = 401, `test-support` = 404 (profil e2e actif).

- Nouvelle spec : `SKIP_DELEGATION=1 CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx
  playwright test e2e/sprint-97-ink-faint-contrast.spec.ts` → **13 passed** (5 setup + 8).
  Mesures : eyebrow timeline/dashboard **5,96** clair (`#5e626b`/`#fcfcfd`) / **6,26** sombre ;
  placeholder `.mt-textarea` **6,11** clair (sur `#ffffff`) / **5,85** sombre (sur `#131519`) ;
  loupe produits **5,96** / **6,26**.
- **Contrôle négatif** (4 fichiers remis à `HEAD` : `page.tsx`, `GreetingHeader.tsx`, `core.css`,
  `ProductsListView.tsx`, rebuild, rerun, puis restauration + rebuild) → **7 failed / 6 passed** :
  2,75 (clair, eyebrows et loupe), 2,82 (placeholder clair), 3,20 (eyebrows sombre), 2,99
  (placeholder sombre). Le 8e (loupe sombre, 3,20 ≥ 3:1 seuil non textuel) reste vert : attendu —
  `ink-faint` sombre sur `bg` passe 1.4.11 ; les 3 autres consommateurs couvrent le sombre.
- Garde statique : `npx vitest run src/styles/__tests__/ink-faint-non-text.test.ts` → 4/4 ;
  contrôle négatif (eyebrow timeline + `.mt-select__placeholder` réinjectés) → 2 failed, restauré → 4/4.
- Specs citant une surface touchée (liste `/usr/bin/grep -rlE "toHaveScreenshot|ink-faint|ink-muted|
  timeline-screen|dashboard-greeting|product-carousel|dashboard-product|dashboard-week-agenda|
  compact-agenda|density-ribbon|mobile-drawer|products-row|products-search|product-detail|
  state-screen|avatar-dropzone|avatar|mt-switch|mt-tag|placeholder|category-description|
  landing-footer|footer" e2e/*.ts`, 39 fichiers) : categories, golden-path,
  landing-auth-theme-toggle, landing-typography-hierarchy, products, settings-profile,
  sprint-42-events, sprint-61-archived-events, sprint-62-control-focus-contrast,
  sprint-62-select-focus-indicator, sprint-63-de-overflow-audit, sprint-66-mobile-keyboard,
  sprint-70-preview-visual, sprint-71-edit-preview-pinned, sprint-73-model-vs-rendered,
  sprint-73-tablet-sidebar, sprint-76-legal-visual, sprint-77-theme-visual,
  sprint-82-recurrence-capped-hint, sprint-84-section-titles, sprint-85-timeline-group-head,
  sprint-85-timeline-sidebar, sprint-85-timeline-toolbar, sprint-86-event-category,
  sprint-89-local-date-west, sprint-90-first-contact, sprint-91-edit-bounded-series-end-date,
  sprint-91-event-pin, sprint-91-recurrence-marks, sprint-92-business-toasts,
  sprint-92-product-detail-actions, sprint-92-products-next-event, sprint-93-restore-product,
  sprint-94-fullscreen-overlays, sprint-94-mobile-lane-gutter, sprint-94-modal-shortcuts,
  sprint-97-ink-faint-contrast, timeline-mobile, timeline.
  Joué avec `--ignore-snapshots` → **272 passed / 1 failed** en 2,1 min. L'unique échec =
  `sprint-77-theme-visual:620` « armement de la comparaison », qui échoue MÉCANIQUEMENT sous
  `--ignore-snapshots` (mémoire E2E §S78) — non imputable.
- Références visuelles `-linux` probablement impactées : **a priori aucune**. Les 10 références
  (`landing-hero`, `login`, `register`, `forgot-password`, `reset-password` × 2 thèmes) ne capturent
  ni le pied de page, ni un `Textarea`/`.mt-*` placeholder, ni un switch (les pages d'auth ont un
  test qui interdit `.text-ink-faint`). À confirmer par la CI Linux. `git status | grep darwin` : vide.
- `rtk proxy npx prettier --check <20 fichiers>` rc=0 ; `npm run lint` rc=0 ; `npm run typecheck`
  rc=0 ; `./scripts/test-quiet.sh frontend-unit` → **148 fichiers / 1881 tests OK** ;
  `./scripts/test-quiet.sh unit` (backend) → 632 tests OK.

## Non vérifié

- Pas de capture visuelle humaine du pouce de switch (`EventEditForm`) après passage à
  `rule-emphasis` : changement de teinte d'un cran, non couvert par une référence `-linux`.
- Firefox/WebKit : la nouvelle spec tourne sur le projet `chromium` seulement (config par défaut).
- Pages `settings` (AvatarUpload), `StateScreen` (404) et footer : migrées mais non mesurées par la
  nouvelle spec (couvertes par la garde statique uniquement).

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun changement de schéma ni de backend.
- Pas de RECOMMAND_SECURITY : changement purement visuel (couleurs CSS).
- Pas de RECOMMAND_TEST_RUNNER : E2E joué en local par l'agent (13 + 272 tests), CI Linux tranchera les captures.
- Pas de RECOMMAND_UI_DESIGN : décision de charte déjà prise par le dev ; seul arbitrage ouvert = le pouce de switch, documenté.
- RECOMMAND_FOLLOWUP: bordure AU SURVOL de `.mt-btn--secondary`, `.mt-iconbtn`, `.mt-select__trigger` passe de `rule-emphasis` (≥ 3:1) à `ink-faint` (2,75 / 2,56:1) — le survol AFFAIBLIT la limite fonctionnelle du contrôle (1.4.11) ; passer à `ink-muted` ou `ink` [triage XS | frontend/design].

## Mémoire

[MEMORY:decision] DEC-S97-001 — Context: `--color-ink-faint` (2,56–2,99:1) portait du texte (eyebrows, placeholders, compteurs) malgré `readme.md` qui le disait décoratif ; S85 avait contourné au cas par cas. Decision: token INCHANGÉ, réservé au non-textuel ; texte (placeholders compris) → `ink-muted` ; icônes/indicateurs de contrôle → `ink-muted` ou `rule-emphasis` ; décoratif (filets de mois, bordures de survol, scrollbar, pastille fantôme, icônes `aria-hidden` illustratives) → reste `ink-faint`. Why: le relever à 4,5:1 sur surface-2 exigerait ≈ `ink-muted` (#6C7079 / #82868B) → hiérarchie détruite. Garde-fous : `src/styles/__tests__/ink-faint-non-text.test.ts` (statique, liste blanche de 2 icônes `aria-hidden`) + `e2e/sprint-97-ink-faint-contrast.spec.ts` (rendu, 2 thèmes).

[MEMORY:pattern] Problem: `readTextRendering` (`e2e/support/contrast.ts`) lit `color` de l'élément, pas de `::placeholder`. Solution: garder son fond composité et remplacer l'encre par `getComputedStyle(el,'::placeholder').color` normalisée par canvas (cf. `sprint-97-ink-faint-contrast.spec.ts`). Anti-pattern: mesurer `color` d'un `<textarea>` vide et conclure sur le placeholder.

[MEMORY:pitfall] Context: contrôle négatif d'une spec de contraste contre `ink-faint` en sombre. Solution: `ink-faint` sombre sur `bg` = 3,20:1 — passe le seuil NON textuel (3:1) ; un consommateur icône mesuré sur `bg` ne rougit donc PAS en sombre. Prevention: pour un contrôle négatif 2 thèmes, inclure au moins un consommateur TEXTE (4,5:1) ou posé sur `surface`/`surface-2` en sombre.

STATUS: COMPLETED
