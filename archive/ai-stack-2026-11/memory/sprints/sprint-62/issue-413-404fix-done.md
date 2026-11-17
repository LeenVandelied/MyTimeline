# Correctif 404 — suite de l'issue #413

**Commit :** `26b5c26` (4 fichiers, +282)
Sprint 62 · vague 2 · dispatché après le `STATUS: PARTIAL` de #413

## Contexte

`345003a` (#413) a descendu `<html>`/`<body>` sous `[locale]` pour localiser `lang`. Effet de bord
mesuré : un layout racine sans `<html>` fait servir par Next son document interne
(`NEXT_MISSING_ROOT_TAGS`, texte vide) sur toute URL non matchée. Deux contournements avaient été
tentés et mesurés inefficaces (`app/not-found.tsx` avec son propre `<html>` ; attrape-tout
`[...rest]` + `notFound()`).

## Solution livrée

`experimental.globalNotFound: true` (`frontend/next.config.mjs`) + `frontend/app/global-not-found.tsx`,
qui rend son propre `<html lang>` / `<body>` et réutilise `StateScreen`. `resolveLocale()` et les
messages sont inlinés, comme `global-error.tsx`.

**Écart assumé par rapport à `global-error.tsx`** : la locale est posée en `useEffect`.
`/_not-found` est **prérendu statiquement** — la résoudre pendant le rendu produirait un mismatch
d'hydratation (`lang` + texte).

Fichiers : `frontend/next.config.mjs`, `frontend/app/global-not-found.tsx`,
`frontend/app/global-not-found.test.tsx` (6 tests), `frontend/e2e/document-lang.spec.ts` (+5 tests).

Builds effectués **hors dépôt** (`scratchpad/{base,fix}`, `node_modules` symlinké) — le `.next` du
worktree partagé n'a jamais été touché.

## Mesure 404 (curl, HTML brut, serveur `standalone`)

**AVANT** (:3210, build de `f5819da`) : `/fr|en|es|de/nope` → **404**, `grep '<html'` = **vide**
(le corps démarre sur `<script src=…polyfills…>`, 6 199 o, ni `<head>` ni `<body>`).
`/nope` → **307** → `/fr/nope` → même corps cassé.

**APRÈS** (:3211) : `/fr|en|es|de/nope` → **404**,
`<html lang="fr" class="__variable_8db87c __variable_595324" style="--font-ui:var(--font-display)">`,
`data-testid="global-not-found-screen"` présent (1), texte « Page introuvable », 7 574 o.
`/nope` → **307** → `/fr/nope`, idem.

**Après hydratation** (:3211) : `/en/nope` → `lang="en"`, h1 « Page not found », href `/en` ;
`/de/nope` → `de` / « Seite nicht gefunden » ; `/es/nope` → `es` / « Página no encontrada ».
0 message console.

**Autres environnements** : `next dev` webpack (:3100) et `next dev --turbopack` (:3212, banner
« Experiments ✓ globalNotFound ») → 404 + `<html lang="fr">` + écran, `__next_error__` absent.

`/missing.png` (hors périmètre) : `__next_error__` **avant ET après**, inchangé.

## Non-régression

- `next build` exit **0**, **SSG 52/52**, `/_not-found` reste `○` (995 B → 2.2 kB)
- `npx vitest run` exit **0**, **97 fichiers / 948 tests passed** (référence 96/942 + les 6 nouveaux)
- `tsc --noEmit` exit 0, 0 ligne · `eslint` (3 fichiers) exit 0
- E2E `document-lang.spec.ts --workers=1 --no-deps` : **13 passed** sur :3211 (prod) **et** 13 passed
  sur :3100 (dev). **Spec non vacuous** : **5 failed / 5** sur le build d'avant correctif (:3210)

## ⚠ Régression résiduelle non traitée

**`/_not-found` n'a plus de `<title>`.** Les métadonnées du layout racine ont disparu sur cette route,
et un composant `'use client'` ne peut pas exporter `metadata`. Le build cassé n'en avait pas non
plus, mais **avant `345003a` il y en avait un** (`title: 'Ma Timeline'`, `app/layout.tsx:34`) — c'est
donc une régression réelle introduite par ce sprint, à traiter.

## Non vérifié

- **Le HTML SERVI de la 404 reste `lang="fr"` pour les 4 locales** (page statique unique) : la locale
  n'arrive qu'après hydratation. Sans JS, l'écran 404 est français partout.
  *À noter : ce n'est pas une régression — avant `345003a`, toutes les pages étaient `lang="fr"`.
  La 404 est simplement la seule route que #413 n'améliore pas.*
- Suite E2E complète non rejouée (seul `document-lang.spec.ts`)
- CI / Linux non exercée · thème sombre non exercé
- `[locale]/not-found.tsx` : toujours aucune URL connue qui le rende
- **Effet de bord** : l'édition de `next.config.mjs` a **redémarré le `next dev` du voisin** sur
  :3100 (nouveau PID, sert 200/404 correctement) — vérifié, mais l'état applicatif du voisin n'est
  pas garanti

## Signaux mémoire

**[MEMORY:pattern]** Layout racine transparent (pattern next-intl, `<html>` sous `[locale]`) ⇒
`experimental.globalNotFound` + `app/global-not-found.tsx` est la **seule** forme servie au runtime
(`next-app-loader` : « remove root layout for /_not-found »). Fonctionne en prod standalone, dev
webpack **et** dev turbopack (Next 15.5.22). Anti-patterns mesurés : `app/not-found.tsx` (prérend,
jamais servi) ; attrape-tout `[...rest]` + `notFound()` (échappe à `[locale]/not-found.tsx`).

**[MEMORY:pitfall]** Un écran hors layout **prérendu statiquement** ne peut pas résoudre la locale
pendant le rendu sans mismatch d'hydratation (`lang` + texte) : poser la locale en `useEffect`
(1er rendu = défaut des deux côtés). La voie `headers()` est interdite ici — elle sortirait
`/_not-found` du décompte `Generating static pages (52/52)`.

**[MEMORY:pitfall]** Turbopack refuse un `node_modules` **symlinké** hors racine FS
(`TurbopackInternalError: Symlink node_modules is invalid`) : une copie hors dépôt pour builder doit
**hardlinker** (`rsync --link-dest`, 19 s ici) si l'on veut tester `npm run dev`. `next build`
webpack, lui, accepte le symlink.

**[MEMORY:pitfall]** RTK a annoncé « 2 files changed, 217 insertions » sur un commit qui en contient
**4 / 282** (vérifié via `rtk proxy git show --stat`). Famille `PIT-S50-007` : **ne jamais reprendre
le récap de commit du hook**.

## Recommandations suite

- **RECOMMAND_FOLLOWUP** — restaurer un `<title>` sur `/_not-found`. Impose un `global-not-found`
  Server Component avec un enfant client, ou d'accepter un titre non localisé.
- **Pas de RECOMMAND_TEST_RUNNER** : vitest complet, tsc, eslint, build et la spec E2E ont été
  exécutés et leurs sorties consignées. La suite E2E entière reste toutefois non rejouée.
- **Piège pour le reviewer** : `experimental.globalNotFound` est **expérimental** — à re-tester à
  chaque bump de Next. Le drapeau **ne rougit pas s'il disparaît** : la 404 redeviendrait blanche en
  silence, et seule la spec E2E l'attraperait.

STATUS: COMPLETED
