# Issue #72 — i18n : formats dates/nombres localises (Intl)

**Commit :** `afd164c` — 12 fichiers, +368/-19, frontend uniquement
(verifie par le lead : 0 fichier `backend/`, `package.json` et `package-lock.json`
non touches, working tree propre apres coup).

## Perimetre reellement traite

L'enonce de l'issue etait perime (il decrivait un code formatant les dates via
`dayjs`). Le briefing a reduit le perimetre au reste reel. L'agent a confirme
l'inventaire du lead et l'a **etendu** : `KpiMarginalia.tsx:26`, `StateScreen.tsx:77`
et le filtre `all` de `ProductDetailView` s'ajoutaient aux points identifies.

### Livre
- `Intl.NumberFormat` introduit : `ProductList:61`, `ProductCarousel:81`,
  `KpiMarginalia` (x3, `locale` passee en prop pour rester homogene avec les autres
  composants dashboard — `dashboard/page.tsx:216` recable), `DensityRibbon` (x2,
  dans des `title`), `ProductDetailView` (x3 compteurs de filtre).
- Classes DS : `.mt-num` sur `ProductList`, `ProductCarousel`, `KpiMarginalia`,
  `StateScreen` ; `.mt-date--long` sur les 2 seules balises `<time>` du frontend.

### Ecarte, avec raison (demande explicitement par le briefing)
- `StateScreen.tsx:77` `{code}` — pas de `NumberFormat`. Le champ est type
  `code?: string` et documente « Code HTTP. Non localise ». Un `1000` deviendrait
  `1 000` / `1,000` / `1.000` : faux pour un identifiant. `.mt-num` appliquee malgre
  tout (mono + tabular deja equivalents, gain net = isolation bidi).
- `.mt-date--short` — **non appliquee nulle part**. Elle impose `uppercase` + `11px`,
  et son format cible DS « MER 24 JUIN » n'est pas atteignable par CSS seul : le
  rendu actuel « mer. 24 » tient au `weekday:'short'` de `Intl` en fr, pas au style.
  C'est un arbitrage Designer, pas une decision d'implementation. → follow-up.
- Compteurs de filtre `ProductDetailView` : `NumberFormat` oui, `.mt-num` non
  (basculerait le seul nombre en mono dans un libelle d'onglet en police de texte).

### Delta visuel assume — 1 seul, non verifie en navigateur
`EventPreviewTimeline:243` : le `<time>` heritait `text-xs` (15px) de la legende,
`.mt-date--long` le fixe a 13px. `WeekAgenda` : zero delta (13px == `--text-2xs`,
prouve par test). Le `white-space:nowrap` ajoute dans un conteneur `w-16` (64px)
est estime tenable en fr/en/es/de (« mer. 24 » ~55px a 13px mono) — **estimation,
pas mesure**.

## Tests

- `./scripts/test-quiet.sh frontend` : **106 fichiers / 1168 tests, 0 echec**.
- `npx tsc --noEmit` : 0 erreur. `npx next lint` : 0 warning. `prettier --check`
  sur les 12 fichiers : OK.
- Deux fichiers de test ajoutes : `dashboard/intl-formats.test.tsx` (+164),
  `styles/__tests__/i18n-intl-classes.test.ts` (+140).

## Ce qui n'a PAS ete verifie

- **E2E Playwright non executes** sur ce diff.
- **Aucune verification navigateur** : ni le delta 15→13px d'`EventPreviewTimeline`,
  ni le `nowrap` dans le `w-16` de `WeekAgenda` en `de` (la locale la plus longue).
- `br-events.md` non lu par l'agent (perimetre purement presentationnel, aucune
  regle metier touchee) ; `pit-frontend.md` lu par grep cible uniquement.

## Signaux memoire

- `[MEMORY:pitfall]` — En fan-out sur working tree partage, la suite frontend est
  sortie rouge (4 tests / 1 fichier) pendant que l'agent de #142 editait
  `authService.ts` dans le meme arbre ; verte au re-run isole. Un run de tests n'est
  valable que si `git status` est stable de bout en bout. Corollaire direct de
  « Etiquette pre-existant ».
- `[MEMORY:pattern]` — Prouver qu'une classe DS remplace des utilitaires Tailwind
  sans delta, sous jsdom qui n'applique aucune feuille : compiler la vraie chaine CSS
  avec `@tailwindcss/postcss` et asserter sur l'AST (rang de layer + proprietes
  declarees). Anti-pattern : `expect(el).toHaveClass('mt-num')` — la classe y etait
  deja, et jsdom ne dit rien de la cascade.
- `[MEMORY:decision]` — `.mt-date--long` retenue plutot que `--short` sur les `<time>`
  (13px, casse preservee) : `--short` change casse ET taille, et son format cible
  exige de changer les options `Intl`.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` : ~15 composants rendent des dates dans un `<span>` au lieu
  d'un `<time datetime>` (`ProductDetailView:401`, `ProductsListView:295`,
  `SessionList`, `ExportDataFlow`, `CompactAgenda`, drawers timeline...). Convention
  DS §7 non respectee + perte semantique/a11y. [M | frontend]
- `RECOMMAND_FOLLOWUP` : arbitrage Designer sur `.mt-date--short` — format DS
  « MER 24 JUIN » (uppercase 11px + options `Intl` adaptees) ou classe laissee
  inutilisee. [S | design]
- `RECOMMAND_FOLLOWUP` : verification navigateur du delta 15→13px et du `nowrap`
  en `de`. [XS | frontend]
- `RECOMMAND_TEST_RUNNER` : E2E Playwright non lances sur ce diff.

STATUS: COMPLETED
