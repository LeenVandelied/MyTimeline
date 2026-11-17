# Issue #339 — h1..h6 layerisé dans `@layer base` (Sprint 53, Vague 1)

**Commit :** `40665fc` — `:bug: fix(ds): layerise h1..h6 dans @layer base — les mb-*/font-* cessent d'être annulés (#339)`
**Volume :** 3 fichiers, +199 / −8
**Ancrage :** `2966994` (origin/dev)

## Ce qui a été livré

| Fichier | Changement |
|---|---|
| `frontend/src/styles/ds/tokens/base.css` | `h1..h6` (5 propriétés) déplacée **en bloc** dans `@layer base`. Commentaire de cascade étendu + inventaire de ce qui **reste** hors layer dans le fichier. |
| `frontend/src/styles/globals.css` | 5 `--leading-*` ajoutées au bloc `@theme`. |
| `frontend/src/styles/__tests__/base-layer.test.ts` | +3 tests AST (142 lignes). |

`FooterSection.tsx` **non modifié** — les 3 `<h4>` (43, 63, 78) sont débloqués par le seul CSS.

## Ce que le test AST prouve réellement

1. Sur la compilation PostCSS réelle, la règle DS `h1..h6` — **discriminée par `--font-display`**, pour
   ne pas la confondre avec le preflight Tailwind qui porte le même sélecteur — sort dans `@layer base`,
   `margin: 0` compris.
2. Une fixture régressée est bien détectée hors layer (le détecteur ne passe pas à vide).
3. `.leading-tight` émet `line-height: var(--leading-tight)` et la déclaration **gagnante** (résolution
   de précédence de layers implémentée dans le test) vaut `1.08`.

**Ce qu'il ne prouve pas :** aucun rendu, aucune géométrie. Que `mb-3` fasse 12 px à l'écran relève de
l'œil ou de l'E2E.

**Vérifié par MUTATION** (et pas seulement par un vert) : dé-layeriser `h1..h6` → 1 test rouge ; retirer
le mapping `--leading-*` → assertion 3 rouge. Restaurés, verts.

## ⚠ Deux faits du briefing INFIRMÉS par la mesure — erreurs du lead

