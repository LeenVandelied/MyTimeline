# Issue #415 — done

**[BUG] `.mt-radio__dot` et `.mt-switch__track` n'ont qu'un indicateur de focus à 1,23:1**
Sprint 62 · vague 1 · `size:S` · `priority:P2` · `epic:design` · frontend

**Commit :** `251684d` (3 fichiers, +730 / -5)

## Solution retenue

Le contour du DS est porté sur la **sœur visible** du contrôle :
`outline: 2px solid var(--color-focus); outline-offset: 2px` remplace `box-shadow: var(--shadow-focus)`
sur `.mt-check__box` / `.mt-radio__dot` / `.mt-switch__track` (`core.css` L131 / L142 / L157).

C'est le même traitement que `.mt-btn`, `.mt-iconbtn`, `.mt-select__trigger` et `.mt-tab` : **le même
indicateur déplacé, pas un second motif** — conforme à `DEC-S58-001`.

**Zéro token modifié.** `--shadow-focus` conserve ses deux autres sites (`core.css` L68 et L90, où il
*double* un `border-color` au lieu d'être l'unique indicateur) ; `--color-accent-soft` est intact —
c'était le piège principal de l'issue (9+ consommateurs hors focus).

Voies écartées : redimensionner l'`<input>` masqué (déplace le problème en layout) ; retoucher
`--shadow-focus` (toucherait `.mt-input` / `.mt-select` sans nécessité).

## Mesures

Méthode : `page.screenshot({clip})` → `createImageBitmap` → `getImageData` **dans la page**, côté
`top`, 21 échantillons par ligne, offsets fixés **sur dump brut** (imprimé dans la sortie du test),
agrégation par **mode**. Conforme à `PAT-S58-002` et `PIT-S58-001`.

| Cible | Baseline (rouge) | Après correctif |
|---|---|---|
| `.mt-switch__track` clair | `#dbe9fc` / `#ffffff` = **1,23:1** | `#0e5fc4` / `#ffffff` = **6,08:1** |
| `.mt-switch__track` sombre | `#16263a` / `#131519` = **1,19:1** | `#4d9bff` / `#131519` = **6,48:1** |
| `.mt-radio__dot` clair | **1,23:1** | **6,08:1** |
| `.mt-radio__dot` sombre | **1,19:1** | **6,48:1** |

Les chiffres annoncés par l'issue ont été **reproduits exactement et indépendamment** avant
correction. Dump après correctif : trait à +3/+4 px, fond à +1/+2 (gap d'`outline-offset`) et +5..+8 —
conforme à `outline-offset: 2px` + `outline-width: 2px`.

## Vérification navigateur

Montage réel `EventEditForm.tsx:624`. Parcours : `/fr/products/{id}` → pastille → `event-drawer-edit`
→ focus **clavier** sur `event-form-archived-toggle` (Tab, jamais Espace — Espace ouvrirait le dialog
de #230). État asserté avant mesure : `:focus-visible === true`, non `disabled`, attente 450 ms
(`PIT-S58-002`).

Hitbox : l'`<input>` est resté **inchangé** (`0px/0px/opacity:0/absolute`, test dédié vert) et les 13
specs sprint-42/61 qui cliquent le `<label>` passent → aucune régression de clic ni de layout.

## Livrable transverse : `frontend/e2e/support/pixel.ts`

`PAT-S58-002` n'était implémenté nulle part dans le dépôt. La sonde existe désormais :

`measureIndicatorContrast(page, locator, {side, indicatorOffsetPx, adjacentOffsetPx, samples?, edgeGuard?, edgeGuardPx?}) → {ratio, indicator, adjacent, method}`
`dumpOutwardProfile(page, locator, side, maxOffsetPx?, opts?)` · `readStrip` · `formatProfile`
`contrastRatio` · `relativeLuminance` · `assertFocusVisible` · `settleForMeasurement` · `WCAG_NON_TEXT`

Elle agrège par **mode** (jamais par extremum — `PIT-S58-001`) et expose `unanimity` comme signal
d'arc ou de mauvais offset. Consommée par #414 en vague 2.

## Tests (exit codes réels lus)

- Baseline `sprint-62-control-focus-contrast.spec.ts` : **4 failed / 6 passed**, exit 1
- Après correctif, 2 runs : **10 passed / 0 failed**, exit 0
- `sprint-61-archived-events` + `sprint-42-events` : **13 passed / 0 failed**, exit 0
- `control-border-tier.test.ts` : **9 passed**
- vitest complet : **940 passed / 2 failed** (96 fichiers). Les 2 rouges sont
  `src/lib/auth-guard-paths.test.ts`, qui scanne l'arbre de routes et bute sur
  `frontend/app/[locale]/[...rest]/`, **untracked, créé par #413** en parallèle. Zéro intersection
  avec le diff de #415. **À revérifier une fois #413 commitée.**
- `eslint` sur les 2 fichiers TS : d'abord **1 error** `no-unused-vars` (invisible à vitest, rouge en
  CI), corrigée, puis clean. `tsc --noEmit` : **0 erreur**

## Non vérifié

- **`npm run build` complet non lancé** — il aurait tué le `next dev` de #413 sur working tree
  partagé, et son résultat aurait été inattribuable. Substitué par `eslint` ciblé + `tsc --noEmit`
  projet : **pas équivalent**. À couvrir par la CI.
- **Chromium seul.** Firefox / WebKit non mesurés ; `forced-colors: active` non testé.
- Les 2 vitest rouges **non rejoués sur un HEAD propre** (`git stash` interdit en worktree partagé) —
  attribution logique, pas expérimentale.
- `.mt-radio__dot` mesuré sur **injection DOM synthétique** (aucun écran ne monte `<Radio>`) : cela
  prouve la règle CSS et sa cascade, **pas** qu'un ancêtre applicatif ne rognerait le contour.
- `.mt-check__box` aligné par cohérence, **jamais mesuré** (zéro consommateur, `DEC-S58-003`).

## Environnement — correction apportée par l'auteur après coup

Le rapport initial annonçait « `next dev` :3100 laissé debout ». **C'était faux au moment où il l'a
écrit** : la tâche avait été tuée entre-temps, cause probable un `npm run build` de #413 (un build
réécrit `.next` sous les pieds du serveur — runbook, instabilité 1).

