# Issue #348 — hiérarchie typographique de la landing — Sprint 59, vague 3

commits: `860b0b0`
fichiers: `frontend/src/components/landing/HeroSection.tsx`,
`frontend/src/components/landing/HowItWorksSection.tsx`,
`frontend/e2e/landing-typography-hierarchy.spec.ts` (nouveau),
`frontend/src/styles/ds/__tests__/ds-type-scale.test.ts` (nouveau, garde-fou source)
sentinel briefing: `SENTINEL-SPRINT59-348-RQZW9` ✅ (contexte bien reçu)

## Ce qui a changé — 3 classes, 2 fichiers

| Élément | Avant | Après |
|---|---|---|
| `HeroSection.tsx:59` — h1 | `text-4xl md:text-5xl` | `text-xl md:text-2xl lg:text-3xl` |
| `HeroSection.tsx:62` — sous-titre | `text-xl` | `text-md md:text-lg leading-normal` |
| `HowItWorksSection.tsx:34` — chiffre d'étape | `text-2xl` | `text-lg leading-none` |

**Le seul site `4xl`/`5xl` du dépôt est supprimé** — l'AC reformulée est tenue.
**`typography.css` n'a PAS été touché**, conformément au verdict `ui-design`.

Deux verrous ajoutés : `landing-typography-hierarchy.spec.ts` (tailles **et interlignes** rendus,
6 paliers × 4 locales × 2 thèmes) et `ds-type-scale.test.ts` (garde-fou au niveau du source).

## Mesures (jammy v1.61.1, px rendus ; ×N = ratio de line-height)

| palier | h1 | sous-titre | h2 | h3 | chiffre |
|---|---|---|---|---|---|
| 320 / 375 | 35 ×1.08 | 21 ×1.5 | 27 | 21 | 27 ×1 |
| 768 / 1023 | 45 ×1.08 | 27 ×1.5 | 35 | 27 | 27 ×1 |
| 1024 / 1280 | 57 ×1.08 | 27 ×1.5 | 35 | 27 | 27 ×1 |

Identique dans les 4 locales et les 2 thèmes.

**Avant correctif, mesuré au navigateur :** h1 = 36 px @320 / 48 px @1280 — les **défauts
Tailwind** — et chiffre d'étape 45 px **> h1 36 px**. **L'inversion de hiérarchie est confirmée par
la mesure**, pas seulement déduite.

### Point laissé ouvert par `ui-design` — TRANCHÉ

**`lg:text-3xl` TIENT, pas de repli sur `lg:text-2xl`.** À 1280 px en `de` : boîte h1 584 px dans
une colonne de 624 px, 3 lignes, `scrollWidth <= clientWidth` partout. À 1024 px en `de` : 456/496,
3 lignes. Mobile `de` : 3 lignes à 320 et 375 (`fr` 3/2, `en` 2/2, `es` 2/2).
**0 débordement de page, tous paliers.**

## Non-vacuité prouvée deux fois

1. Classes fautives réintroduites → **14/14 rouges**, messages nommés
   (« h1 rend 36px … HORS échelle DS », « chiffre 45px vs h2 27px ») + garde-fou source rouge.
2. `leading-*` seuls retirés, tailles inchangées → les ratios dérivent à **1,5556** sur `<p>` et
   `<span>`. **Le piège du briefing est réel et mesuré**, pas théorique.

## Tests

`tsc --noEmit` OK · eslint OK · prettier OK · vitest **888/888** ·
E2E landing complet **78/78** en jammy v1.61.1 (image alignée sur la version `@playwright/test`)

## ⚠ DEUX CRITÈRES D'ACCEPTATION NON ATTEINTS — assumés et documentés

### AC #2 « le h1 reste l'élément le plus grand de la page » — FAUSSE, cause hors périmètre

`FooterSection.tsx:38` rend « Ma Timeline » à **45 px à toutes les largeurs**. Il **bat donc le h1**
sous 768 px (35 px) et l'**égale** entre 768 et 1023 px.

**Déjà vrai avant ce commit** (le h1 rendait 36 px) — ce n'est pas une régression introduite ici.
Le `<footer>` est **explicitement exclu** du balayage de la spec, exclusion commentée et chiffrée
dans le fichier.

### AC #1 « strictement plus petit » — écart assumé sous `md`

Sous `md`, le chiffre d'étape (27 px) **ÉGALE** le h2 (27 px) — pas « strictement inférieur » — et
**DÉPASSE** le h3 de sa propre étape (21 px). Le verdict `ui-design` a été appliqué tel quel ; la
spec fige `<=` sous `md` et `<` strict au-dessus.

**→ `RECOMMAND_UI_DESIGN` émis pour trancher.** Candidat proposé : `text-md md:text-lg` (21/27).

## non_couvert

- jammy ≠ `ubuntu-latest` GitHub (jeu de polices possiblement différent). **CI jamais exécutée,
  rien poussé.**
- **Chromium seul.** Firefox et WebKit non mesurés.
- **Contraste non re-mesuré au navigateur**, calculé sur les tokens seulement. Le sous-titre passe
  **sous le seuil WCAG « grand texte » (24 px) à 21 px**, son exigence monte donc de 3:1 à **4,5:1**.
  `ink-muted` donne 5,96:1 en clair / 6,26:1 en sombre ⇒ conforme — mais **opacité et
  superpositions non vérifiées**.
- **Aucun jugement esthétique** : des nombres ont été mesurés, aucune capture n'a été relue.
- Le JSDoc de `HeaderSection` chiffrant des largeurs à `md:text-3xl` (risque n°1 de l'arbitrage
  `ui-design`) : hors périmètre ici, **non vérifié**.

## [MEMORY:*]

- **[MEMORY:pitfall]** Tailwind 4 + échelle DS custom : `text-4xl`/`text-5xl` absents de
  `@theme inline` **ne sont PAS inertes** — ils servent les **défauts Tailwind** (36/48 px), donc
  **plus petit** que `text-3xl` (57 px). Solution : interdire au-delà de `3xl` par un test au niveau
  du source. Prévention : toute taille se **mesure au navigateur**, jamais depuis le nom de classe.
- **[MEMORY:pattern]** `base.css:53` ne couvre que `h1..h6`. Tout `text-*` posé sur un `<p>` ou un
  `<span>` exige un `leading-*` **explicite**, sinon `--text-lg--line-height` = 1,5556 reprend la
  main. Anti-pattern : asserter `font-size` **sans** `line-height` — ça laisse passer la moitié du
  défaut.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` : `FooterSection.tsx:38` — wordmark `text-2xl` (45 px) bat le h1 sous `lg` et
  vaut 1,7× le logo du header (27 px). **Casse l'AC #2 de #348**, hors périmètre. [triage XS]
- `RECOMMAND_UI_DESIGN` : trancher le chiffre d'étape sous `md` — 27 px égale le h2 et dépasse le h3
  de son étape ; candidat `text-md md:text-lg` (21/27). [triage XS]

STATUS: COMPLETED
