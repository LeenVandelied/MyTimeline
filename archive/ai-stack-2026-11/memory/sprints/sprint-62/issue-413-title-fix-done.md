# Correctif `<title>` sur /_not-found — suite du correctif 404 (#413)

**Commit :** `899fd91` (4 fichiers, +183 / -101, vérifié via `rtk proxy git show --stat`)
Sprint 62 · dispatché après le constat de régression résiduelle de `26b5c26`

## Contexte

`345003a` a retiré le layout racine de `/_not-found`. `26b5c26` a réparé le document manquant avec
`globalNotFound`, mais **la `metadata` du layout était partie avec le layout** : plus de `<title>`
sur la 404, alors qu'elle héritait de `title: 'Ma Timeline'` (`app/layout.tsx:34`) avant le sprint.
Régression introduite par ce sprint, donc corrigée dans ce sprint.

## Solution livrée

**Scission Server / Client.**
- `frontend/app/global-not-found.tsx` → **Server Component**, exporte `metadata` et rend
  `<GlobalNotFoundScreen />`
- `frontend/app/global-not-found-screen.tsx` → **`'use client'`**, reprend à l'identique
  `<html>` / `<body>` et le `useState`/`useEffect` de locale

`<html lang>` reste piloté par l'état React — pas d'écriture DOM manuelle. La stratégie de prérendu
est **inchangée** : premier rendu au défaut des deux côtés, locale en `useEffect`.

**Preuve que la voie est ouverte** (et non un pari) : `next-app-loader/index.js:298` monte
`global-not-found` en **`page:`** de `/_not-found`, pas en layout ; et le builtin
`next/dist/client/components/builtin/global-not-found.js` n'a **pas** de `'use client'`.

**Titre NON localisé, `'Ma Timeline'`** — choix justifié, pas par défaut : `metadata` est résolue au
build, côté serveur, sur une page statique **unique** servie pour les 4 locales — ni `params`, ni
URL. `headers()` sortirait `/_not-found` du SSG (mesuré au tour précédent) et `generateMetadata()`
n'a pas davantage accès à la locale. **Le SSG n'a pas été sacrifié pour un titre.** Restaure
exactement ce qu'il y avait en `app/layout.tsx:34`.

## Mesure (curl, HTML brut, standalone hors dépôt)

| URL | AVANT (:3220, build de `cf2127a`) | APRÈS (:3221) |
|---|---|---|
| `/fr/nope` | 404 · `<html lang="fr" class="__variable_8db87c __variable_595324" …>` · title **ABSENTE** | 404 · même `<html>` · `<title>Ma Timeline</title>` · screen_hits=1 |
| `/en/nope` | 404 · idem `lang="fr"` · **ABSENTE** | 404 · idem · `<title>Ma Timeline</title>` |
| `/es/nope` | 404 · idem `lang="fr"` · **ABSENTE** | 404 · idem · `<title>Ma Timeline</title>` |
| `/de/nope` | 404 · idem `lang="fr"` · **ABSENTE** | 404 · idem · `<title>Ma Timeline</title>` |
| `/nope` | 307 → `/fr/nope` · **ABSENTE** | 307 → `/fr/nope` (final 404) · `<title>Ma Timeline</title>` |

Nominal `/en/login` après correctif : 200 · `<html lang="en" …>` · `<title>Ma Timeline</title>`.

## Non vacuous (exigé, et fourni)

Spec modifiée rejouée sur le build **d'avant correctif** (:3220) → exit 1, **4 failed / 9 passed**,
les 4 échecs sur `document-lang.spec.ts:106`, message `<title> servi pour /fr|en|es|de/nope`.
L'assertion porte sur le **contenu** (`.toBe('Ma Timeline')`), pas la présence : un `<title></title>`
vide échouerait aussi.

## Non-régression (compteurs lus sur exit codes réels)

- `next build` (copie hors dépôt, `node_modules` symlinké) : **exit 0**,
  `✓ Generating static pages (52/52)`, `├ ○ /_not-found  2.2 kB  112 kB` — **statique, taille
  inchangée**
- `npx vitest run` : **exit 0**, **97 fichiers / 950 tests passed** (réf. 97/948 + 2 tests `metadata`)
- E2E `document-lang.spec.ts --workers=1 --no-deps` sur :3221 : **exit 0, 13 passed** (1,5 s)
- `tsc --noEmit` : exit 0, 0 ligne · `eslint` (4 fichiers) : exit 0, 0 ligne
- Après hydratation (:3221) : `/fr/nope`→`fr`/« Page introuvable »/`/fr` ·
  `/en/nope`→`en`/« Page not found »/`/en` · `/es/nope`→`es`/« Página no encontrada »/`/es` ·
  `/de/nope`→`de`/« Seite nicht gefunden »/`/de` · `document.title="Ma Timeline"` sur les 4
