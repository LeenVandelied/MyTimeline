# Absorption — solder les 2 AC manquants de #348 — Sprint 59

commits: `9b1cb39`
fichiers: `frontend/src/components/landing/FooterSection.tsx`,
`frontend/src/components/landing/HowItWorksSection.tsx`,
`frontend/e2e/landing-typography-hierarchy.spec.ts`
sentinel briefing: `SENTINEL-SPRINT59-ABSORB-HDNL2` ✅ (contexte bien reçu)

## Les deux corrections

| Élément | Avant | Après | Motif |
|---|---|---|---|
| Wordmark footer (`FooterSection.tsx:38`) | `text-2xl` (45 px, toutes largeurs) | **`text-md sm:text-lg`** (21/27) | Aligné sur le header (#381). **Pas de `whitespace-nowrap`** : mesuré inutile, 1 ligne dès 320 px dans les 4 locales. |
| Chiffre d'étape (`HowItWorksSection.tsx`) | `text-lg` (27 px) | **`text-sm md:text-md`** (17/21), `leading-none` conservé | Seul candidat **strictement** inférieur au h3. |

### L'arbitrage du chiffre d'étape a été tranché par la mesure, contre l'hypothèse du briefing

Le candidat `text-md md:text-lg` (21/27) proposé par #348 a été **rejeté** : il **égale** le h3
(21/27), or l'AC exige « strictement ».

La contrainte physique invoquée contre `text-sm md:text-md` — « trop petit, le chiffre flotte dans
la pastille de 64 px » — **ne tient pas, et c'est mesuré** : décentrage `dx = dy = 0,00 px`,
remplissage 26,6 % / 32,8 % de la pastille. `flex items-center` centre la boîte de ligne quelle que
soit sa taille.

## Les deux dérogations de spec ont été RETIRÉES

C'était le cœur de la mission — une spec qui déroge encode le défaut et le rend permanent :

- Le `<footer>`, qui était **exclu du balayage** « plus grand élément de la page », est **réintégré**
  au balayage page-entière.
- Le chiffre d'étape, figé en `<=` sous `md`, est passé en **`<` strict vs h3 ET vs h2, à tous les
  paliers**.

Ajouts à la spec : largeurs **639 / 640** (le seul seuil `sm` du sprint) et relevé
wordmark / description / nombre de lignes.

`frontend/src/__tests__/ds-type-scale.test.ts` a été lu : **aucune liste d'exceptions**, inchangé.

## Mesures (jammy v1.61.1, 8 largeurs × 4 locales × 2 thèmes)

| palier | h1 | h2 | h3 | chiffre | wordmark footer | max de la page (**footer inclus**) |
|---|---|---|---|---|---|---|
| 320 / 375 | 35 | 27 | 21 | **17** | **21** (1 ligne) | **35 = h1** ✓ |
| 639 | 35 | 27 | 21 | 17 | 21 | **35 = h1** ✓ |
| 640 | 35 | 27 | 21 | 17 | **27** | **35 = h1** ✓ |
| 768 / 1023 | 45 | 35 | 27 | **21** | 27 | **45 = h1** ✓ |
| 1024 / 1280 | 57 | 35 | 27 | 21 | 27 | **57 = h1** ✓ |

Interlignes : h1 1.08, sous-titre 1.5, chiffre 1.0. Description du footer 15 px (< wordmark).

**Avant :** le footer rendait 45 px à toutes largeurs → il **battait** le h1 de 320 à 767 px et
l'**égalait** de 768 à 1023 px.

**Les 5 AC de #348 sont désormais réellement atteints, footer compris.**

## Non-vacuité — 3 mutations, rouges nommés

- **(A)** `text-2xl` + `text-lg` réintroduits → **16/16 rouges**
  (« mesuré 45px sur `div.text-accent…text-2xl` », « chiffre 27px vs h3 21px »).
- **(B)** Candidat rejeté `text-md md:text-lg` → rouge « 21px vs h3 21px, **égalité = échec** ».
- **(C)** Sans `leading-none` → ratio dérive à 1.4286.

## Tests

**82 E2E landing verts** (jammy) · **888 unitaires / 95 fichiers** · `tsc --noEmit` 0 erreur

## non_couvert

- jammy ≠ runner `ubuntu-latest` (jeu de polices proche, **pas identique**). **CI réelle non
  lancée.**
- Mesuré sur `next dev` / Turbopack, **PAS sur `next build`**.
- **Chromium seul.**
- **Aucun jugement esthétique sur le 17 px** — géométrie seulement, **pas de validation `ui-design`
  de cette valeur**.
- **Contraste WCAG du chiffre non re-mesuré.**
- Serveur `:3100` préexistant (lancé par un agent antérieur) ; fraîcheur du HMR validée
  **indirectement**, par les deltas avant/après.
- Usage de `FooterSection` **hors landing** non re-vérifié par `grep` (le JSDoc le dit landing-only).

## [MEMORY:*]

- **[MEMORY:pattern]** **Une spec qui fige `<=` ou qui exclut une zone encode le défaut et le rend
  permanent.** Une dérogation est une **dette datée**, à lever en même temps que l'AC qu'elle
  contourne. Anti-pattern rencontré ici : exclure le `<footer>` du balayage « plus grand élément »
  pour faire verdir la spec.
- **[MEMORY:decision]** Chiffre d'étape de #348 → `text-sm md:text-md` (17/21). Motif : seul
  candidat **strictement** inférieur au h3. La contrainte « pastille 64 px » invoquée contre lui
  **ne tient pas** — décentrage mesuré 0,00 px, `flex items-center` centre la boîte de ligne quelle
  que soit sa taille.
- **[MEMORY:pitfall]** Sonde E2E jammy lancée après un `cd frontend` : `-v "$PWD:/work" -w
  /work/frontend` monte alors `frontend` → **« No tests found »**, qui n'est **pas** une erreur de
  spec. Prévention : monter la **racine** en chemin absolu, jamais `$PWD` après un `cd`.

## Recommandations suite

- `RECOMMAND_UI_DESIGN` : **ratifier le 17 px** (mobile) du chiffre d'étape — choix **imposé par
  l'AC**, jamais arbitré par le designer.
- `RECOMMAND_FOLLOWUP` : le wordmark du footer est un `<div>`, **pas un lien vers l'accueil** —
  **même écart** que le logo du header déjà en follow-up. **Élargir ce follow-up aux deux sites**
  plutôt qu'en ouvrir un second. [triage XS]
- `RECOMMAND_TEST_RUNNER` (informatif) : suite unitaire à 888 tests, au-dessus du seuil de 500 du
  briefing (15 s, non bloquant aujourd'hui).

STATUS: COMPLETED