1. **FAIT #5 FAUX.** Le lead affirmait que `leading-tight` appliquait 1.25 (défaut Tailwind) et que le
   mapping `--leading-*` était la « condition de non-régression ». **Mesuré : il rendait déjà 1.08.**
   `ds/tokens/typography.css` déclare `--leading-*` dans un `:root` **hors layer**, homonyme du
   namespace de thème Tailwind 4 ; Tailwind émet ses défauts dans `@layer theme` ; **hors layer bat tout
   layer** → le token DS gagnait déjà. La décision (b) est donc un **NO-OP sur le rendu**.
   Elle a été **appliquée quand même** (valeur d'assurance pour #340, cf. piège 5), mais les
   commentaires de code ont été réécrits : laisser la justification fausse aurait empoisonné #340.
2. **COROLLAIRE.** La décision (c) et son follow-up « mapper `--tracking-*` » reposaient sur la même
   prémisse fausse. Mesuré : `--tracking-widest` = 0.16em, `--tracking-wide` = 0.06em,
   `--tracking-tight` = −0.02em **résolvent déjà** sur les tokens DS. Les « 11 sites hors titre
   impactés » annoncés par le lead **ne bougeraient pas**. Le paragraphe correspondant a été retiré de
   `base.css`, il était factuellement faux.
3. Rectif mineure : **6** `leading-tight` en landing, pas 7.

**Confirmés :** règle fautive lignes 21-27 hors layer · `FooterSection` h4 en **43/63/78** (pas 41,
dérive de ligne de l'issue confirmée) · `@theme` sans `--leading-*`/`--tracking-*` ·
`--leading-none` == 1 == défaut Tailwind · `font-bold`/`font-semibold` sans dérive
(`--font-weight-*` ≠ `--weight-*`, pas de collision).

## Méthode de layerisation — patron transmis à #340 (Vague 2)

1. **Patron d'assertion AST** : `layersOf(root, selecteur, /regex-declaration/)` puis
   `expect(chain).toContain('base')`. **La regex de déclaration est OBLIGATOIRE** : Tailwind émet son
   preflight sous le **même** sélecteur `h1, h2, h3, h4, h5, h6`. Sans discriminant (`--font-display`),
   le test passe sur le reset Tailwind et ne prouve rien.
2. Comparaison de sélecteur : `rule.selector.trim() !== selector`, chaîne **exacte**. La sortie
   normalise en `h1, h2, h3, h4, h5, h6` (virgule + espace).
3. **Mémoïsation PostCSS confirmée** : chaque fixture témoin exige un `from` **unique**
   (`__heading-regression__.css` distinct de `__cascade-regression__.css`). Chemin virtuel dans
   `src/styles/` → les `@import './ds/...'` relatifs résolvent sans écrire de fichier.
4. **Ordre des layers mesuré** : `theme, base, components, utilities`. Hors layer bat **tout**.
   `base` bat `theme`.
5. **⚠ PIÈGE MAJEUR POUR #340** — `ds/tokens/*.css` déclare `--leading-*` / `--tracking-*` / `--text-*`
   dans un `:root` **hors layer**, avec les **mêmes noms** que le namespace de thème Tailwind 4. C'est
   ce hors-layer qui fait gagner les tokens DS contre `@layer theme`. **Si #340 layerise ces `:root`
   dans un layer situé avant `theme`, toute l'échelle typographique du produit bascule silencieusement
   sur les défauts Tailwind.** Les mapper dans `@theme` d'abord, ou les laisser hors layer sciemment.
6. **Toujours valider par mutation** (dé-layeriser, relancer, exiger le rouge). Un test AST vert ne dit
   pas qu'il détecte quoi que ce soit.
7. `tsc` n'est pas couvert par vitest : `walkDecls(prop, d => arr.push(...))` casse
   (`number` vs `false | void`). Corps à accolades obligatoire. Lancer `npx tsc --noEmit`.

## Surfaces à vérifier au navigateur (clair + sombre) — À FAIRE PAR LE LEAD

1. **Dashboard — bascule display → MONO** (changement de famille, le plus visible) : `KpiMarginalia`,
   `ProductList`, `ProductCarousel`, `WeekAgenda`, `CompactAgenda`.
2. **Landing `FooterSection`** — 3 `<h4>` : graisse 600 → 700 + `mb-3` (12 px) s'active. Cas de l'issue.
3. **Landing `HeroSection`** — `mb-6` (24 px) s'active + 700. `leading-tight` doit **rester** à 1.08.
4. `products/ProductDetailView` (211, 225) — mono + `mb-2`.
5. Landing `CtaSection` / `HowItWorks` / `Testimonial` / `MobileApp` / `Features` — graisse + marge.
6. `settings/ProfileSection:100`, `SecuritySection:95,177` — 600 → 500 + `mb-2`/`mb-3`.
7. **Témoins qui NE doivent PAS bouger** : `AccountSection:50`, `DeleteAccountSteps:47,79`,
   `PreferencesSection:54`, `StateScreen:84`, `ProductsListView:148`, `CategoriesView:77`,
   `mobile/BottomSheet:124`, + drawers timeline (classes `.mt-*`, neutres).

## Tests

| Commande | Résultat |
|---|---|
| `npx vitest run src/styles/__tests__/` | **25 passed / 0 failed** (`base-layer.test.ts` : 5 = 2 + 3) |
| mutation A (`h1..h6` dé-layerisée) | 1 failed / 4 passed → restauré, vert |
| mutation B (mapping `--leading-*` retiré) | assertion 3 rouge → restauré, vert |
| `./scripts/test-quiet.sh frontend` | 92 fichiers, **828 passed / 0 failed**, 13,7 s |
| `npx tsc --noEmit` | 0 erreur |
| `eslint` / `prettier --check` | 0 / OK |
| `npx next build` | Errors 0, Warnings 2 (pré-existants, **non lus**) |

## NON VÉRIFIÉ (réserves explicites du fullstack-dev)

- **Aucun rendu navigateur. Zéro pixel constaté.** Tout « ce qui bouge » ci-dessus vient du verdict
  `ui-design`, **pas** d'une mesure. Ni les ~38 titres ni les témoins n'ont été regardés.
- `mb-3` = 12 px non vérifié ; absence de double espacement en conteneur flex/gap non vérifiée
  (repose sur l'affirmation `ui-design`).
- **Thème sombre non vérifié du tout.**
- Aucun E2E lancé. Aucune suite backend (0 fichier backend touché).
- Les 2 warnings `next build` : non lus, non diagnostiqués.
- `time, .mono, [data-mono]` de `base.css` **reste hors layer** (hors périmètre #339). Impact constaté
  aujourd'hui nul (seul site `EventPreviewTimeline.tsx:203` pose `font-mono`, même valeur). Documenté
  en commentaire, à reprendre en #340.
- Le mapping `@theme inline` émet `--leading-tight: var(--leading-tight)` (auto-référence). Inerte tant
  que le `:root` DS hors layer gagne ; si ce `:root` disparaissait → cycle, valeur invalide. Même
  schéma que les 40+ `--color-*` déjà en place (pas une régression introduite), **cas limite non testé**.

## Signaux mémoire

**[MEMORY:pitfall]** Tailwind 4 + tokens DS homonymes. Un `:root` **hors layer** déclarant
`--leading-*`/`--tracking-*`/`--text-*` écrase les défauts Tailwind (`@layer theme`) sans que rien ne le
signale. Lire l'absence d'une clé dans `@theme` et en conclure « le défaut Tailwind s'applique » est
**FAUX** quand le DS squatte le même nom de variable. *Prévention :* ne jamais déduire une valeur
effective de la lecture de `@theme` seul — compiler via PostCSS et résoudre la précédence de layers
(`winningRootVar` dans `base-layer.test.ts`).

**[MEMORY:pattern]** Prouver qu'une règle CSS est layerisée : compiler la vraie chaîne
(`globals.css` + plugin Tailwind), asserter sur l'AST + fixture témoin à `from` unique + validation par
mutation. *Anti-pattern :* test RTL sur `className` — les classes sont déjà là avant le correctif, jsdom
ne résout pas `@layer` → faux filet.

**[MEMORY:decision]** Mapping `--leading-*` dans `@theme` conservé bien que **mesuré NO-OP** sur le
rendu. *Pourquoi :* assurance contre #340 (si les `:root` de tokens entrent dans un layer avant `theme`,
toute l'échelle typo bascule sur les défauts Tailwind) + explicitation du pont DS → Tailwind.
Justification d'origine (« sinon 1.08 → 1.25 ») **corrigée dans le code**.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — **ANNULER / REQUALIFIER** le follow-up « mapper `--tracking-*` » proposé par le
  lead. Mesuré **sans effet visuel** : les 11 sites annoncés ne bougeraient pas. Si créé quand même :
  taille **XS, purement cosmétique** (cohérence de déclaration), **pas** un correctif — et surtout pas
  présenté comme une correction de dérive visuelle.
- `RECOMMAND_FOLLOWUP` — layeriser `time, .mono, [data-mono]` de `ds/tokens/base.css`.
  **À absorber dans #340** plutôt qu'en issue séparée.
- **PAS** de `RECOMMAND_TEST_RUNNER` : suite frontend lancée en entier (828 tests, 13,7 s), très en deçà
  du seuil de 3 min.
- **PAS** de `RECOMMAND_UI_DESIGN` : l'arbitrage design était déjà rendu, rien n'a été rouvert.
- **VÉRIFICATION NAVIGATEUR PAR LE LEAD REQUISE, non négociable** — pitfall « CI verte ≠ page correcte »
  (S48). CI verte + zéro pixel vu = exactement la configuration qui a livré 2 CTA invisibles au S48.

STATUS: COMPLETED
