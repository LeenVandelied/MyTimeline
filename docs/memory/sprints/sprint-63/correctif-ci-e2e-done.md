# Correctif CI — série `event-form` instable (post-PR, cycle 2)

**Commit :** `f4082f1` — 2 fichiers, +163/-13
**Déclencheur :** le check requis `e2e` rouge sur la PR #449 (`028519b`).

## Ce que la CI a démenti

Le premier audit local avait excusé 4 échecs `event-form` par `PIT-S52-001` (« mesures macOS non
concluantes »). **Erreur de catégorie**, corrigée avant la PR : ce pitfall porte sur des écarts de
métrique de police, or un test qui expire à 300 s n'a produit **aucune** mesure.

La CI a tranché : les 4 tests sont instables **partout**. `fr`/`en`/`de` flaky (verts au retry),
`es` en échec définitif. Ce n'était pas macOS.

## Cause racine — trois pièces qui s'emboîtent

1. La détection du chemin utilisait `getByTestId('timeline-event-more').count()`. **`.count()`
   n'auto-attend pas**, et il était évalué immédiatement après `product-detail-view`.
2. `useMediaQuery` (`useMediaQuery.ts:20`) rend **`false` au premier rendu** — comportement
   SSR-safe voulu. La frise est donc **desktop** jusqu'à ce que l'effet d'hydratation bascule.
3. Aux largeurs mobiles, le test prenait donc la branche desktop, cliquait la pastille
   (`timeline-event` existe dans les deux variantes, **et ce clic auto-attend**), puis attendait
   `event-drawer-edit` — **jamais monté par `TimelineMobilePortrait`**. Avec `actionTimeout: 0`
   (défaut Playwright), le clic n'a **aucun budget propre** : il consommait les 300 s du test.

L'auteur de la spec avait pourtant **documenté les deux chemins** dans son audit
(`event-drawer-edit` desktop-only, mobile via `timeline-event-more` → `timeline-actionsheet-edit`).
Il connaissait le fait ; sa condition de routage ne l'appliquait pas.

## Seconde cause, trouvée en corrigeant la première

**`.tsqd-parent-container` (React Query Devtools) intercepte le clic** sur `event-drawer-edit` —
42 tentatives repoussées. Cet élément était exclu des **mesures** depuis le S59, mais **personne
n'avait vu qu'il bloquait aussi les clics**.

Ce n'est pas un artefact local : la CI e2e tourne sur `next dev` (`ci.yml:263`), l'outillage de dev
y est présent.

## Correctif

- Variante résolue par **`matchMedia` dans la page**, avec les mêmes requêtes et la même priorité
  que `TimelineResponsive.tsx`, puis **vérifiée** en attendant la racine de cette variante
  (`timeline-view` / `timeline-mobile-portrait` / `timeline-mobile-landscape`).
- Budget explicite `PATH_TIMEOUT_MS = 20_000` sur chaque clic du parcours. Chemin absent ⇒ échec
  **en 20 s**, nommant la locale, la largeur et la racine manquante — au lieu d'expirer à 300 s.
- `neutralizeDevToolingPointerEvents` (`e2e/support/dev-tooling.ts`) pose `pointer-events: none` sur
  l'outillage de dev. Il **reste dans le DOM**, donc l'exclusion de mesure existante reste valide :
  seul le chemin de clic change.

## Gardes non affaiblies — vérifié par le lead sur le diff

