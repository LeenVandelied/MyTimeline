# Issue #205 — Couverture E2E + Storybook des vues Timeline mobiles

commits: [41b8b15 (couverture E2E + Storybook), 0885ddd (alignement convention + correction du done)]

## resume

Objectif : couvrir en E2E + Storybook les vues Timeline mobiles portrait (#63) et
paysage (#64), livrées instrumentées au Sprint 19 mais jamais exercées. Périmètre
réduit à « Storybook + E2E » (le RTL existait déjà, non retouché).

**Fichiers livrés**

- `frontend/e2e/timeline-mobile.spec.ts` (créé) — 9 tests, 3 `describe`
- `frontend/src/components/timeline/TimelineMobilePortrait.stories.tsx` (créé) — 4 stories
- `frontend/src/components/timeline/TimelineMobileLandscape.stories.tsx` (créé) — 4 stories
- `frontend/src/components/timeline/fixtures.tsx` (**modifié, STRICTEMENT additif**) —
  fixtures mobiles + décorateur i18n `withTimelineIntl`. Ce fichier est partagé avec
  les 6 stories timeline préexistantes : vérifié que le diff ne contient **aucune
  ligne supprimée** (`git diff | grep '^-'` → vide) et qu'aucune signature existante
  (`makeDays`, `sampleResource`, `makeEvent`, `makePositionedEvent`,
  `stubEventContent`) n'est touchée. Non-régression prouvée au runtime ci-dessous.

Aucun composant applicatif modifié.

**Écran cible** : `/fr/timeline` (#301). Le dashboard ne convenait PAS : en mobile
portrait il rend `dashboard-mobile-portrait` et ne monte pas la frise du tout.

**testids mobiles réellement couverts**

`timeline-mobile-portrait`, `timeline-mobile-landscape`, `timeline-screen`,
`timeline-host`, `timeline-ruler`, `timeline-scroll`, `timeline-group`,
`timeline-resource-row`, `timeline-event` (+ attribut `data-event-title`),
`timeline-event-more`, `timeline-zoom-in`, `timeline-zoom-level`,
`timeline-minimap`, `timeline-minimap-wrap`, `timeline-minimap-toggle`,
`timeline-sheet`, `timeline-sheet-close`, `timeline-actionsheet`,
`timeline-actionsheet-edit`, `timeline-actionsheet-delete`,
`timeline-actionsheet-cancel`, `timeline-landscape-drawer`,
`timeline-landscape-drawer-close`. Non-régression : `timeline-view` (desktop)
asserté ABSENT dans les deux variantes mobiles.

**Pièges rencontrés**

1. **Deux affirmations du briefing étaient fausses.** (a) « Le repo contient ZÉRO
   `.stories.tsx` », « tes stories seront les premières du projet », « tu établis
   la convention » : **faux**. Le repo contient **23 stories**, dont **6 dans mon
   répertoire exact `components/timeline/`** (`EventBar`, `EventPill`, `Lane`,
   `Ruler`, `Cursor`, `DateStamp`) + 17 dans `components/ui/`. Cause racine
   (confirmée par le lead) : le `find` du briefing tournait depuis `frontend/` et
   cherchait donc `frontend/frontend/src` → 0 résultat.
   **Il n'y avait DONC rien à établir : je me suis aligné sur l'existant**, en
   priorité `EventBar.stories.tsx` et `EventPill.stories.tsx` — `import type { Meta,
   StoryObj } from '@storybook/react-vite'`, JSDoc d'en-tête référençant le numéro
   d'issue, `title: 'Timeline/<Composant>'`, `tags: ['autodocs']`, `decorators`,
   `args` dans le `meta`, clôture `satisfies Meta<typeof X>`, puis
   `export default meta` + `type Story = StoryObj<typeof meta>` et stories nommées
   commentées. Divergence repérée et **supprimée** lors de la revue : j'avais ajouté
   un `parameters: { layout: 'centered' }` qu'aucune story timeline existante
   n'utilise. (b) Storybook build fonctionnait déjà — aucune réparation d'outillage.
2. **next-intl obligatoire en story** : contrairement à `EventBar` (isolé par
   `stubEventContent`), les vues mobiles appellent `useTranslations()` sans
   namespace avec des clés pleinement qualifiées → sans `NextIntlClientProvider`
   la story crashe au montage. D'où le décorateur `withTimelineIntl`, alimenté par
   les VRAIS `public/locales/fr/{common,dashboard}.json`.
3. **Seuils de media query à trois paliers**, pas deux : paysage = `max-height:600px`
   mais minimap **forcée masquée** à `max-height:400px`. Un mobile réellement
   retourné (844×390) tombe sous le seuil de forçage → le toggle y est `disabled`.
   Tester le toggle exigeait une viewport paysage plus haute (844×520).
4. **`--workers=1` + `SKIP_DELEGATION=1` + `:3100`** appliqués (runbook), aucun
   diagnostic re-payé.
5. Pinch-zoom **non automatisé** (2 pointeurs hors de portée de Playwright) : repli
   documenté sur les boutons +/- qui passent par le même reducer. Le **long-press
   EST automatisé** (mono-pointeur, `mouse.down` + 800 ms) et passe de façon stable.

## preuve d'exécution locale

```
PASS (14) FAIL (0)     # 9 tests #205 + 5 tests du projet `setup`
Time: 15519ms
```

Détail (`--reporter=list`), les 9 tests de la spec :

```
✓ #205 Timeline mobile — portrait › affiche la frise portrait (règle, lanes, minimap) et pas la vue desktop (771ms)
✓ #205 Timeline mobile — portrait › tap sur un bloc ouvre le bottom sheet, fermé par le bouton close (1.1s)
✓ #205 Timeline mobile — portrait › bouton ⋯ et long-press ouvrent le MÊME action sheet (2.0s)
✓ #205 Timeline mobile — portrait › les boutons +/- changent le niveau de zoom (alternative au pinch) (819ms)
✓ #205 Timeline mobile — rotation › portrait → paysage → portrait conserve zoom et sélection (1.1s)
✓ #205 Timeline mobile — paysage › monte la variante paysage avec minimap et lanes denses (734ms)
✓ #205 Timeline mobile — paysage › le toggle masque et réaffiche la minimap (846ms)
✓ #205 Timeline mobile — paysage › tap sur un bloc ouvre le drawer latéral (et non le bottom sheet) (948ms)
✓ #205 Timeline mobile — paysage › le bouton ⋯ ouvre l'action sheet en paysage (parité avec le portrait) (903ms)
14 passed (16.7s)
```

Qualité : `npx tsc --noEmit` → aucune erreur sur mes fichiers (la seule erreur du
repo est dans `e2e/timeline.spec.ts`, fichier en cours d'écriture par #314).
`eslint` → « No issues found ». `prettier --check` → « All files formatted correctly ».

## storybook

**Les stories montent : OUI** — vérifié à DEUX niveaux, le build seul ne prouvant
pas le montage (une story peut compiler et throw au rendu).

1. Build : `npm run build-storybook` → `Storybook build completed successfully`
   (Vite ✓ built in 5.91s, exit 0).
2. **Montage runtime** : `storybook-static` servi puis chaque story chargée via
   `iframe.html?id=…` en Chromium, avec assertion du testid racine, absence de
   `pageerror`, et absence de clé i18n brute (preuve que le provider résout) :

```
OK   timeline-timelinemobileportrait--default
OK   timeline-timelinemobileportrait--single-category
OK   timeline-timelinemobileportrait--empty
OK   timeline-timelinemobileportrait--with-actions
OK   timeline-timelinemobilelandscape--default
OK   timeline-timelinemobilelandscape--minimap-forced-hidden
OK   timeline-timelinemobilelandscape--single-category
OK   timeline-timelinemobilelandscape--with-actions
STORIES OK (8) FAIL (0)
```

**Non-régression des stories préexistantes** (mon `fixtures.tsx` est partagé avec
elles) : le contrôle a été rejoué sur l'`index.json` COMPLET du build, soit toutes
les stories du repo, pas seulement les miennes :

```
Total stories: 78 (dont Timeline/*: 28)
ALL STORIES MOUNT OK (78) FAIL (0)
```

Les 28 stories `Timeline/*` incluent les 20 issues des 6 fichiers préexistants
(`EventBar`, `EventPill`, `Lane`, `Ruler`, `Cursor`, `DateStamp`) : aucune ne
régresse.

## Signaux mémoire

**[MEMORY:pitfall]** Contexte : le briefing #205 affirmait « ZÉRO `.stories.tsx`
dans le repo » et en tirait « tu établis la convention », alors que 23 stories
existent dont 6 dans le répertoire cible. **Cause racine** : le `find frontend/src
-name '*.stories.tsx'` avait été lancé depuis `frontend/`, il interrogeait donc
`frontend/frontend/src`, inexistant → 0 résultat, lu comme une absence réelle.
Solution : re-vérifier tout constat d'ABSENCE par un `find`/`grep` relancé
soi-même, depuis la racine du repo, AVANT de budgéter le travail correspondant.
Prévention : un `find` qui renvoie 0 prouve seulement que la commande n'a rien
trouvé — le premier réflexe est de vérifier que le chemin interrogé existe
(`ls` du répertoire de recherche). Un « le repo ne contient aucun X » dans un
briefing est une hypothèse, pas un fait ; le coût de vérification est de 5 s, celui
de réinventer une convention existante se compte en heures et en revue.

**[MEMORY:pattern]** Problème : monter en Storybook un composant qui consomme
`useTranslations()` de next-intl (crash au montage sans provider). Solution :
décorateur partagé `withTimelineIntl` dans `fixtures.tsx`, alimenté par les vrais
fichiers `public/locales/fr/<namespace>.json` importés en JSON (namespace = nom de
fichier, exactement l'indexation de `i18n.ts`), avec `timeZone` figé pour un rendu
déterministe. Anti-pattern : stubber `useTranslations` dans la story — la story
n'attraperait plus le renommage d'une clé i18n, alors que c'est précisément une
régression que Storybook doit rendre visible.

**[MEMORY:pattern]** Problème : prouver qu'une story « s'affiche correctement »
(critère d'acceptation courant). Solution : `build-storybook` ne prouve QUE la
compilation ; servir `storybook-static` et charger `iframe.html?id=<storyId>` en
Chromium en assertant le testid racine + zéro `pageerror` prouve le montage.
Anti-pattern : conclure « la story monte » depuis un build vert.

## recommandations suite

**RECOMMAND_FOLLOWUP:** *Le scroll horizontal est PERDU à la rotation
portrait ↔ paysage* (zoom et sélection, eux, sont bien conservés). Mesuré :
`scrollLeft` 400 → **0** après rotation. Cause : `useTimelineMobileState` hisse
`zoom` et `viewportStart` en state React (préservés car `TimelineResponsive` reste
monté), mais `scrollLeft` est un état **DOM** porté par l'élément de la variante,
qui est démonté/remonté ; `scrollToToday` n'est câblé qu'en `useEffect([])` au
montage du hook, donc rien ne réapplique la position. Effet de bord : `viewportStart`
reste à sa valeur d'avant rotation alors que le DOM est à 0 → la fenêtre de la
minimap est **désynchronisée** du contenu réellement affiché. Correctif probable :
réappliquer `scrollLeft = viewportStart * railWidth` dans un effet de montage de
variante. Le critère d'acceptation de l'issue (« sélection **ou** scroll conservés »)
est satisfait par la sélection — d'où un follow-up et non un blocage.

**RECOMMAND_FOLLOWUP:** *Pinch-zoom jamais couvert de bout en bout.* Playwright ne
pilote qu'un pointeur : le geste 2 doigts n'est vérifié qu'en RTL via dispatch
d'événements synthétiques (`TimelineMobilePortrait.test.tsx`), ce qui teste le
handler et non le parcours. Une couverture réelle demanderait le CDP
`Input.dispatchTouchEvent` (multi-touch) — à arbitrer selon le coût/bénéfice.

Pas de `RECOMMAND_TEST_RUNNER` : la spec est légère (9 tests, ~16 s) et a été
exécutée en local, aucun besoin d'isoler une suite verbeuse.

Pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` : issue de couverture pure,
aucune migration, aucun schéma, aucune surface d'auth touchée.

Pas de testid manquant à signaler : les vues mobiles sont intégralement
instrumentées, tous les parcours visés étaient pilotables sans repli sur du
texte i18n ou des sélecteurs de structure fragiles.

STATUS: COMPLETED
