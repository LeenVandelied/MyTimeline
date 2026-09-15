# Arbitrage design — échelle typographique des `h2` de la landing (Sprint 49)

> Produit par l'agent `ui-design` (lecture seule) le 2026-07-28, après le rendu de #334.
> Débloque les critères 1 et 3 de **#334** et le critère n°8 de **#56**.
> Décision dev : corriger dans le sprint, avec arbitrage design préalable.

## VERDICT : APPROUVÉ — `text-lg md:text-xl` (27 → 35 px), **sous condition**

Classes exactes : `text-3xl font-bold md:text-4xl` → **`text-lg leading-tight font-bold md:text-xl`**

Tokens DS : `--text-lg: 27px`, `--text-xl: 35px` (`typography.css:16-17`).

- **27 px en mobile** = le seul palier DS laissant > 100 px de marge en allemand.
- **35 px à partir de `md`** = un cran DS sous le `h1` desktop (48 px).
- **`leading-tight` obligatoire** : Tailwind conserve son ratio par défaut pour `text-lg` (1.556 → 42 px
  d'interligne), non surchargé dans `globals.css` (aucun `--leading-*` exposé au `@theme` — vérifié).
- **Pas de palier `sm:`** : à 640 px le contenu fait 608 px et `text-xl` y tiendrait déjà, mais le pas
  typographique doit coïncider avec le pas de layout (`md:grid-cols-3/4`). `sm:text-xl` reste une
  variante bénigne si le dev la préfère.

## ⚠ CONDITION BLOQUANTE — sans elle, le `h2` passe SOUS son propre sous-titre

Les paragraphes d'accroche des mêmes sections sont en `text-xl` (**35 px**) : posés tels quels contre un
`h2` à 27 px en mobile, **ils deviennent plus gros que leur titre**.

**À démoter en `text-md md:text-lg` (21 / 27 px) :**

| Fichier | Ligne | Élément |
|---|---|---|
| `FeaturesSection.tsx` | 32 | lead `text-xl` |
| `HowItWorksSection.tsx` | 25 | lead `text-xl` |
| `TestimonialSection.tsx` | 24 | lead `text-xl` |
| `MobileAppSection.tsx` | 31 | lead `text-xl` |
| `CtaSection.tsx` | 41 | lead `text-xl` |
| `FeaturesSection.tsx` | 47 | `h3` de carte `text-xl font-bold` |
| `HowItWorksSection.tsx` | 36 | `h3` de carte `text-xl font-bold` |

Les `h3` de carte à 35 px seraient **égaux au `h2` en `md`** — même défaut.

**Échelle finale visée :** `h1` 36/48 > `h2` 27/35 > lead & `h3` 21/27.

## Budget à 375 px — CALCULÉ (pas estimé)

Méthode : `fontTools`, Archivo variable instancié `wght=700`, subset latin
(`frontend/.next/static/media/1a4aa50920b5315c-s.p.woff2`), upm 1000, **crénage non appliqué**.

Contenu disponible = 375 − 2×16 (`px-4` = `--space-4`) = **343 px**.

Mot insécable le plus large, `de` « Hauptfunktionen » : 456 px @57 → **216 px @27** → **280 px @35**.

**Calage de méthode :** le calcul donne 424 px pour `fr` « Fonctionnalités » @57 contre **437 px mesurés
par le dev de #334** → l'agent **sous-estime de ~3 %**, et le dit. Même corrigé : **222 px ≪ 343**.
Tient aussi à **320 px** (288 disponibles).

## Hiérarchie — un second défaut hors échelle, découvert au passage

`HeroSection` `h1` = `text-4xl md:text-5xl` → **hors échelle DS** (`--text-4xl` et `--text-5xl` absents) →
replis Tailwind **36 / 48 px**.

⇒ **Aujourd'hui, `h1` 36 px < `h2` 57 px en mobile : la hiérarchie est DÉJÀ inversée.**

Après changement : 36 > 27 (mobile) et 48 > 35 (`md`) → **hiérarchie rétablie sans toucher
`HeroSection`**.

## Inversion `md:text-4xl` — CONFIRMÉE

`typography.css` s'arrête à `--text-3xl: 57px` ; `globals.css:119-126` ne remappe que `2xs` → `3xl`.
Donc `text-4xl` retombe sur **36 px** (Tailwind) et `text-5xl` sur **48 px**.
Remède : supprimer `md:text-4xl`, utiliser `md:text-xl` (35 px, token DS).

## Hors périmètre — signalé, à ne pas absorber

- **Aucun** `text-4xl`/`text-5xl` hors `HeroSection`.
- `HeaderSection.tsx:54` — logo `md:text-3xl` = **57 px**, donc **logo > `h1` (48 px) au desktop**.
  À arbitrer séparément.
- `StateScreen.tsx:78,84` — `text-2xl` (45 px), **on-token, OK**.

## Risques à vérifier en navigateur (par le dev)

- **375 et 320 px** en `de` (« Hauptfunktionen », « transformieren? ») et `es` (« Características »).
- **768 px exact** : conteneur 736 px, la phrase `de` de `CtaSection` fait 730 px sur une ligne à 35 px —
  elle doit casser à l'espace, **à confirmer visuellement**.
- `CtaSection` : `text-accent-ink` sur `bg-accent` reste du « grand texte » WCAG (27 px gras > 18,66 px)
  → seuil **3:1** inchangé, mais **revérifier le ratio après #335**.
- Interligne effectif du `h2` après `leading-tight`.

## Incertitudes déclarées par l'agent (à ne pas masquer)

- **Rien mesuré en navigateur** — toutes les largeurs viennent des métriques de fonte, **crénage exclu**,
  `letter-spacing` supposé nul (aucun `--tracking-*` exposé au `@theme`).
- N'a pas vérifié **quel woff2 sert réellement en production** (plusieurs subsets Archivo dans
  `.next/static/media` ; subset latin upright retenu).
- N'a pas vérifié les `max-width` de `container` par breakpoint.
- `a11y-audit.md` **ne fixe aucune taille minimale de titre** (vérifié — il ne traite que focus, cibles
  tactiles et ARIA) → **27 px n'est contraint par aucune règle de charte écrite**.

## Note du lead

Le périmètre approuvé par le dev était « les 5 `h2` ». La condition bloquante l'étend à **12 éléments**,
mais dans les **mêmes 5 fichiers** et sur la même zone visuelle : sans elle, la correction produirait une
hiérarchie inversée, c'est-à-dire un défaut pire que celui qu'on corrige. Extension retenue.
