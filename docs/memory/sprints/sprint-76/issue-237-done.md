# Issue #237 — Filtrer `refetchQueries` du retry bannière réseau

Fichiers de contexte lus : `docs/memory/sprints/sprint-76/pitfalls-237.md` (intégral) ; le pack
`cp-frontend` inline dans le briefing ; `frontend/src/contexts/NetworkStatusContext.tsx` ;
`frontend/src/services/networkStatus.ts` ; `frontend/src/components/shared/OfflineBanner.test.tsx`
(motifs de test existants) ; `frontend/vitest.config.ts` ; et — pour trancher l'API — les sources
installées de TanStack Query 5.101.2 :
`frontend/node_modules/@tanstack/query-core/build/modern/_tsup-dts-rollup.d.ts`,
`.../queryClient.js`, `.../utils.js`.

Non lus : `docs/memory/business-rules.md`, `docs/memory/pitfalls.md` (contexte pré-injecté),
`docs/memory/sprints/sprint-76/briefing-237.md` (redondant avec le prompt reçu).

## Garde-fou worktree

`git rev-parse --show-toplevel` = `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`,
`git rev-parse --abbrev-ref HEAD` = `sprint/76`. Tous les chemins d'écriture sont absolus sous ce
répertoire.

## Vérification de l'API TanStack Query (pas de mémoire, lecture des types installés)

Version installée : `@tanstack/query-core` **5.101.2** (`package.json` du paquet).

Cité depuis `_tsup-dts-rollup.d.ts` :

- l. 1863-1876, `declare interface QueryState` : porte **à la fois** `status: QueryStatus` et
  `fetchStatus: FetchStatus`.
- l. 1880 : `declare type QueryStatus = 'pending' | 'error' | 'success';`
- l. 330 : `declare type FetchStatus = 'fetching' | 'paused' | 'idle';`
- l. 1348-1372, `declare interface QueryFilters` : `predicate?: (query: Query) => boolean;`,
  `type?: QueryTypeFilter;`
- l. 1892 : `declare type QueryTypeFilter = 'all' | 'active' | 'inactive';`
- l. 1912 : `RefetchQueryFilters extends QueryFilters` (aucun champ propre) — c'est bien ce type
  qu'accepte `refetchQueries(filters?, options?)` (l. 1309).

**Conclusion** : `q.state.status === 'error'` est le bon prédicat. `fetchStatus` décrit l'activité
réseau *en cours* (`'paused'` = en attente de connexion), pas le résultat de la dernière résolution ;
il ne recouvre pas l'échec.

### Constat non signalé par l'énoncé, vérifié dans le code de la lib

L'énoncé dit « relance TOUTES les requêtes **actives** ». C'est plus large que ça :
`queryClient.refetchQueries(filters)` délègue à `queryCache.findAll(filters)` (`queryClient.js`
l. 165-171), et `matchQuery` (`utils.js` l. 21-23) applique `const { type = "all" } = filters`.
Sans filtre, l'appel actuel rejoue donc **tout le cache**, requêtes démontées comprises.
À comparer avec `invalidateQueries` / `resetQueries` de la même lib, qui forcent explicitement
`type: "active"` (`queryClient.js` l. 134 et 159) : la bibliothèque elle-même considère
« active » comme le défaut raisonnable d'un refetch.

## Décision demandée : `type: 'active'` — RETENU

Filtre appliqué : `{ type: 'active', predicate: (query) => query.state.status === 'error' }`.

Arguments retenus :

1. Le but de l'issue est de supprimer du trafic inutile. Une requête en erreur mais **démontée**
   n'affiche rien à l'écran : la relancer produit exactement le gaspillage visé.
2. Rien n'est perdu. Une requête en erreur n'a pas de données, elle est donc `stale` ; son prochain
   montage déclenche un refetch par le `refetchOnMount` par défaut.
3. C'est le défaut que la lib s'applique à elle-même pour `invalidateQueries`/`resetQueries`.

Contre-argument reconnu (la bannière est globale, donc on pourrait vouloir tout réparer) : il est
couvert par le point 2 — le rétablissement de l'écran démonté est simplement différé à son montage.

Limite assumée, hors périmètre XS : en mode avion « pur », le `networkMode: 'online'` par défaut de
TanStack Query **met en pause** un premier chargement (`fetchStatus: 'paused'`, `status: 'pending'`)
au lieu de le faire échouer. Une telle requête n'est pas `error` et n'est donc pas relancée par
`retry()`. Ce n'est pas une régression : `onlineManager` reprend automatiquement les fetches en
pause au retour de la connexion. Élargir le prédicat à `fetchStatus === 'paused'` doublonnerait ce
mécanisme.

## Changements

`frontend/src/contexts/NetworkStatusContext.tsx`

