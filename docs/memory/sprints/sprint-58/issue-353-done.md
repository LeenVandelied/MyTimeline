# #353 — LanguageSelector : cible tactile et libellé français en dur

Sprint 58, vague 2. Branche `claude/sprint-58-start-26b185`.

## Ce qui a changé

| Fichier | Changement |
|---|---|
| `frontend/src/components/ui/language-selector.tsx` | `relative` + `::before` 44×44 centré (PAT-S24-002) sur le déclencheur ; `sr-only` passé à `t('navigation.changeLanguage')` ; pavé de commentaire documentant les mesures |
| `frontend/public/locales/{fr,en,es,de}/common.json` | ajout de `navigation.changeLanguage` (clé ajoutée EN FIN de `navigation`, aucune clé existante renommée ni réordonnée) |
| `frontend/src/components/ui/language-selector.i18n.test.ts` | garde-fou i18n (nouveau) |

Visuel du déclencheur INCHANGÉ : 36×36 px. Le pseudo est transparent et hors flux.
Aucun `ring-*` ni `outline-none` posé (cohérence #383 / arbitrage ui-design vague 0).

Valeurs i18n : `fr` « Changer de langue » · `en` « Change language » ·
`es` « Cambiar de idioma » · `de` « Sprache ändern ».

## Cible tactile — mesures navigateur (Chromium, `next dev`)

Méthode : `getComputedStyle(btn, '::before')` pour la boîte déclarée, **plus** une
recherche dichotomique sur `document.elementFromPoint()` depuis le centre du bouton
dans les 4 directions — donc la cible EFFECTIVE au hit-test, pas la géométrie déduite
des classes.

| Contexte | Largeur | Visuel | `::before` | Cible effective mesurée | Ancêtres clippants |
|---|--:|---|---|---|---|
| `HeaderSection` (landing, `fr`) | 1280 | 36×36 | 44×44 | **44,49 × 44,49** | aucun |
| `LandingMobileMenu` (`fr`) | 320 | 36×36 | 44×44 | **44,49 × 44,49** | aucun |
| `LandingMobileMenu` (`fr`) | 375 | 36×36 | 44×44 | **44,49 × 44,49** | aucun |
| `LandingMobileMenu` (`fr`) | 390 | 36×36 | 44×44 | **44,49 × 44,49** | aucun |
| `LandingMobileMenu` (`en`) | 375 | 36×36 | 44×44 | **44,49 × 44,49** | aucun |
| `/en/login` | 375 | 36×36 | 44×44 | **44,49 × 44,49** | aucun |
| `/es/login` | 375 | 36×36 | 44×44 | **44,49 × 44,49** | aucun |
| `/de/register` | 375 | 36×36 | 44×44 | **44,49 × 44,49** | aucun |
| `/fr/forgot-password` | 375 | 36×36 | 44×44 | **44,49 × 44,49** | aucun |

Les 0,49 px au-delà de 44 viennent du positionnement sous-pixel du bouton
(`left: 73,25 px` par exemple) et de la borne inclusive de `elementFromPoint` ; la
cible n'est jamais INFÉRIEURE à 44.

**Clipping (PIT PAT-S24-002).** La sonde remonte toute la chaîne d'ancêtres et
relève ceux dont `overflow-x`/`overflow-y` vaut `hidden|clip|auto|scroll`. Résultat :
**liste vide dans les 9 relevés ci-dessus**. Le pseudo déborde de (44−36)/2 = 4 px ;
`LandingMobileMenu` laisse `p-4` (16 px) et `AppShell` `p-3` (12 px) autour.

**Actionnabilité prouvée, pas seulement le hit-test.** `pointerdown` (Radix n'ouvre
pas sur `click` — cf. `e2e/landing-mobile-menu.spec.ts`) dispatché à x = 111,25 alors
que le bord droit du VISUEL est à 109,25 → `data-state="open"`, 4 items rendus. Le
clic porte donc bien hors du visuel 36 px.

**Piège rencontré.** `nextjs-portal` (l'overlay de `next dev`) recouvre le coin
inférieur gauche et capte `elementFromPoint` : première mesure à 0×0, faussement
alarmante. Artefact de dev uniquement — neutralisé par `nextjs-portal{display:none}`
avant mesure.

## Débordement horizontal — `scrollWidth` vs `clientWidth`

| Largeur | `documentElement` | `body` | `header` |
|--:|---|---|---|
| 320 | 320 / 320 (0) | 320 / 320 | 320 / 320 |
| 375 | 375 / 375 (0) | 375 / 375 | 375 / 375 |
| 390 | 390 / 390 (0) | 390 / 390 | 390 / 390 |
| 1280 | 1269 / 1269 (0) | — | — |

Mesuré sur le CONTENEUR (`documentElement` d'abord, puis descente), pas élément par
élément (PIT-S48).

Précision qui vide le risque annoncé par l'issue : dans `HeaderSection` le
`LanguageSelector` vit dans `<div className="hidden items-center gap-4 lg:flex">` —
il est **`display:none` sous 1024 px**. À 320/375/390 il n'est donc pas rendu dans le
header, et c'est `LandingMobileMenu` qui le porte. Par construction le pseudo est
`position:absolute` hors flux : il ne peut de toute façon pas participer au
`scrollWidth`.

Deux descendants débordent à 320 px — les cartes `feature-card` (429/286) et le
bouton des devtools TanStack. **Pré-existants et hors sujet** : porteurs d'un
`overflow-x` non `visible` (carrousel), et sans rapport avec le sélecteur.

## i18n — locales vérifiées AU RENDU

`fr` (landing header 1280 + panneau mobile 320/375/390 + `/fr/forgot-password`),
`en` (panneau mobile 375 + `/en/login`), `es` (`/es/login`), `de` (`/de/register`).
Soit 4 locales sur 2 familles de contextes (landing publique + pages d'auth).

## Tests

- Unitaires frontend : `./scripts/test-quiet.sh frontend` → **885/885, 94 fichiers**.
  Dont le nouveau `language-selector.i18n.test.ts` (10 tests) : clé présente et non
  vide dans les 4 locales, non-recopie du français en `en`/`es`/`de`, plus de chaîne
  FR en dur dans le composant, ordre des clés `navigation` figé.
- E2E : `landing-mobile-menu.spec.ts` → **26/26** (`CI=1`, `PLAYWRIGHT_BASE_URL=http://localhost:3000`,
  backend local `:8080` répondant). Inclut « sélecteur de langue : la locale active
  reste lisible ». Aucun `data-testid` ajouté — la spec cible
  `button[data-slot="dropdown-menu-trigger"]`, inchangé.
- `tsc --noEmit` : aucune erreur sur mes fichiers.

## Ce que je n'ai PAS vérifié

1. **`AppShell`, `MobileDrawer`, `dashboard/page.tsx`** — les 3 contextes applicatifs
   exigent une session authentifiée. Non ouverts. Leurs conteneurs (`p-3` / `p-4`)
   laissent plus que les 4 px nécessaires, mais **ce n'est pas une mesure**.
2. **`/fr/reset-password`** (5e page d'auth) — non ouverte (exige un jeton). Les 4
   autres pages d'auth le sont.
3. **`npm run build`** — NON lancé délibérément : il tue le `next dev` en cours
   (PIT-S47-005) et l'agent #352 mesurait au navigateur en parallèle. La conformité
   Tailwind de la chaîne de classes est en revanche prouvée au RUNTIME
   (`::before` calculé à 44px/44px, `content: ""`), ce qu'un build ne dirait pas mieux.
4. **Firefox / WebKit** — mesures Chromium uniquement. #375 (vague 3) couvre ces
   moteurs sur ce composant.
5. **Qualité linguistique des 4 traductions** — relues à la main, non validées par un
   locuteur natif ni par Crowdin.
6. **Thème sombre pour la géométrie** — non pertinent (aucune règle de thème ne touche
   la taille), donc non mesuré séparément.

## Signaux

- `[MEMORY:pattern]` PAT-S24-002 s'applique aussi hors CSS du DS, en utilitaires
  Tailwind : `relative` + `before:absolute before:top-1/2 before:left-1/2 before:h-11
  before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']`.
  Les variantes `before:` de Tailwind posent déjà `content: var(--tw-content)`, mais
  la déclaration explicite rend l'intention lisible. Anti-pattern : agrandir `h-9 w-9`,
  qui déplace le layout d'un header déjà contraint.
- `[MEMORY:pitfall]` Toute mesure de cible tactile par `elementFromPoint` sous
  `next dev` doit d'abord neutraliser `nextjs-portal` : l'overlay de dev capte le
  hit-test dans le coin inférieur gauche et fait conclure à une cible de 0×0.
- `[MEMORY:pitfall]` `computer{left_click}` du connecteur navigateur n'ouvre PAS un
  `DropdownMenu` Radix, même au centre exact du déclencheur (Radix ouvre sur
  `pointerdown`). Un « ça ne s'ouvre pas » observé par ce biais n'accuse pas le code
  testé — dispatcher un `PointerEvent('pointerdown')` pour trancher.

## Observations hors périmètre (non corrigées)

- `document.documentElement.lang` vaut `"fr"` sur `/en/login`, `/es/login` et
  `/de/register` : l'attribut `lang` du `<html>` n'est pas localisé. Un lecteur
  d'écran applique donc la prononciation française à des pages anglaises, espagnoles
  et allemandes — y compris à l'étiquette que cette issue vient de traduire. Défaut
  a11y distinct (WCAG 3.1.1), à traiter à part.
- `frontend/e2e/zz-measure-352.spec.ts` (fichier non suivi de l'agent #352, en cours)
  porte une erreur `tsc` : `categoryId` manquant l. 90. À supprimer ou corriger avant
  la PR, sinon le typecheck CI rougit.

STATUS: COMPLETED
