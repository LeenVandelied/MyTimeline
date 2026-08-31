# Issue #413 — done (PARTIAL à la vague 1, RÉSOLU en vague 2)

**[BUG] `documentElement.lang` reste « fr » sur les pages non francophones (WCAG 3.1.1)**
Sprint 62 · vague 1 · `size:M` (rebadgée depuis S) · `priority:P2` · `epic:design` · frontend

**Commit :** `345003a` (8 fichiers, +337 / -171)

## Solution livrée

Descente de `<html>` / `<body>` sous `[locale]`, voie arbitrée par le dev au démarrage.

- `frontend/app/layout.tsx` → ne rend plus que `{children}` + `metadata`
- `frontend/app/[locale]/layout.tsx` → porte `<html lang={locale}>`, `<body>`, les providers
  (Theme > Auth > Query, `NetworkStatusProvider` sous `NextIntlClientProvider`), les polices, le
  `Toaster` et les imports CSS
- `frontend/app/error.tsx` → `frontend/app/global-error.tsx` (rend son propre document, JSDoc réécrit)
- `frontend/app/fonts.ts` → `next/font` extrait et partagé
- `frontend/e2e/document-lang.spec.ts` → nouvelle spec

## Vérification navigateur (valeurs brutes)

**HTML SSR prérendu** (`.next/server/app/*.html`, build isolé) :
`fr/login` → `<html lang="fr" class="__variable_8db87c __variable_595324" style="--font-ui:var(--font-display)">` ·
`en/login` → `lang="en"` · `es/login` → `lang="es"` · `de/register` → `lang="de"` (mêmes class/style).

**HTTP brut** (`curl` sur :3100, aucun JS exécuté) : `/fr/login`→`fr`, `/en/login`→`en`,
`/es/login`→`es`, `/de/register`→`de`. **L'attribut est correct avant hydratation** — le critère
WCAG 3.1.1 est bien satisfait au niveau du document servi, pas seulement du DOM.

**DOM après hydratation** (Chromium) : `fr` / `en` / `es` / `de` ;
`htmlClass="__variable_8db87c __variable_595324 light"` (next-themes intact) ;
`--font-display='Archivo, Archivo Fallback'`, `--font-mono='IBM Plex Mono…'`, `--font-ui='Archivo…'` ;
`Toaster` présent ; `bodyChildren=24`. Seule erreur console : `401` sur `/api/auth/me` (anonyme,
sans rapport).

**SSG préservé** : routes toujours `● SSG`, `generateStaticParams` intact, `next build` SSG 52/52.

## Tests

- `npx vitest run` → **96 fichiers passed, 942 passed**, exit 0
  (les 2 rouges observés par #415 en cours de vague venaient du répertoire `[...rest]` temporaire,
  depuis retiré — thread clos)
- `vitest run app/global-error.test.tsx` → 9 passed, **0 ligne stderr**
- `tsc --noEmit` → `No errors found` · `eslint` (7 fichiers) → 0
- `next build` → exit 0, SSG 52/52
- E2E `playwright test e2e/document-lang.spec.ts --workers=1 --no-deps` → **8 passed**
  (2 oracles × 4 locales), rejoué 2×

## ⚠ BLOQUE_SUR — régression mesurée, non résolue

Un layout racine sans `<html>` / `<body>` fait que **toute 404 d'URL non matchée rend le document
interne de Next au lieu d'une page 404**.

| | Avant | Après |
|---|---|---|
| `/en/nope` | 404 + `<html lang="fr">` + « 404: This page could not be found. » | 404 + `<html id="__next_error__">`, texte vide, `NEXT_MISSING_ROOT_TAGS` |

Le code HTTP reste 404 ; c'est le **document rendu** qui est cassé.