Corrigé depuis : `next dev` :3100 relancé en détaché (`nohup` + `disown`, pid 24169) avec
`NEXT_PUBLIC_API_URL=/api` et `E2E_API_PROXY_TARGET=http://localhost:8086` ; oracle re-vérifié,
`/api/auth/me` → **401** (`PIT-S58-003` satisfait, le préfixe `/api` atteint bien le backend).
Conteneurs `mytimeline-e2e-{backend,postgres}-e2e-1` : jamais tombés, Up ~1h (healthy), :8086 / :5436.

**Le livrable n'est pas affecté** : le commit `251684d` était déjà fait, et les 3 runs Playwright
(baseline rouge, 2× vert) plus les 13 specs de régression ont tous tourné **avant** cette coupure,
contre un serveur dont l'oracle était vérifié.

**[MEMORY:pitfall]** Sur working tree partagé, le `next dev` d'un agent est tué par le
`npm run build` d'un autre, **sans que l'agent propriétaire en soit notifié** autrement que par la
mort de sa tâche de fond. Un agent qui déclare « environnement laissé debout » doit **re-sonder le
port**, pas se fier au fait qu'il l'a démarré. C'est la variante « environnement » de `PIT-S60-005`
(arbre git propre, environnement dégradé) : ici non plus, `git status` ne dit rien.

## Signaux mémoire

**[MEMORY:bug]** `docs/memory/decisions.md:437` (`DEC-S58-003`) affirme que `.mt-radio__dot` et
`.mt-switch__track` « sont en production ». **Faux**, confirmé par grep des appelants : `<Radio>` n'a
aucun consommateur applicatif (seul `ui/radio.stories.tsx`) ; seul `<Switch>` est monté, une fois,
dans `EventEditForm.tsx:624`. La même erreur figurait dans `core.css` (« two production twins ») —
corrigée dans le commit. **À rectifier dans `decisions.md`.**

**[MEMORY:pattern]** Sonde de pixel `PAT-S58-002` enfin implémentée (`e2e/support/pixel.ts`).
Anti-pattern qu'elle interdit par construction : choisir l'offset par « pixel le plus écarté du
fond ». Elle impose un dump brut et agrège par mode, avec `unanimity` comme détecteur d'arc. Sur
`.mt-radio__dot` (cercle de 18 px) l'unanimité est tombée à **48 %** au baseline et la sonde a
**refusé de publier le ratio** — exactement le garde-fou qui manquait au S58 (3,19:1 lu sur un bouton
circulaire dont la couleur déclarée valait 3,70:1).

**[MEMORY:pitfall]** Un contrôle dont l'`<input>` est masqué (`opacity:0; width:0; height:0`) rend le
contour `@layer base` **structurellement inopérant** : il se peint sur 0×0 px. Tout composant qui
masque son input doit porter le contour du DS sur sa **sœur visible**, sinon il n'a aucun indicateur
de focus, quel que soit le token. Grep de détection : `input{...opacity:0...width:0}` + `+ .<classe>`
sans `outline`.

## Recommandations suite

- **Pas de RECOMMAND_TEST_RUNNER** : toutes les suites ont été exécutées et leurs compteurs lus sur
  exit code réel.
- **Pas de RECOMMAND_DB_EXPERT / SECURITY** : périmètre CSS pur, zéro BR, zéro endpoint.
- **Piège transmis à #414** : `measureIndicatorContrast` a des offsets **fixes**. Sur `ui/select.tsx`
  (Radix, `outline-offset` possiblement différent, panneau portalisé), lancer d'abord
  `dumpOutwardProfile` et **relire le profil** avant de figer `indicatorOffsetPx`. Le corollaire de
  `PIT-S58-001` (sonde qui attrape la bordure du popover, 16,3:1 au lieu de 6,08:1) vise exactement
  ce composant.
- **RECOMMAND_FOLLOWUP** (hors périmètre, non traité) : `control-border-tier.test.ts` ne lit que les
  déclarations `border*` — **aucun garde-fou source** n'empêche de réintroduire un `box-shadow` comme
  unique indicateur de focus. Le seul filet est la spec E2E ajoutée. Famille `PIT-S58-004` (garantie
  citée mais inexistante). Triage estimé : S · domaine design system.

STATUS: COMPLETED
