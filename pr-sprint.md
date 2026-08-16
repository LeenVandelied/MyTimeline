## Objectif

Solder les défauts de rendu du header aux paliers 768-1024 px et l'échelle typographique de la
landing. **Sprint 100 % frontend** : aucun fichier backend, aucune migration Flyway, aucune BR
touchée.

## Issues traitées (4/4)

| Issue | Résultat |
|---|---|
| **#381** — logo header resté au palier `md:` | Corrigé — mais **l'hypothèse de l'issue est démentie par la mesure**, cf. ci-dessous |
| **#379** — marge nulle et logo sur 2 lignes à 1024 px | **Résolue par #381.** Aucun agent dessus, [relevé posté sur l'issue](https://github.com/LeenVandelied/MyTimeline/issues/379#issuecomment-5308701720) |
| **#348** — hiérarchie typographique inversée | Corrigé, **puis étendu** : 2 de ses 5 AC n'étaient pas atteints, absorbés dans ce sprint |
| **#341** — SVG débordant ~30 px sur mobile | **Faux positif.** Aucun correctif de rendu, un verrou E2E à la place |

Cohésion du lot : **0.81**.

## Le sprint a démenti trois de ses propres prémisses

C'est le résultat principal, et il tient à un seul choix : **mesurer avant de corriger**, dans
`mcr.microsoft.com/playwright:v1.61.1-jammy` plutôt que sur macOS (`PIT-S52-001`).

1. **#381 cherchait un défaut entre 768 et 1023 px. Il n'y en a aucun** — logo à 57 px sur une
   ligne, marge 223-262 px, dans les 4 locales et les 2 thèmes. Le `container` Tailwind plafonne la
   largeur utile à 736 px et la nav est masquée : les deux annulent le défaut attendu.
   **Le vrai défaut était à 1024 px** — un pixel hors du périmètre annoncé — avec `fr`/`de`/`es` sur
   2 lignes et **0 px de marge**.
2. **#341 traquait un SVG inline de la landing depuis trois sprints. Il n'existe pas.** Les 4 `<g>`
   à `x=384` sont le bouton flottant des **TanStack Query Devtools**, monté sous
   `NODE_ENV === 'development'`, absent du bundle de production, décalé hors bord droit **par
   design**, et son `right` suit la largeur du viewport (329@320, **384@375**, 399@390). Il ne
   produit aucun scroll. Mesure négative sur 20 combinaisons, macOS **et** jammy.
3. **L'AC de #348 interdisait d'« introduire » `text-4xl`/`text-5xl`** — or `HeroSection.tsx:59` en
   portait **déjà**, seul site du dépôt. Et ces classes ne sont pas inertes : absentes de
   `@theme inline` sans `--text-*: initial`, elles retombent sur les **défauts Tailwind** (36/48 px),
   donc **plus petit** que `text-3xl` (57 px). **La hiérarchie était littéralement inversée** : le
   `h1` du hero rendait plus petit que le logo du header.

## Changements clés

