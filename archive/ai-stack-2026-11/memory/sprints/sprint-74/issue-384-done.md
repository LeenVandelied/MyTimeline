# Issue #384 — [BUG] FeaturesSection : double lévitation au survol, −18 px au lieu de −10

Sprint 74, vague 1 (parallèle). Taille XS. `epic:design` / `priority:P3`.

## Commit

- `ecc76c2` — 3 fichiers (`FeaturesSection.tsx`, `FeaturesSection.test.tsx`, `landing.css`)

## Ce qui a changé, et pourquoi cette option plutôt que l'autre

`FeaturesSection.tsx:64` — retrait de `hover:-translate-y-2` **et** de la classe `transform`
nue. Option retenue : **garder la règle CSS, retirer l'utilitaire.**

Les deux options de l'issue n'étaient pas équivalentes :
- `-translate-y-2` vaut **−8 px**, pas les −10 px que l'issue pose comme cible ;
- supprimer `transform: translateY(-10px)` de la feuille aurait laissé **orphelin le palier
  responsive** `landing.css:168` (`-5px` sous 768 px), soit 3 éditions et un changement de
  valeur non demandé au lieu d'une suppression ;
- la feuille reste propriétaire du mouvement chez `.testimonial-card` → cohérence.

**Prémisse de l'issue confirmée à la source** : `frontend/node_modules/tailwindcss/dist/
chunk-UR7WNMYR.mjs` (Tailwind 4.1.1) mappe `-translate-y-2` sur
`["translate","var(--tw-translate-x) var(--tw-translate-y)"]` — c'est bien la propriété
`translate`, pas `transform`. Les deux se composent, la cascade ne les départage jamais.

### Point 1 du briefing — la classe `transform` nue

**Morte, retirée.** Vérifié à la source : bare `transform` compile vers
`transform: var(--tw-rotate-x) … var(--tw-skew-y)` avec des défauts `rotateX(0) … skewY(0)`,
soit une identité. Aucune utilitaire `rotate-*`/`skew-*` n'est posée sur cet élément, et le
contexte d'empilement + bloc conteneur viennent déjà de `.card-gradient-border`
(`position:relative; z-index:0`, `animations.css:46`). Aucun descendant `position:fixed`.

### Point 2 du briefing — `PIT-S66-002` ne s'applique pas ici

`transition-all duration-300` est **conservée** : elle nomme explicitement
`transition-property: all`, ce n'est pas une `duration-*` orpheline. De plus, l'audit #340 §3.5
mesure que le raccourci hors layer `transition: all .3s ease` de `.feature-card` bat ces
longhands. La propriété animée après correctif reste `transform`, couverte par `all` → pas de
saut sec attendu. **Déduit de la cascade, non mesuré au navigateur** (cf. NON vérifié).

### Point 3 — palier responsive

Laissé sur `transform` (`landing.css:166-172`), donc opérant. Commentaires « propriétaire
unique » + interdiction de layeriser (`PIT-S53-004`) ajoutés aux deux blocs.

### Point 5 — `.testimonial-card` : tranché par la négative

`TestimonialCard.tsx:42` porte `testimonial-card bg-surface border-rule shadow-lg`, **sans
aucune utilitaire `translate-*`**. Pas de cumul, rien à corriger, aucun follow-up.

## Tests écrits

`FeaturesSection.test.tsx` — 3 tests : absence d'utilitaire `translate-*` sur les 3
`.feature-card`, **présence** de la règle CSS (sans cette contrepartie, supprimer l'effet des
deux côtés serait vert), et témoin anti-vacuité. Détecteur ciblé sur la propriété `translate`
seule — regex écrite d'après le CSS réellement lu, pas par réutilisation d'un matcher existant
(`PIT-S63-010`).

## Vérifié (commandes réellement exécutées)

- `git rev-parse --abbrev-ref HEAD` → `sprint/74`, cwd worktree conforme
- `npx vitest run FeaturesSection.test.tsx landing.hover-pairing.test.ts base-layer.test.ts`
  → **28 passés / 0 échec** (les deux garde-fous voisins restent verts)
- **Test de mutation** : réintroduction de `hover:-translate-y-2` → le garde-fou **échoue**
  (`expected [ 'hover:-translate-y-2', …(2) ] to deeply equal []`) ; fichier restauré et
  revérifié. Le test n'est pas vert pour rien.
- `npx tsc --noEmit` → 0 erreur ; `npx eslint` (2 fichiers) → 0 issue ;
  `npx prettier --check` (3 fichiers) → conformes
- Pas d'`@import` en tête de `landing.css` (rien à signaler pour #343)

## NON vérifié — à couvrir par la passe navigateur du lead

- **Rendu navigateur clair + sombre : pas fait** (interdit pendant la vague parallèle).
  **Aucun pixel n'a été mesuré** : les −10 px / −5 px attendus restent à confirmer.
- **Fluidité de la transition** après correctif (`none` → `translateY(-10px)`) : **déduite** de
  la cascade, non observée. C'est le mode d'échec le plus plausible s'il en reste un.
- Rien n'a été compilé — seule la source Tailwind a été lue (`PIT-S53-005` : ne pas conclure
  « ça marche » depuis une déduction).
- `next build` non lancé → le mode d'échec `PIT-S22-001` n'est couvert que par `eslint` ciblé.

## Signaux mémoire

[MEMORY:pitfall] Tailwind 4 : `translate-*` pose la propriété `translate`, tandis que
`transform` / `rotate-*` / `skew-*` posent `transform` — deux propriétés que la cascade ne
départage **jamais**, elles se composent. Un utilitaire de translation et un
`transform: translateY()` de feuille s'**additionnent** silencieusement ; ni `tsc`, ni
`vitest`, ni la CI ne le voient. Chercher la paire avant de croire à un conflit de cascade.

[MEMORY:decision] #384 : la lévitation de `.feature-card` appartient à `landing.css`, pas au
TSX. Motif : la feuille porte aussi le palier responsive `-5px` (< 768 px), qu'aucune utilitaire
ne reproduit sans réécriture ; et `.testimonial-card` suit déjà ce modèle.

## Recommandations suite

- **RECOMMAND_UI_DESIGN : non.** Aucune valeur visuelle n'est changée par rapport à l'intention :
  l'issue énonce −10 px comme la cible, le correctif la restaure sans toucher aux tokens ni à la
  charte.
- Pas de RECOMMAND_SECURITY car aucune donnée, aucun endpoint, aucun état d'auth n'est touché —
  1 attribut `className` et des commentaires CSS. Confirmé côté CI : `security` et `secret-scan`
  au vert sur la PR #523.
- Pas de RECOMMAND_DB_EXPERT car aucune migration, aucun schéma, aucune BR.
- Pas de RECOMMAND_TEST_RUNNER car le périmètre testable tient en une suite ciblée de quelques
  secondes ; la suite complète a de toute façon été exécutée par le lead (1187/1187 unitaires,
  E2E vert en CI).

## Absorbé / follow-ups

ABSORBED : retrait de la classe `transform` nue (morte en v4 sur cet élément) — même attribut,
même ligne, arbitrage explicitement demandé par le briefing.

RECOMMAND_FOLLOWUP : **aucun**. Point noté au passage mais déjà connu et déjà suivi : le conflit
`:focus-visible` de `ds/tokens/base.css:82` reste non corrigé (audit #340 §4, calibre M) — non
rouvert ici.

STATUS: COMPLETED
