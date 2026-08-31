## Objectif

Dette d'accessibilité WCAG du design system : l'attribut `lang` de la page et les indicateurs de
focus. Sprint **100 % frontend** — zéro backend, zéro migration, **zéro BR métier impactée**.

## Résultat en une ligne

Sur les 3 issues planifiées, **deux pistes techniques se sont révélées fausses et une issue décrivait
un défaut inexistant**. Le travail a donc autant consisté à établir ce qui était vrai qu'à corriger.
Un défaut réel et distinct a été découvert en chemin.

## Issues traitées

| # | Objet | Résultat |
|---|---|---|
| [#415](https://github.com/LeenVandelied/MyTimeline/issues/415) | Focus radio/switch à 1,23:1 | **Corrigé** — 6,08:1 clair / 6,48:1 sombre |
| [#413](https://github.com/LeenVandelied/MyTimeline/issues/413) | `documentElement.lang` figé sur `fr` | **Corrigé** — 4 locales, dès le HTML SSR |
| [#414](https://github.com/LeenVandelied/MyTimeline/issues/414) | Focus des options de `Select` sous Firefox | **INFIRMÉ** — le défaut n'existe pas |

### #415 — le contour porté sur la sœur visible

Le correctif n'est pas celui qu'imaginait l'issue. Plutôt que retoucher `--shadow-focus`, le contour
du DS est porté sur la **sœur visible** du contrôle (`outline: 2px solid var(--color-focus)` sur
`.mt-radio__dot` / `.mt-switch__track`), exactement comme `.mt-btn` et `.mt-tab` : **le même
indicateur déplacé, pas un second motif** — conforme à `DEC-S58-001`.

**Zéro token modifié.** `--color-accent-soft` et ses 9+ consommateurs (`::selection`, `button.tsx`,
`dropdown-menu.tsx`…) sont intacts — c'était le vrai piège de l'issue.

Mesuré au pixel, baseline rouge établie avant correctif : **1,23:1 → 6,08:1** (clair),
**1,19:1 → 6,48:1** (sombre). Les chiffres annoncés par l'issue ont été reproduits indépendamment.

> Correction à l'issue : `<Radio>` n'a **aucun consommateur applicatif** (l'issue et
> `docs/memory/decisions.md:437` affirment à tort qu'il est « en production »). Seul `<Switch>` est
> monté, une fois, dans `EventEditForm.tsx:624`.

### #413 — descente de `<html>` sous `[locale]`, et ses deux régressions

La piste de l'issue visait `frontend/src/app/[locale]/layout.tsx` — **un chemin qui n'existe pas**.
Le `<html lang="fr">` était en dur dans le layout **racine** `frontend/app/layout.tsx:41`, où Next ne
passe aucun param de segment enfant.

Voie retenue (arbitrage dev) : descendre `<html>`/`<body>` sous `[locale]`, seule voie qui conserve
le SSG **et** donne un `lang` correct dès le HTML SSR. `curl` sans JS renvoie bien `fr`/`en`/`es`/`de`
sur les 4 routes. **Issue rebadgée `size:S` → `size:M`.**

Elle a produit **deux régressions, toutes deux corrigées dans ce sprint** :

1. **404 cassée** — sans `<html>` racine, toute URL non matchée rendait le document interne de Next
   (`NEXT_MISSING_ROOT_TAGS`, texte vide). Deux contournements ont été tentés, **mesurés
   inefficaces** et retirés. Correctif retenu : `experimental.globalNotFound` +
   `app/global-not-found.tsx`, vérifié sur **4 environnements**.
2. **`<title>` perdu** — retirer un layout retire **aussi sa `metadata`**, silencieusement. Corrigé
   par une scission Server/Client. Titre **non localisé** (« Ma Timeline ») : choix assumé —
   `metadata` est résolue au build sur une page statique unique servie pour 4 locales ; localiser
   imposait `headers()` et la perte de 52 routes SSG.

### #414 — verdict négatif, aucun code applicatif touché

Mesuré au pixel peint, **Firefox 153 et Chromium**, clavier seul, clair et sombre : `:focus-visible`
est bien obtenu et le contour vaut **6,08:1 / 6,48:1**. Les 1,23:1 de #383 sont reproduits
exactement — **mais ils mesurent la surface de survol, pas l'indicateur de focus**, qui est peint
(bande `--color-focus` à +3/+4 px).

Coder un indicateur `data-[highlighted]:` aurait **dédoublé le motif** en violation de `DEC-S58-001`,
pour un défaut inexistant. Le livrable est la spec de verdict, avec **garde-fou bidirectionnel** :
elle rougit si le contour disparaît **et** si la surface dépasse 3:1 (signe d'un token modifié).

## Changements clés

- `frontend/src/styles/ds/components/core.css` — contour sur la sœur visible (3 contrôles)
- `frontend/app/layout.tsx`, `app/[locale]/layout.tsx`, `app/fonts.ts` — descente du document
- `frontend/app/global-error.tsx` (ex-`error.tsx`), `global-not-found.tsx`, `global-not-found-screen.tsx`
- `frontend/next.config.mjs` — `experimental.globalNotFound`
- `frontend/e2e/support/pixel.ts` — **sonde de lecture de pixel, outillage neuf** (voir ci-dessous)
- `frontend/playwright.config.ts` — projet `firefox` restreint par `testMatch`
- `.github/workflows/ci.yml` — `playwright install chromium` → `chromium firefox`

### Pourquoi une ligne de CI dans un sprint a11y

`npm run test:e2e` lance **tous** les projets de `playwright.config.ts`. Sans le navigateur, le
nouveau projet `firefox` échoue au lancement et le job `e2e` — **check requis** — rougit. Le
`testMatch` est ancré sur la seule spec `sprint-62-select-focus-indicator.spec.ts` : **les 174 E2E
existantes ne voient jamais Gecko** (vérifié par `playwright test --list` : firefox = 13, chromium = 208).

## Outillage : `PAT-S58-002` enfin implémenté

La lecture de pixel était citée par la mémoire projet depuis le Sprint 58 **sans avoir jamais été
implémentée**. `e2e/support/contrast.ts` ne fait que du `getComputedStyle` — son `getImageData`
normalise une couleur sur un canvas 1×1. Le piège était réel : un dev pressé l'aurait prise pour la
sonde.

`frontend/e2e/support/pixel.ts` la fournit, et la review batch l'a durcie sur **3 points où elle
pouvait rendre un faux ratio silencieux** — le défaut même qu'elle prétend éliminer :

| Garde | Défaut mesuré avant correction |
|---|---|
| Clamp du `clip` sur le viewport | Élément collé au bord : le « fond adjacent » rendait **la couleur de l'élément lui-même**, unanimité 93 % — donc indétectable par la garde d'unanimité |
| `minUnanimity = 0.6` **levante par défaut** | Fond rayé : **ratio 1,00:1 publié** sans signal |
| `aria-disabled` / `data-disabled` | Un contrôle Radix désactivé passait la garde — le 1,59:1 du S58 pouvait revenir |

Sur une base Radix, « désactivé » est un **attribut sur un `div`**, jamais une propriété DOM : toute
garde d'état qui ne teste que `.disabled` est inopérante.

Après durcissement, les deux specs retrouvent **exactement** les mêmes ratios, occurrence pour
occurrence.

### Deux cycles de review, et un trou fermé au second

Le cycle 2 a été déclenché parce que les **commits de correction eux-mêmes n'avaient jamais été
relus** — or `f275db4` est du code de garde écrit pour réparer du code de garde. Verdict
`PRET_POUR_MERGE`, les 3 MAJEUR vérifiés résolus **dans le code**, pas sur le message de commit.

Mais il a relevé ceci : *les ratios identiques après correction prouvent la non-régression, pas
l'efficacité des gardes.* Unanimité 100 %, éléments loin des bords ⇒ **aucune garde ne se déclenchait
sur un cas réel du dépôt**, et leurs seules fixtures avaient été supprimées avant commit. Toute
régression future de ces gardes — seuil inversé, `<` devenu `<=` — serait passée en CI verte.

`25d2474` ferme le trou : **19 tests vitest arment les 4 gardes**, chacun prouvé **rouge quand la
garde est neutralisée**, avec contrôles négatifs (sans eux, une garde qui lèverait *toujours*
passerait). Technique : un double de `Page` dont `evaluate()` rend le tableau RGBA décodé, ce qui
fait tourner pour de vrai le clamp, l'assertion d'échelle et l'accès pixel — sans navigateur.

Le même commit étend la garde `disabled` aux **ancêtres** Radix : un `Item` ou `Group` ancêtre
désactive ses descendants sans qu'aucune propriété DOM ne le signale — même classe de bug que celui
corrigé au cycle 1.

## Tests

| Suite | Résultat | Exit |
|---|---|:---:|
| vitest | **969 passed / 98 fichiers** | 0 |
| `tsc --noEmit` / `eslint` | 0 / 0 | 0 |
| `next build` | **`Generating static pages (52/52)`**, `○ /_not-found` statique | 0 |
| E2E (chromium + firefox) | **216 déclarés, 208 passed, 0 failed, 8 skipped** | 0 |

Audit complet : `docs/memory/audits/sprint-62-test-coverage.md`.

**Deux points de lecture des logs, pour éviter un faux signal en review :**

- **Les 2 `test.fail()` ne sont pas des rouges.** `sprint-62-select-focus-indicator.spec.ts` (~l.487)
  marque le défaut de z-index non corrigé. Le reporter les affiche `✘`, mais ils comptent dans
  **`passed`**, jamais dans `failed`. Chromium 200 = 198 verts + 2 échecs attendus.
- **Les 8 skips** sont **7** `auth-signature` (clés RS256 absentes en local) **+ 1** `test.fixme`
  avatar (`settings-profile.spec.ts:36`) — pas `auth-guard`, qui passe ses 13 tests.
- **Le projet `firefox` reporte 13 tests** en `--list` : Playwright y inclut la dépendance `setup`
  (5). La spec restreinte en contient 8 (4 × 2 thèmes). Les deux chiffres sont justes.

Chaque spec ajoutée a été **exécutée**, et deux **prouvées non vacuous** contre le build antérieur
(4 échecs / 4 pour le `<title>`, 5 / 5 pour la 404). Le check de couverture E2E vérifie qu'un testid
est *cité*, pas qu'une spec *passe* — il ne vaut rien seul.

## Défaut réel découvert, non corrigé (issue de suivi proposée, P1)

**Le popover du `Select` n'est jamais peint dans `NewEventDrawer`.** `SelectContent` porte
`z-50` (`--z-popover`) sous `.mt-drawer` en `--z-modal` = 70 (`timeline.css:271`), et le drawer rend
**en ligne**, non portalisé : son `z` gagne quel que soit l'ordre DOM. `.mt-sheet` (variante mobile)
et `.mt-actionsheet` portent le même token.

Sur les 6 consommateurs de `ui/select`, **seul `NewEventDrawer` est affecté** — `ProductDrawer` et
`DeleteConfirmDialog` y échappent via un `Dialog` Radix portalisé. Le Select y est inutilisable,
clavier comme souris, desktop et mobile.

Non corrigé (remonter l'échelle de z du DS touche les 6 consommateurs), mais **figé en `test.fail()`
exécutable** qui rougira le jour de la correction — il faudra alors **retirer l'annotation, pas la
contourner**.

## Réserves assumées

- **`experimental.globalNotFound` est un drapeau expérimental** et **ne rougit pas s'il disparaît**
  à un bump de Next. Le filet est `document-lang.spec.ts:93-106`, qui assert le HTML servi de
  `/_not-found` (statut, `<html lang>`, testid, `<title>` non vide) — sa perte donnerait 4 rouges au
  job `e2e`. `package.json` déclare `^15.2.4` alors que le drapeau n'est validé que sur **15.5.22** :
  **épingler la version reste une décision de dépendance à prendre**.
- **Firefox 153**, alors que #383 mesurait **151** — non épinglable avec ce harnais. Une divergence
  d'heuristique entre les deux versions n'est pas exclue. C'est la réserve la plus sérieuse.
- **WebKit hors périmètre**, non exercé.
- La 404 rend **toujours en clair** : son `<html>` est hors `ThemeProvider`. Documenté et non
  corrigé — il n'existe aucun cookie de thème (next-themes est en `localStorage`, illisible au
  prérendu), et les voies restantes coûtent plus que le défaut.
- Le HTML **servi** de la 404 reste `lang="fr"` sur les 4 locales. **Pas une régression** : avant ce
  sprint, *toutes* les pages étaient `lang="fr"`.
- L'assertion d'échelle de la sonde n'est éprouvée qu'à **`dpr = 1`**.

## Cohésion

Score **1,00** — les 3 issues relèvent du même domaine (accessibilité DS / frontend), aucun
chevauchement de fichiers entre elles.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