- Working tree partagé respecté : `frontend/.next` jamais touché, `next.config.mjs` non modifié
  (le `next dev` du voisin n'a pas été redémarré), `git add` fichier par fichier,
  `playwright.config.ts` et `e2e/sprint-62-select-focus-indicator.spec.ts` du voisin laissés hors
  index (vérifié `git status --porcelain` avant commit)

### Correction d'une affirmation du tour précédent

L'artefact de `26b5c26` annonçait **0 message console**. Mesure refaite : **1 message par page**
(`Failed to load resource: … 404 (Not Found)`). **Contre-mesuré sur le build de base** : le même
message, identique, sur les 4 URL. C'est le statut 404 de la navigation elle-même, **préexistant**,
pas un effet du correctif. Aucun warning de mismatch d'hydratation. Le « 0 » précédent avait été
mesuré avec un filtre différent.

## Non vérifié

- **Suite E2E complète non rejouée** — seul `document-lang.spec.ts`. Le voisin modifiait
  `playwright.config.ts` pendant ce run : la config utilisée n'est pas nécessairement celle qui sera
  commitée. **À rejouer en Phase 6.**
- **`next dev` (webpack et turbopack) non exercé** sur ce correctif — mesure en prod standalone
  uniquement. La scission Server/Client pourrait se comporter autrement en dev ; le tour précédent
  avait, lui, vérifié les deux.
- CI / Linux non exercée · thème sombre non exercé
- Le `<title>` est **`fr`-neutre pour les 4 locales** — non localisé **par construction**, ce n'est
  pas un manque de vérification
- Aucune vérification que `metadata.description` atteigne la balise `<meta name="description">`
  servie (seul `<title>` a été mesuré)
- `/missing.png` (hors périmètre) non re-mesuré

## Signaux mémoire

**[MEMORY:pattern]** `global-not-found` est monté en **`page:`** de `/_not-found` par
`next-app-loader` (`index.js:298`), **pas en layout** : il peut donc être un **Server Component
exportant `metadata`**, avec un enfant `'use client'` qui rend `<html>`/`<body>`, sans que le
`<title>` se perde. Forme retenue : parent serveur = `metadata` seule, enfant client = document
entier. Mesuré sur Next 15.5.22, prod standalone.

**[MEMORY:pitfall]** Retirer un layout d'une route retire **aussi sa `metadata`**, pas seulement son
`<html>`. La 1re passe de #413 a vu le document manquant et **pas** le `<title>` :
`NEXT_MISSING_ROOT_TAGS` est bruyant, la perte de `metadata` est **silencieuse**. Après tout
déplacement de `<html>`, **mesurer le `<title>` servi**, pas seulement la balise `<html>`.

**[MEMORY:pitfall]** Le hook RTK **filtre aussi les redirections vers fichier** :
`npx next build > log 2>&1` a écrit un résumé de 6 lignes (« 2 routes (1 static, 1 dynamic) », faux)
au lieu de la sortie Next. Le build avait bien tourné (`.next/prerender-manifest.json` = 50 routes).
Famille `PIT-S50-007` élargie : préfixer `rtk proxy` **avant toute commande dont on veut lire la
sortie brute, redirection comprise**.

**[MEMORY:pitfall]** Le hook `warn-test-delegation.sh` bloque `npx playwright test` : préfixer
`SKIP_DELEGATION=1`.

## Recommandations suite

- **Piège pour le reviewer** : au risque déjà signalé (`experimental.globalNotFound` ne rougit pas
  s'il disparaît) s'ajoute que **la scission Server/Client dépend du fait que Next monte
  `global-not-found` en `page:`**. Un bump de Next pourrait le repasser en composant client et
  **faire retomber le `<title>` en silence**. Seule l'assertion E2E ajoutée l'attrape.
- **Pas de RECOMMAND_TEST_RUNNER** : build, vitest complet, tsc, eslint et la spec E2E ont été
  exécutés et leurs sorties consignées.
- **RECOMMAND_FOLLOWUP** (faible valeur, à arbitrer) : le `<title>` de la 404 vaut « Ma Timeline » et
  non « Page introuvable ». Une localisation post-hydratation via `document.title` serait possible
  sans toucher au SSG, mais laisserait le HTML servi neutre. Hors périmètre de la régression.

STATUS: COMPLETED