**Deux correctifs écrits, buildés, mesurés — inefficaces, donc retirés :**
1. `app/not-found.tsx` avec son propre `<html>` : il *prérend* correctement (`_not-found.html`
   contenait bien `<html lang="fr">` + l'écran) **mais n'est pas servi au runtime**.
2. Attrape-tout `app/[locale]/[...rest]/page.tsx` appelant `notFound()` : la route **est** atteinte
   (probe rendu avec `<html lang="en">`) mais `notFound()` **échappe à `[locale]/not-found.tsx`** —
   prouvé avec un not-found statique sans i18n.

Reproduit sur **3 environnements** (`next dev` :3100, `next start`, serveur `standalone`) → non
imputable au mode de serving.

**Pré-existant, hors périmètre :** `/missing.png` donnait déjà `__next_error__` avant le correctif.

### Piste non explorée par le subagent (trouvée par le lead après coup)

Next **15.5.22** (version réellement installée) supporte `experimental.globalNotFound` et le fichier
`app/global-not-found.tsx`, qui **rend son propre `<html>` / `<body>`** — conçu précisément pour le
cas où le layout racine ne fournit plus le document. Vérifié dans les binaires installés :
`config-schema.js` (`globalNotFound: z.boolean().optional()`), `build/entries.js:672,746` et
`server/dev/hot-reloader-webpack.js:777,876` (`isGlobalNotFoundEnabled`), et
`client/components/builtin/global-not-found` est bien la cible d'entrée de
`UNDERSCORE_NOT_FOUND_ROUTE_ENTRY`. Le drapeau reste **expérimental** dans cette version.

## Non vérifié

- Rendu réel de `global-error.tsx` sur une **vraie erreur runtime** (couverture unitaire seulement)
- Comportement sous Linux / CI
- `[locale]/not-found.tsx` : **aucune URL trouvée qui le rende**, ni avant ni après le correctif
- Thème **sombre** non exercé (`light` seul observé)
- Suite E2E complète non rejouée (backend absent au moment du run, `--no-deps`)

## Signaux mémoire

**[MEMORY:pitfall]** Next **exige** que le layout RACINE rende `<html>` / `<body>` pour servir
`/_not-found`. Réduire `app/layout.tsx` à `{children}` (pattern next-intl) casse donc la 404 : un
`not-found.tsx` racine portant son propre `<html>` **prérend** juste mais **n'est pas servi**, et
`notFound()` appelé sous `[locale]` **escalade au-delà** de `[locale]/not-found.tsx`. Contre-mesure
identifiée : `experimental.globalNotFound` + `app/global-not-found.tsx` (Next ≥ 15.5).

**[MEMORY:pitfall]** `next start` avec `output: 'standalone'` avertit et sert de façon **non fiable**
— utiliser `node .next/standalone/server.js` (+ copier `.next/static` et `public`).

**[MEMORY:pitfall]** Worktree partagé : `frontend/.next` est **unique**. Un `next build` et le
`next dev` du voisin se clobbent mutuellement. Bâtir dans une copie hors dépôt avec `node_modules`
symlinké.

**[MEMORY:pitfall]** Importer `globals.css` dans un composant testé fait cracher ~5 500 lignes de
stderr (jsdom + `css: true`) — `vi.mock` de la feuille dans le test.

## Recommandations suite

- **RECOMMAND_ARCHITECT** — arbitrage requis sur la 404 **avant merge**. Les voies restantes sortent
  de la latitude du subagent.
- **RECOMMAND_TEST_RUNNER** — suite E2E complète non rejouée (backend absent pendant le run).
- Piège rencontré et nettoyé : `.next/types` d'une route supprimée fait rougir `tsc` sur un chemin
  fantôme (`PIT-S60-007`).

## Résolution du blocage (vague 2)

Le `BLOQUE_SUR` ci-dessous a été **levé dans le même sprint**, par deux commits successifs :

- `26b5c26` — `experimental.globalNotFound` + `app/global-not-found.tsx` : document 404 complet,
  vérifié sur 4 environnements. Voir `issue-413-404fix-done.md`.
- `899fd91` — scission Server/Client pour restaurer le `<title>` perdu avec le layout.
  Voir `issue-413-title-fix-done.md`.

**BLOQUE_SUR (historique, résolu) :** la 404 des URL non matchées rendait le document interne de
Next (`NEXT_MISSING_ROOT_TAGS`) au lieu d'une page 404.

STATUS: COMPLETED
