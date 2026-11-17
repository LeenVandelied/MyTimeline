# Sprint 77 — corrections de revue (cycle 2)

## 1. Objectif

Corriger les 3 constats de relecture retenus sur le diff du sprint 77 (2 MAJEUR, 1 MINEUR),
sans ajouter aucune fonctionnalité ni élargir le périmètre au-delà de ces 3 points.

---

## 2. MAJEUR 1 — la tolérance du diff visuel était globale

**Constat** (signalé indépendamment par les deux relecteurs) :
`frontend/playwright.config.ts:233` posait `expect.toHaveScreenshot`
(`maxDiffPixelRatio: 0.002`, `threshold: 0.2`) au niveau **racine** de `defineConfig`,
donc comme défaut du dépôt — alors que ces valeurs ont été calibrées sur deux surfaces
seulement (hero 1280x747 et cartes d'auth, du texte sur fond plat).

### Voie retenue : options passées **au point d'appel**, constante `VISUAL_TOLERANCE`

`frontend/e2e/sprint-77-theme-visual.spec.ts` définit `VISUAL_TOLERANCE` (avec tout le
sweep de calibration déplacé depuis la config) et la passe aux **deux** `toHaveScreenshot`
du fichier : les 10 captures de référence et le contrôle négatif.
`playwright.config.ts` ne porte plus aucune clé `expect` — le bloc supprimé est remplacé
par un commentaire qui dit où la tolérance est partie, pourquoi, et ce qu'il ne faut pas
y remettre.

### Pourquoi cette voie, et pas les deux pistes proposées par les relecteurs

Les deux pistes ont été **vérifiées avant d'être écartées**, pas rejetées au jugé :

- **Projet Playwright dédié — ÉCARTÉ, et c'est rédhibitoire.** Le gabarit de nom par
  défaut des références contient `{projectName}`. Les 10 PNG committés se nomment
  `…-chromium-linux.png` (`ls e2e/sprint-77-theme-visual.spec.ts-snapshots/`). Un projet
  `visual` les renommerait **toutes** : un simple déplacement de tolérance imposerait de
  régénérer les 10 références en conteneur. Le briefing interdit explicitement de les
  régénérer, et c'est la bonne interdiction.
- **`test.use({ expect: … })` — ÉCARTÉ car inexistant.** Vérifié dans les types installés
  (`node_modules/playwright/types/test.d.ts`) : `expect?:` n'est déclaré qu'à deux
  endroits, L180 (`TestProject`) et L1127 (`TestConfig`). Il n'est **pas** dans
  `TestOptions`, donc pas atteignable par `test.use()` — `tsc` l'aurait refusé.

L'option retenue est la plus étroite des trois : la tolérance ne peut atteindre aucune
autre spec, elle vit à côté de la mesure qui la justifie, et elle ne touche à aucun nom
de fichier de référence.

### Piège traité au passage (il aurait désarmé le contrôle négatif en silence)

Le contrôle négatif appelle `toHaveScreenshot` avec `{ timeout: 5_000 }`. **Oublier d'y
étaler `VISUAL_TOLERANCE`** l'aurait fait retomber sur le défaut Playwright (aucun pixel
toléré) : le test serait resté VERT, mais aurait cessé de prouver quoi que ce soit sur la
tolérance réellement appliquée aux captures. C'est exactement le « déplacement au mauvais
endroit » annoncé par le briefing. Les options sont donc étalées
(`{ ...VISUAL_TOLERANCE, timeout: 5_000 }`), avec le commentaire qui dit pourquoi.

### Double preuve exigée par le briefing

**(a) 11/11 verts** — run final, après restauration de la valeur 0.002, conteneur
`mcr.microsoft.com/playwright:v1.61.1-jammy`, `--project=chromium --no-deps`, `CI=true`,
serveur `next dev` (webpack) sur `:3000` :

```
11 passed (15.7s)          exit 0
```

Aucun test sauté, aucun « did not run » (le piège du briefing : un exit 0 avec 11 tests
non exécutés). Le journal du run porte les 11 lignes `[e2e][#294] … boîte … px` et les 11
assertions de thème `<html class="… light|dark">`.