**Header** (#381) — logo `md:text-3xl` (57 px) → **`text-md sm:text-lg`** (21/27), `whitespace-nowrap`
à tous les paliers. `space-x-8` de la nav **intouchée**. Header `fr` : 184,8 → 90 px.

**Typographie de la landing** (#348 + absorption) :

| Élément | Avant | Après |
|---|---|---|
| h1 hero | `text-4xl md:text-5xl` (36/48, hors DS) | `text-xl md:text-2xl lg:text-3xl` (35/45/57) |
| Sous-titre hero | `text-xl` (35) | `text-md md:text-lg leading-normal` (21/27) |
| Chiffre d'étape | `text-2xl` (45) | `text-sm md:text-md leading-none` (17/21) |
| Wordmark footer | `text-2xl` (45, toutes largeurs) | `text-md sm:text-lg` (21/27) |

**`typography.css` n'est pas modifié.** Ajouter `--text-4xl`/`--text-5xl` aurait créé 2 tokens pour
1 seul site d'usage ; supprimer ce site rend l'invariant « never Tailwind-default » **vrai à
l'échelle du dépôt**.

Hiérarchie finale mesurée, **footer inclus dans le balayage** :

```
320-639 :  h1 35 > h2 27 > h3 21 = footer 21 > chiffre 17
640-767 :  h1 35 > footer 27 > h2 27 > h3 21 > chiffre 17
768-1023:  h1 45 > h2 35 > h3 27 = footer 27 > chiffre 21
≥1024   :  h1 57 > h2 35 > h3 27 = footer 27 > chiffre 21
```

## Périmètre élargi — assumé, pas subi

Deux critères d'acceptation de #348 n'étaient pas atteints après sa livraison, et ont été absorbés
sur décision du développeur :

- **AC #2** — le wordmark du footer (45 px) **battait** le h1 sous 768 px et l'**égalait** de 768 à
  1023 px. Le `<footer>` avait été *exclu du balayage de la spec* pour contourner ça.
- **AC #1** — le chiffre d'étape **égalait** le h2 et **dépassait** le h3 de sa propre étape. La
  spec figeait `<=` au lieu de `<`.

**Les deux dérogations de spec ont été retirées.** Une spec qui exclut une zone ou relâche un
comparateur pour verdir encode le défaut et le rend permanent.

## Tests — 929 des 1504 lignes ajoutées sont des tests

| Suite | Résultat |
|---|---|
| Frontend unitaire | **888 / 888** |
| `tsc --noEmit` | **0 erreur** |
| **E2E — suite complète** (Phase 6) | **183 / 183** |
| Backend | **462 / 462** (aucun fichier touché) |

Les specs **authentifiées** ont bien tourné (`golden-path`, `settings-*`, `timeline*`, `auth-*`,
`categories`, `products`) — c'était le trou du sprint : le header perd **24 à 95 px de hauteur** et
aucun des 183 tests, y compris ceux qui cliquent en coordonnées, n'a cassé.

**Nouveaux garde-fous** : `landing-header-logo.spec.ts`, `landing-mobile-overflow.spec.ts`,
`landing-typography-hierarchy.spec.ts`, `ds-type-scale.test.ts` (garde-fou source), et
`e2e/support/dev-tooling.ts` (source unique de la liste d'exclusion de l'outillage de dev).

**Chaque spec a été prouvée non-vacuous** — classes fautives réintroduites, rouges nommés exigés.
Ce n'est pas cosmétique : l'assertion `scrollWidth <= clientWidth` de #347 restait **verte** sur le
défaut réel de #381 (un logo qui se coupe en deux lignes la satisfait), et l'auto-contrôle de la
sonde de débordement restait **vert** sur une sonde renommée.

## Review

**0 CRITIQUE · 1 MAJEUR · 6 MINEURS — tous résolus en un cycle** (`4cf19f2`).

Le MAJEUR portait sur les tests : une boucle clair/sombre doublait 32 tests en 64 pour zéro signal,
sur un check e2e requis. Le reviewer recommandait le **retrait total** de la couverture du thème
sombre ; un **compromis** a été appliqué (cas général mono-thème + un contrôle ponctuel par spec).

**La mesure a donné raison au compromis** : injection d'une règle `.dark h1 { font-size: 33px }` →
**10 passed / 1 failed**, et **seul le contrôle sombre la voit**. Le retrait total l'aurait rendue
invisible.

Suite `landing-*` : 82 → 68 tests.

## ⚠ Ce qui n'est PAS couvert

- **Aucun jugement esthétique, sur aucune des quatre issues.** Des nombres ont été mesurés ; **aucune
  capture d'écran n'a été relue par qui que ce soit.** La conformité géométrique est établie, la
  qualité visuelle ne l'est pas.
- **Le 17 px du chiffre d'étape n'a pas été ratifié par `ui-design`** — il est imposé par la lettre
  de l'AC « strictement plus petit », pas choisi par un designer.
- **Chromium seul** — aucun projet Playwright de ce dépôt ne couvre Firefox ni WebKit.
- **Contraste WCAG non re-mesuré au navigateur.** Point chiffré : le sous-titre du hero tombe de 35
  à 21 px, donc **sous le seuil « grand texte » (24 px)** — son exigence passe de 3:1 à **4,5:1**.
  Le calcul sur tokens donne 5,96:1 en clair et 6,26:1 en sombre (conforme), mais **opacité et
  superpositions ne sont pas vérifiées**.
- **jammy ≠ `ubuntu-latest`** — jeu de polices proche, pas identique. C'est la classe de défaut de
  `PIT-S52-001` ; **cette CI est le premier vrai verdict**.
- Le reste de la suite E2E n'a pas été rejoué après le commit de corrections de review (`4cf19f2`) ;
  il l'avait été en Phase 6, avant. Ce commit ne touche que des specs `landing-*`, un support E2E
  et un commentaire CSS — **déduit, pas vérifié**.

## Point d'attention à surveiller

**La marge du header en `de` à 320 px vaut 5 px**, sous le plancher « deux chiffres » de
`PIT-S52-001`. Antérieur à ce sprint (terrain de #347), inchangé ici — mais le prochain
élargissement du groupe droit la fait basculer. Follow-up ouvert.

Au passage : `next.config.ts:30` pose `output: 'standalone'`, et Next avertit que `next start` ne
fonctionne pas avec cette configuration. Le build à froid sert pourtant `/fr` et `/en` en 200.
Candidat follow-up, non traité ici.

## Suite

`/sprint end 59` — triage des follow-ups (5 en attente), consolidation mémoire, fermeture des
issues et du milestone #60 après merge.