| Contrôle | Résultat |
|---|---|
| `skip` / `fixme` / `test.fail()` ajoutés | **0** |
| Timeouts | **resserrés**, pas allongés (budgets de 20 s là où il n'y en avait aucun ; commentaire interdisant de les rallonger) |
| Largeurs / locales | **12 et 4, intactes** |
| `timeline.spec.ts` | **non touché** |

## Preuve

Run local ciblé, `--retries=0` : **10/10 verts en 56,1 s**.
Durées par test : **fr 11,8 s · en 11,2 s · es 10,7 s · de 10,6 s** — marge ~27× sur le budget de
300 s. C'était la question ouverte : un vert à 250 s serait resté un frein.

**CI (`f4082f1`) : 7 jobs sur 7 verts.**

| | Avant (`028519b`) | Après (`f4082f1`) |
|---|---|---|
| Job `e2e` | 43 min 50 s, échec | **11 min 11 s**, succès |
| Playwright | 225 passed / 2 failed / 3 flaky | **229 passed / 0 failed / 0 flaky** |

## Le second échec (`timeline.spec.ts:966`) — résolu sans être touché

Spec **préexistante**, non modifiée par le sprint, verte sur les 5 derniers runs de `dev`, en échec
sur `028519b`.

L'agent a rendu **`INDÉTERMINÉ`** plutôt qu'une conclusion confortable, après avoir éliminé :

- **#446** — `spacing.css` **ajoute** `--z-popover-over-modal: 75` sans modifier aucune valeur ;
  aucun composant `timeline` n'importe `ui/select` / `ui/popover` / `ui/dropdown-menu` ; et un
  `z-index` ne retire pas un nœud du DOM (le log dit « locator jamais résolu », pas « masqué »).
- **Flake préexistant** — 3/3 tentatives identiques, sur des produits seedés distincts.
- **Virtualisation des lanes** (`LANE_VIRTUALIZATION_MIN_ROWS = 60`) — piste qu'il jugeait forte et
  qu'il a **lui-même réfutée** : `timeline.spec.ts:1004/1222/1259/1300` tournent après, sur le même
  compte plus chargé, et passent.
- **Régression atteignable seule** — le test passe **en isolation** sur la branche (6/6, 19,6 s).

**La CI a confirmé le faisceau sans qu'il ait eu à l'affirmer** : `timeline.spec.ts:966` passe sur
`f4082f1`, aucune ligne de cette spec n'ayant été modifiée. C'était bien une **contamination
d'exécution** par les attentes de 5 minutes.

## Follow-up d'infrastructure — non appliqué, à tracer

**Un échec E2E en CI ne laisse aujourd'hui aucun artefact.**
`ci.yml:310-316` uploade `frontend/playwright-report/`, mais `playwright.config.ts:22` force
`reporter: process.env.CI ? 'github' : 'list'` — le reporter `github` **n'écrit jamais** ce
répertoire. `gh api .../runs/33387548590/artifacts` renvoie une **liste vide**. Les traces
`on-first-retry` vont dans `frontend/test-results/`, uploadé nulle part.

C'est précisément cette absence qui a empêché de trancher le second défaut par un snapshot DOM.

Correctif proposé : `reporter: [['github'], ['html', { open: 'never' }]]` en CI + ajouter
`frontend/test-results/` à l'upload. **À vérifier sur un échec provoqué**, pas sur un job vert
(`PIT-S58-004` : une garantie citée n'est pas une garantie).

## Non vérifié

- Suite complète non rejouée **localement** : les conditions de contamination (~60 produits, runner
  chargé) ne sont pas reproductibles ici. C'est la CI qui a validé.
- **Mesures de débordement non revalidées** : l'agent a validé le **routage**, pas les largeurs.
  macOS ≠ jammy (`PIT-S52-001`).
- Serveur `next dev` laissé debout sur `:3000` par l'agent — énoncé comme fait, pas comme garantie.

## Signaux mémoire

- `[MEMORY:pitfall]` — `locator.count()` **n'auto-attend pas**. L'utiliser pour router un parcours
  responsive crée une course silencieuse quand la bascule est un `matchMedia` JS rendant `false` au
  premier rendu (SSR-safe). Résoudre la variante par `matchMedia` **puis vérifier sa racine** sous
  budget court.
- `[MEMORY:pitfall]` — `actionTimeout: 0` est le **défaut** Playwright. Sans budget explicite sur
  les clics d'un parcours à branches, une erreur de routage se paie au budget du **test** (300 s)
  × retries : le job est passé de ~15 min à 42 min.
- `[MEMORY:pitfall]` — `.tsqd-parent-container` était exclu de la **mesure** depuis le S59 mais pas
  du **clic**. La CI e2e tourne sur `next dev` : l'outillage de dev est un obstacle au clic, pas
  seulement un faux positif de mesure.
- `[MEMORY:bug]` — reporter CI `github` + upload de `playwright-report/` ⇒ **aucun artefact sur
  échec**. Vérifier l'upload sur un échec réel, jamais sur un job vert.
- `[MEMORY:pitfall]` (lead) — invoquer `PIT-S52-001` pour excuser un **timeout** est une erreur de
  catégorie : ce pitfall couvre les écarts de métrique de police, et un test qui expire n'a produit
  aucune mesure. Signal de reconnaissance : l'échec est un `locator.*: Test timeout`, pas un écart
  de valeur.

STATUS: COMPLETED