**(b) L'armement rougit TOUJOURS sur la mutation** — et surtout : preuve que la tolérance
est **réellement délivrée** au point d'appel, ce qu'un simple run vert ne démontre pas.

Contrôle mené : `maxDiffPixelRatio` temporairement porté de `0.002` à `0.05` (au-dessus du
ratio `0.0124` que produit la mutation d'interlettrage), même conteneur, `--grep armement` :

```
1 failed
  › une mutation typographique du hero fait ROUGIR la comparaison
  Error: La comparaison visuelle est restée VERTE malgré une mutation de
         l'interlettrage du `h1` du hero. La tolérance `VISUAL_TOLERANCE` … est trop large
                                                          exit 1
```

Le test d'armement **détecte** un élargissement de `VISUAL_TOLERANCE`. Donc la constante
est bien lue par `toHaveScreenshot` à cet endroit, et le déplacement n'a pas désarmé le
contrôle négatif. La valeur a ensuite été restaurée et le run (a) rejoué.

**Limite honnête de la preuve (b).** Elle porte sur le site d'appel du contrôle négatif.
Pour les 10 captures de référence, aucune expérience runtime ne peut distinguer `0.002`
de `0` sur ce poste, puisque le bruit mesuré y est de **0 pixel** : elles passeraient dans
les deux cas. Ce qui les couvre est d'une autre nature — même constante, même expression
d'appel, et `tsc` vérifie que l'objet est bien passé en second argument.

---

## 3. MAJEUR 2 — dérivation `--font-ui` recopiée à la main, sans test de parité

**Constat** : `frontend/.storybook/preview.ts:49` réécrivait
`--font-ui: var(--font-display)` en dur, en face de `app/[locale]/layout.tsx:50-56`.
Aucun test ne comparait les deux. Variante exacte de `PIT-S58-004` : le commentaire de
`preview.ts` **affirmait** reproduire la dérivation « à l'identique » — une garantie
décrite et inexistante.

### Voie retenue : EXTRACTION (source unique), pas test de parité seul

`frontend/app/fonts.ts` exporte désormais la dérivation :

- `FONT_UI_VARIABLE` (`'--font-ui'`) et `FONT_UI_VALUE` (`'var(--font-display)'`)
- `fontUiStyle` — la même chose sous forme de style inline React pour le `<html>` de l'app

`app/[locale]/layout.tsx` consomme `fontUiStyle` (l'import local `CSSProperties` disparaît,
le cast est parti dans le module partagé). `.storybook/preview.ts` consomme
`FONT_UI_VARIABLE` / `FONT_UI_VALUE`.

**Pourquoi l'extraction plutôt qu'un test de parité seul** : un test de parité *détecte* une
divergence après coup ; l'extraction la rend **impossible** — il n'y a plus qu'une
dérivation. C'est la seule des deux qui supprime le mode de panne au lieu de le surveiller.

**Deuxième copie manuelle supprimée au passage** (même défaut, même fichier) :
`preview.ts` reconstruisait `[archivo.variable, ibmPlexMono.variable]` alors que
`layout.tsx` pose la chaîne `fontVariables`. `preview.ts` découpe désormais `fontVariables`
lui-même.

### Risque de build vérifié, pas supposé

`app/fonts.ts` est chargé par **deux** builders. Il l'était déjà (`preview.ts` y prenait
`archivo` / `ibmPlexMono`), ce qui rendait le partage plausible — mais les deux gates ont
été rejoués :

- `next build` → exit 0, et le bundle serveur porte toujours
  `style:{"--font-ui":"var(--font-display)"}` sur le `<html>`
  (`.next/server/chunks/876.js`), le HTML prérendu portant
  `style="--font-ui:var(--font-display)"`. Rendu inchangé.
- `storybook build` → exit 0, et le bundle Storybook porte
  `Ire="--font-ui",Fre="var(--font-display)",Nre=xre.split(…)`
  (`storybook-static/assets/iframe-CNQyxi7I.js`) : le module partagé est bien résolu par
  le builder Vite, et `fontVariables` y est bien découpé.