- `retry()` : `refetchQueries()` → `refetchQueries({ type: 'active', predicate: (query) => query.state.status === 'error' })`.
- Le `.finally(() => { networkStatusStore.clear(); setIsRetrying(false) })` est **inchangé**
  (critère d'acceptation n° 2), et un commentaire le protège explicitement.
- **JSDoc l. 22 remis d'aplomb.** Il affirmait déjà « `retry()` relance les requêtes TanStack Query
  échouées » — faux au moment où il a été écrit. Il devient vrai, et est précisé pour refléter la
  sémantique réellement livrée : « les requêtes TanStack Query **MONTÉES** dont la dernière
  résolution est en échec ». Idem pour le JSDoc du champ `retry` de l'interface `NetworkStatus`
  (l. 34), qui disait « les requêtes en échec » sans la restriction.

`frontend/src/contexts/NetworkStatusContext.test.tsx` (nouveau, 3 tests)

1. **`relance la requête en erreur et laisse la requête en succès intacte`** — monte deux `useQuery`
   réelles (une résolue, une rejetée), clique sur le bouton câblé à `retry()`, puis asserte
   `koCalls === 2` **et** `okCalls === 1`. C'est la seconde assertion qui distingue un prédicat
   correct d'un prédicat absent (PIT-S56-001 / PIT-S54-002 : une seule observation d'appel ne prouve
   rien).
2. **`ne relance pas une requête en erreur dont aucun observateur n'est monté`** — seed une requête
   en erreur sans observateur via `fetchQuery(...).catch()`, vérifie `getQueryState(['orphan']).status === 'error'`,
   puis asserte qu'après `retry()` son `queryFn` n'a **pas** été rappelé. Preuve directe de
   `type: 'active'`.
3. **`efface la bannière et sort de isRetrying même sans aucune requête en erreur`** — aucune query
   en erreur, `reportServerError()` posé, `retry()` : `getIssue()` retombe à `null` et `isRetrying`
   à `false`, sans aucun refetch. Couvre le critère d'acceptation n° 2 dans le cas limite « zéro
   query en erreur » explicitement demandé.

Aucun mock de module partagé, aucun `mockReset` global (PIT-S61-001) : compteurs locaux réinitialisés
en `beforeEach`, `QueryClient` neuf par test. Aucun nouveau `data-testid` exposé en production
(les testids du fichier vivent dans des composants sondes internes au test) → pas d'impact
coverage-e2e.

## Preuves d'exécution (toutes via `rtk proxy`, code de sortie lu)

| Commande | Sortie | Exit |
|---|---|---|
| `npx vitest run src/contexts/NetworkStatusContext.test.tsx` | 3 passed / 3, **0 ligne stderr** | `0` |
| `npx vitest run` (suite frontend complète) | 1256 passed, 2 failed, 110/111 fichiers verts | `1` |
| `npx tsc --noEmit` | 0 `error TS`, 0 sur mes fichiers | `0` |
| `npx eslint src/contexts/NetworkStatusContext{,.test}.tsx` | aucune sortie | `0` |
| `npx prettier --check src/contexts/NetworkStatusContext{,.test}.tsx` | « All matched files use Prettier code style! » | `0` |

Les **2 tests rouges de la suite complète** sont
`useEventEditConflict — garde anti-boucle keep-mine (#310)`, hors de mon périmètre. Vérifié et non
supposé : `git status --porcelain` pris avant le run montre
`M frontend/src/hooks/useEventEditConflict.ts` et `?? frontend/src/hooks/useEventEditConflict.test.tsx`
— c'est le WIP de l'agent #310 dans le working tree partagé (PIT-S72-006). Je n'y ai pas touché.

### Contrôle négatif joué (deux variantes, fichier restauré depuis une copie scratchpad)

| Mutation du code de prod | Résultat attendu | Résultat obtenu | Exit |
|---|---|---|---|
| prédicat retiré (`{ type: 'active' }` seul) | test 1 rouge | **2 failed / 1 passed** — tests 1 et 3, `AssertionError: expected 2 to be 1` sur `okCalls` | `1` |
| `type: 'active'` retiré (prédicat seul) | test 2 rouge | **1 failed / 2 passed** — test 2, `AssertionError: expected 2 to be 1` sur `orphanCalls` | `1` |

Chaque moitié du filtre est donc réellement couverte par une assertion qui rougit sans elle.
Fichier restauré et re-vérifié : la ligne `refetchQueries` porte bien les deux clés.

## Ce qui n'a PAS été vérifié

- **`next build` non lancé** — interdit par la contrainte de vague (exclusivité stack Next/Playwright
  à l'agent #527, `.next` unique pour le worktree). PIT-S22-001 : le gate lint de `next build`
  attrape des erreurs invisibles à `tsc` et à Vitest. Mitigation partielle : `eslint` lancé
  directement sur mes deux fichiers, exit `0`. Le `next build` de fin de vague reste le juge.
- **Aucun E2E** — la bannière réseau n'a pas de spec Playwright dans mon périmètre, et `frontend/e2e/**`
  est hors périmètre. Le comportement réseau réel (rétablissement après coupure) n'est donc pas
  prouvé de bout en bout ; seule la mécanique de filtrage l'est, au niveau unitaire.
- **Aucune mesure du trafic réellement économisé** en usage réel (dépend du nombre de queries en
  cache au moment du clic).

## Recommandations suite

Pas de `RECOMMAND_TEST_RUNNER` car la suite frontend a été jouée intégralement ici (1256 verts, les 2 rouges appartenant au WIP #310) ; pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY_EXPERT` car le changement est purement client, sans schéma, sans endpoint et sans donnée personnelle.

STATUS: COMPLETED
