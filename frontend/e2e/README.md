# Suite E2E — contrôle de contraste et de troncature des CTA (#337)

> Ce document décrit le harnais ajouté par #337 (Sprint 49). Pour la recette de
> lancement de la suite en local, voir
> `docs/memory/sprints/sprint-47/e2e-local-runbook.md` — elle documente 4 réglages
> non devinables (CORS, `--workers=1`, base `eventmanager_e2e`, port `:3100`).

## Pourquoi

Le Sprint 48 a livré deux régressions visibles par l'utilisateur qu'aucun test
n'a vues : deux CTA rendus bleu sur bleu (1.00:1, illisibles) et un libellé coupé
en plein mot. Les trois filets en place sont structurellement aveugles à cette
famille :

| Filet             | Ce qu'il ne voit pas                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest + `jsdom`  | ne résout ni la précédence des `@layer` CSS ni la moindre mise en page — `getComputedStyle` y renvoie des valeurs déclarées, pas rendues |
| `next build`      | ne contrôle aucun style à l'exécution                                                                                                    |
| Relecture de diff | une interaction de cascade entre deux fichiers CSS ne se devine pas                                                                      |

Seul un vrai moteur de rendu répond à « qu'est-ce que l'utilisateur voit ».

## Fichiers

- `e2e/support/contrast.ts` — mesure (contraste WCAG, troncature, opacité effective).
- `e2e/landing-cta-contrast.spec.ts` — la spec, en clair ET en sombre.

La spec est ramassée par la config Playwright existante (`testDir: './e2e'`) :
elle tourne dans `npm run test:e2e`, donc dans le job `e2e` de la CI, sans réglage
supplémentaire. Elle n'a besoin d'aucune authentification (la landing est
publique) ni d'aucune donnée en base.

## Ce qui est mesuré

Pour chacun des 5 CTA de la landing (en-tête inscription / en-tête connexion /
hero primaire / hero secondaire / bandeau final) :

1. **Contraste au repos**, thèmes clair et sombre, viewports 1280 et 375 ;
2. **Contraste au survol** — c'est un voile de survol qui avait fait tomber le
   CTA du hero à 4.01:1 avant #335 ;
3. **Troncature** — `scrollWidth`/`scrollHeight` contre `clientWidth`/`clientHeight` ;
4. **Révélation** — chaque section `.section-animation` atteint `opacity: 1`.

### Seuil appliqué

`max(seuil WCAG applicable, 4.5)`.

Les CTA sont rendus à **27px** — l'échelle du DS Graphite (`--text-lg: 27px`)
écrase celle de Tailwind, `text-lg` ne vaut donc PAS 18px. À 27px WCAG les classe
en « grand texte » et ne leur impose que 3:1. On garde quand même un plancher à
4.5:1 : à 3:1, la régression pré-#335 (4.01:1) passerait le test, ce qui viderait
la spec de son objet.

### Justesse du calcul

- **Luminance relative WCAG 2.x** avec linéarisation sRGB — pas une moyenne de
  canaux, qui se trompe d'un facteur ~2 sur les bleus (la teinte de l'accent).
- **Fond composité** : `backgroundColor` vaut `rgba(0,0,0,0)` sur la plupart des
  éléments ; on remonte au premier ancêtre opaque et on ré-empile les couches
  semi-transparentes traversées.
- **Pseudo-éléments couvrants** : le voile de survol de `.cta-button` est un
  `::after` (`width: 0` au repos, `100%` au survol) — il est composité dans le
  fond quand il couvre effectivement la boîte.
- **Normalisation par `<canvas>` 1×1** plutôt que par une regex : le DS utilise
  `color-mix()`, que `getComputedStyle` peut ressortir tel quel.

## Les 4 pièges rencontrés en écrivant ce harnais

1. **Mesurer sans écarter la souris.** Le curseur reste où Playwright l'a laissé.
   Après un défilement, un bouton peut passer dessous et être mesuré dans son
   état `:hover` : à 375px, le CTA secondaire renvoyait 1.00:1 (survol) au lieu
   de 17.32:1. → `page.mouse.move(0, 0)` avant toute mesure de repos.
2. **`expect.poll(...).toBeGreaterThanOrEqual(seuil)` sur un état animé.** Le
   poll s'arrête dès que la condition est vraie : il valide l'état de DÉPART
   (encore conforme) et ne voit jamais la dégradation qui arrive 200 ms plus
   tard. Le défaut de survol passait « vert » un run sur deux. → on attend la
   STABILITÉ (`readStable`, deux lectures identiques), puis on juge.
3. **`opacity: 0` n'est pas « invisible » pour Playwright.** `toBeVisible()`
   passe sur une section à `opacity: 0` — un contraste y serait mesuré sans
   aucun sens. → on assert l'opacité effective (produit sur les ancêtres).
4. **Une mutation injectée peut être avalée par une transition ou un
   `min-width`.** `transition-all` interpole la couleur (mesuré :
   `rgb(91,156,236)` à mi-chemin) et `min-w-min` l'emporte sur `width`. → toute
   injection de style de contrôle porte `transition: none` et `min-width: 0`.

## Auto-contrôle (le test du test)

Un test de contraste qui ne rougit jamais ne vaut rien — c'est exactement le
défaut du harnais que #337 corrige. La spec contient donc un test
`auto-contrôle` qui **injecte** une dégradation connue dans la page
(`addStyleTag`, aucun fichier source touché) et vérifie que la mesure la voit :
fond = couleur du texte (1.00:1) puis libellé forcé sur une ligne dans une boîte
trop étroite. S'il tombe, les assertions ci-dessus sont devenues aveugles.

## Défaut connu marqué `test.fail()`

`DÉFAUT CONNU — le CTA secondaire du hero reste lisible au survol` est annoté
`test.fail()` : il échoue aujourd'hui et la suite reste verte, mais **le jour où
le défaut est corrigé, Playwright rougit** (« expected to fail, but passed »),
ce qui force à retirer l'annotation. Le défaut est préexistant à ce sprint :

`Button variant="outline"` (`src/components/ui/button.tsx`) porte
`hover:text-accent-foreground` ; `--color-accent-foreground` vaut
`--color-accent-ink`, la couleur de texte prévue SUR l'accent. Au survol,
`HeroSection` remplace bien le fond (`hover:bg-surface`) mais pas la couleur de
texte du variant — `text-ink` n'entre pas en conflit avec un utilitaire
`hover:text-*`, tailwind-merge ne les fusionne pas. Résultat mesuré : **1.00:1 en
clair** (blanc sur blanc) et **1.07:1 en sombre**. Le libellé disparaît au survol
dans les deux thèmes.

## Sélecteurs

Aucun CTA de la landing ne porte de `data-testid`. L'ancrage se fait sur la
structure et les `href` (`header a[href$="/register"]`, `a.cta-button`,
`section a[href="#how-it-works"]`, `section a[href$="/register"]:not(.cta-button)`),
**jamais sur les libellés** : la suite doit rester valable en `fr`/`en`/`es`/`de`.
Ajouter des `data-testid` sur ces boutons est un follow-up ouvert.