### Comment la dérive est désormais détectée

L'extraction supprime la dérive *par construction*, mais elle peut être **défaite** par un
retour en arrière (quelqu'un réécrit le littéral en dur). Nouveau garde-fou :
`frontend/src/styles/__tests__/storybook-font-shell.test.ts` (9 tests) —

- le littéral `'var(--font-display)'` / `'--font-ui'` doit apparaître **exactement une
  fois** dans `app/fonts.ts` (témoin de périmètre : si la dérivation quitte ce module, la
  garde le dit au lieu de passer à vide, `PIT-S62-003`) ;
- il ne doit apparaître **nulle part** dans les deux consommateurs, qui doivent importer
  de `app/fonts` et utiliser `fontVariables` ;
- **armement** : 3 mutations en mémoire (réintroduction du `setProperty` en dur, du style
  inline en guillemets doubles, d'un seul des deux littéraux) ⇒ la garde rougit ; plus un
  témoin que le disque est intact.

Choix de conception assumé : la garde cherche la forme **quotée** (`'--font-ui'`), pas le
mot nu. Les trois fichiers nomment abondamment `--font-ui` dans leur **prose** — un `grep`
du nom nu rougirait sur sa propre documentation et se désarmerait au premier run. Un test
dédié (« la prose ne suffit pas à faire rougir ») fige ce choix.

---

## 4. MINEUR 3 — un commentaire faux, mesuré puis corrigé

**Constat** : `frontend/src/styles/__tests__/tsx-focus-utility.test.ts:55-57` affirmait que
les classes construites (`` `ring-${n}` ``) sont invisibles au lexeur. Le relecteur l'avait
réfuté empiriquement.

### Comportement RÉEL, établi par la mesure

Mesuré en exécutant les fonctions exportées du fichier (`stringLiteralsOf`,
`baseUtility`, `findFocusUtilityOffences`) sur des sources synthétiques, via un fichier de
mesure jetable supprimé depuis. Sorties brutes :

| source | littéraux extraits | verdict |
|---|---|---|
| `` `ring-${n}` `` | `["ring-"]` | **ROUGIT** — `{token:"ring-",kind:"ring"}` |
| `` `outline-${x}` `` | — | **ROUGIT** — `{token:"outline-",kind:"outline"}` |
| `` `text-${size} ring-${n}` `` | `["text-"," ring-"]` | **ROUGIT** — `ring-` |
| `` `${prefix}-2` `` | `["-2"]` | aveugle |
| `clsx({ [FOCUS]: on })` | — | aveugle |
| constante importée | — | aveugle |
| `` `ring${n}` `` | `["ring"]` | aveugle |

Le relecteur a raison. La mécanique : `stringLiteralsOf` **coupe le gabarit à chaque
`${`**, donc le fragment statique `ring-` devient un littéral à part entière ;
`baseUtility('ring-')` rend `'ring-'` ; `/^ring-/` matche. La ligne était donc fausse — et
elle n'était verrouillée **dans aucun sens**.

Nuance mesurée que ni l'ancien commentaire ni la revue ne portaient : `` `ring${n}` ``
(forme **nue** construite) passe bel et bien — mais **pas** à cause de l'interpolation : le
fragment `ring` se retrouve seul dans son littéral et tombe sous le discriminant de
multiplicité de `BARE_UTILITIES`.

### Commentaire corrigé + test qui fige le comportement

L'en-tête énonce désormais la règle réelle (le fragment statique suffit), signale
explicitement que la rédaction précédente était fausse, et liste ce qui reste réellement
invisible (préfixe calculé, clé calculée, constante importée, lib) plus le cas de la forme
nue avec sa vraie raison.

Nouveau bloc `describe('classes construites — frontière figée (#457, correctif de revue
S77)')`, **8 cas dans les deux sens** : 3 qui doivent rougir, 4 qui doivent rester aveugles,
plus 1 qui fige la mécanique elle-même (`stringLiteralsOf('…`ring-${n}`') === ['ring-']`)
pour qu'un refactoring du lexeur ne rende pas les 3 premiers verts pour la mauvaise raison.

---

## 5. Ce que je n'ai PAS traité (volontairement, per briefing)

- **`AUTH_CARD` localisé par classes Tailwind concaténées** plutôt qu'un `data-testid` :
  poser le testid invaliderait les 10 références PNG, qu'il faudrait régénérer en
  conteneur. Part en follow-up (cf. §8).
- **`BARE_UTILITIES` exige `isClassList`, donc `cn('outline', x)` isolé passe** : trou déjà
  documenté et assumé dans l'en-tête de `tsx-focus-utility.test.ts` et dans
  `issue-457-done.md`. (Il est désormais **aussi** couvert par un cas de test figé, cf. §4 —
  le trou reste ouvert, mais il n'est plus seulement décrit.)
- **`page.goto(…, {waitUntil:'domcontentloaded'})` sans `actionTimeout` explicite** :
  signalé **non vérifié** par le relecteur, sans reproduction. Non traité, non investigué.

Aucun `.tsx` applicatif, aucune locale, aucun PNG, aucune page légale, aucun composant
`timeline/` n'a été touché.

---

## 6. Tests — chiffres réels et codes de sortie

Tous rejoués depuis le worktree `sprint/77`.

| Gate | Résultat | Exit |
|---|---|---|
| `npx tsc --noEmit` | — | **0** |
| `npx vitest run` | **113 fichiers / 1313 tests passés**, 0 échec (1296 → 1313, +17) | **0** |
| `npx next lint` | `✔ No ESLint warnings or errors` | **0** |
| `npx next build` | build complet, 4 locales SSG | **0** |
| `npx storybook build` | `Storybook build completed successfully` | **0** |
| Diff visuel, conteneur, `--no-deps`, `CI=true` | **11 passed**, 0 sauté | **0** |
| Contrôle « tolérance élargie à 0.05 » (temporaire) | **1 failed** — l'armement signale | **1** |

Détail des +17 tests vitest : 9 (`storybook-font-shell.test.ts`, nouveau) + 8
(`tsx-focus-utility.test.ts`, bloc « classes construites »).

**Ce que je n'ai PAS joué, et je le dis :**

- **Suite backend** (566 tests) — aucun fichier backend touché. Non rejouée.
- **Suite E2E complète** (~240 tests) — non rejouée. Seule la spec de diff visuel l'a été,
  c'est la seule qu'un changement de `playwright.config.ts` pouvait affecter (la clé
  supprimée n'était consommée que par elle : elle était la seule `toHaveScreenshot` du
  dépôt). `PIT-S62-011` décourage par ailleurs deux runs complets rapprochés.
- **Rendu visuel du Storybook dans un navigateur** — non vérifié à l'œil. `build-storybook`
  est vert et le bundle porte bien la dérivation partagée, mais aucun pixel n'a été regardé.
  Un serveur Storybook tournait sur `:6006` **avant** mes changements ; il n'a pas été
  redémarré, donc il ne les sert pas.
- **CI** — aucune CI ne tourne sur les branches `sprint/N` (`PIT-S64-008`). Ces runs locaux
  sont le gate.

### Effet de bord d'environnement à signaler au lead

`:3000` portait un `next-server` **orphelin** (PPID 1) sous lequel j'ai joué `next build`
(`PIT-S62-009`) ; son état était donc indéterminé et son `/api/auth/me` rendait 500. Je l'ai
**arrêté** et relancé proprement selon la recette du briefing :
`NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npx next dev -p 3000`
(webpack). **Ce serveur tourne toujours** au moment où j'écris. Le backend est éteint —
`/api/auth/me` rend 500 (ECONNREFUSED), ce qui correspond aux conditions dans lesquelles
les références ont été générées. `frontend/storybook-static/` a été produit par le gate
(ignoré par `.gitignore:5`).

---

## 7. Signaux `[MEMORY:*]`

`[MEMORY:pitfall] Contexte: une tolérance `toHaveScreenshot` déplacée de la config racine
vers le point d'appel peut sembler correcte alors qu'elle n'est plus délivrée nulle part —
sur un poste où le bruit visuel mesuré est de 0 pixel, les captures passent AUSSI BIEN avec
la tolérance qu'avec le défaut « aucun pixel toléré », donc un run 11/11 vert ne prouve
RIEN sur la délivrance de l'option. Solution: contrôle par élargissement — porter
temporairement `maxDiffPixelRatio` au-dessus du ratio produit par la mutation du contrôle
négatif ; celui-ci DOIT alors échouer. Prévention: sur toute constante de tolérance,
exiger une expérience qui change le verdict, jamais un run vert.`

`[MEMORY:pitfall] Contexte: le contrôle négatif d'une spec de diff visuel appelle
`toHaveScreenshot` avec ses propres options (`timeout`). Y oublier la tolérance le fait
retomber sur le défaut Playwright (aucun pixel toléré) : il RESTE VERT, mais cesse de
mesurer la tolérance réellement appliquée aux captures — désarmement silencieux, sans
aucun signal. Solution: étaler la constante partagée (`{ ...VISUAL_TOLERANCE, timeout }`).
Prévention: quand on sort une valeur d'une config globale, énumérer TOUS ses consommateurs,
contrôle négatif compris.`

`[MEMORY:decision] Contexte: la tolérance du diff visuel #294 vivait au niveau racine de
`playwright.config.ts`, donc comme défaut du dépôt, alors qu'elle est calibrée sur deux
surfaces. Décision: la descendre au point d'appel (constante `VISUAL_TOLERANCE` dans la
spec) plutôt que dans un projet Playwright dédié. Pourquoi: le gabarit de nom des
références porte `{projectName}` — un projet `visual` renommerait les 10 PNG committés et
imposerait de les régénérer en conteneur pour un simple déplacement de tolérance. Et
`test.use({ expect })`, l'autre piste, n'existe pas : `expect` n'est déclaré que sur
`TestConfig` et `TestProject`, pas sur `TestOptions`.`

`[MEMORY:pattern] Problème: un garde-fou statique qui cherche un nom de variable CSS
(`--font-ui`) rougit sur la PROSE des fichiers qu'il garde — ces fichiers documentent
justement la règle. Solution: chercher la forme de CODE, c.-à-d. le littéral QUOTÉ
(`'--font-ui'`), que la prose n'emploie jamais, et figer ce choix par un test « la prose ne
suffit pas à faire rougir ». Anti-pattern: `grep` du nom nu — le garde se désarme au
premier run, sur sa propre documentation.`

`[MEMORY:bug] Cause: le commentaire de `tsx-focus-utility.test.ts` donnait `` `ring-${n}` ``
pour invisible au lexeur ; c'était faux — `stringLiteralsOf` coupe le gabarit à chaque
`${`, le fragment statique `ring-` devient un littéral et matche `/^ring-/`. Solution:
comportement établi par la mesure (exécution des fonctions exportées, pas relecture), puis
commentaire corrigé ET 8 cas de test qui figent la frontière dans les deux sens. Règle: sur
ce dépôt un commentaire est une mémoire d'arbitrage — s'il énonce une frontière, un test
doit la verrouiller, sinon elle dérive au premier refactoring.`

---

## 8. Recommandations suite

RECOMMAND_FOLLOWUP: poser un data-testid sur la carte auth des captures visuelles (locator par classes Tailwind fragile) — impose de regenerer les 10 references PNG en conteneur [triage S | domaine frontend/e2e]

RECOMMAND_TEST_RUNNER: non applicable — aucune suite lourde a deleguer, les 6 gates ont ete joues ici avec leurs codes de sortie.
RECOMMAND_DB_EXPERT: non applicable — aucun changement de schema, de migration ni de requete.
RECOMMAND_SECURITY_EXPERT: non applicable — aucun changement d'authentification, de donnees personnelles ni d'API externe.
RECOMMAND_ARCHITECT: non applicable — aucune decision structurelle ouverte, les deux arbitrages sont traces ci-dessus.
RECOMMAND_PLAYWRIGHT_REVIEWER: non applicable — la spec de diff visuel a ete rejouee 11/11 avec son controle negatif verifie par elargissement.

STATUS: COMPLETED
