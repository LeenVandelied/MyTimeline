# Correctif — le défilement de la frise ancré sur le temps, pas sur les pixels

**Commit :** `3dcc5ea` — 3 fichiers, +297/-9 | **Origine :** review de la PR #449, défaut **préexistant**
**Issue de suivi :** #451 (non refermée par ce commit)

## Pourquoi ce correctif existe

La review de la PR #449 est partie d'un flake E2E (`timeline.spec.ts:966`, ~1 échec sur 2 en CI) et a
abouti à un **défaut produit** : au zoom arrière sur une frise à large étendue, l'affichage saute au
bord droit et **n'affiche plus aucun événement**, alors que les lanes produit restent visibles.

## Mécanisme, démontré par mesure

Trois maillons, vérifiés indépendamment par le lead :

1. `zoom.ts` — `ZOOM_OUT` renvoie `{ ...state, level: ZOOM_LEVELS[i+1] }` : le **niveau** change,
   `offsetDays` **jamais**.
2. `TimelineView.tsx` — l'effet de resynchronisation portait une garde
   `if (zoom.offsetDays !== lastOffsetRef.current)`. `dayWidth` était bien dans ses dépendances,
   mais le corps était **sauté**.
3. `scrollToToday()` vivait dans un `useEffect(..., [])` : **montage uniquement**.

`scrollLeft` restait donc figé en **pixels** alors que l'échelle px/jour change au zoom. Le
navigateur **rabat** la valeur périmée au maximum.

**Contrôle négatif chiffré** (fixture : 3 événements, étendue 5501 j, aujourd'hui au jour 5000) :

| | `scrollLeft` mois | `scrollLeft` trimestre | max | pastille du jour |
|---|---|---|---|---|
| sans re-projection | 59677 | **26691** | 26691 | **0** |
| avec re-projection | 59677 | 24865 | 26691 | 1 |

`26691 = scrollWidth − clientWidth` à l'unité près. Signature identique relevée en conditions
réelles par le lead : `31348 / 32330 / 982`. Snapshot Playwright d'un échec : **zéro**
`data-testid="timeline-event"` alors que toutes les lanes sont rendues.

## Correctif

- **Ancre mémorisée en jours** (invariant au zoom), re-projetée à la nouvelle échelle dans le
  **repère PISTE de #392** (`scrollLeft / dayWidth`) — et non le repère RAIL centré de
  `scrollToToday`, les deux **ne sont pas interchangeables**.
- Rejeu du centrage sur changement d'**étendue** (`rangeStart` / `totalDays`), gardé par divergence
  d'ancre.
- Écritures de scroll en `behavior:'instant'`.
- Spec de garde (+134 l. dans `timeline.spec.ts`), **verte en CI**.
- Stub `Element.scrollTo` dans `vitest.setup.ts` (absent de jsdom, 44 tests rouges sinon).

## Deux défauts trouvés au passage, corrigés ici

1. **`scroll-behavior: smooth`** (`ds/components/timeline.css:127`) rendait toute mesure de
   `scrollLeft` non fiable : 4 lectures contradictoires (4, 16, 17, 17259) pour **deux** écritures
   identiques à 59677.
2. **Le centrage initial était calculé avant l'arrivée des données.** `computeRange([])`
   (`zoom.ts:122`) renvoie `min = max = today` puis ±30 j — une étendue **factice mais plausible**.
   `scrollToToday()` réussissait donc silencieusement sur des données absentes et n'était jamais
   rejoué : frise ouverte **13 ans avant aujourd'hui**, sans aucun symptôme d'erreur.

## Ce que le correctif NE ferme PAS

**L'échec CI persiste.** Run `33403743363` sur ce commit : `229 passed | 1 failed | 1 flaky`,
`timeline.spec.ts:966` rouge — puis **vert au rejeu du même commit**.

Historique du job `e2e` sur la branche : `028519b` échec · `f4082f1` succès · `8ab97d8` échec ·
`365723c` succès · `3dcc5ea` échec puis succès. Soit **~50 % avant comme après**. Avec un tel taux
de base, ni un échec ni un vert isolés ne permettent de conclure — **l'effet du correctif sur le
flake n'est pas mesuré**.

Précondition vérifiée présente en local au moment du dernier run vert (33/33) : 1056 événements,
étendue de **6361 jours**, 19 récurrents **tous sans date de fin**.

Suite déplacée dans **#451**, qui porte le point de reprise et le protocole de reproduction.

## Erreurs de méthode du lead, consignées

1. **Conclusion sur un échantillon de un, deux fois.** D'abord « contamination confirmée » après un
   seul run vert — démenti par le run suivant sur un commit de documentation. Puis « le correctif ne
   marche pas » après un seul run rouge — alors que le taux de base était déjà de 50 %.
2. **Contrainte présentée comme verrouillée alors qu'elle ne l'était pas.** Le briefing affirmait
   que 3 specs verrouillaient la formule de scroll de #392. Vérification : `scrollLeft` n'y figure
   que comme **mesure**, jamais comme assertion. La garantie tenait à un **commentaire** — famille
   `PIT-S58-004`. L'agent l'a signalé.
3. **Diagnostic périmé recyclé.** Le lead a affirmé que l'ancre était « keyée sur `dayWidth` seul,
   non corrigé », en reprenant un « non vérifié » d'un cycle antérieur que l'agent avait entre-temps
   traité.
4. **Reproche infondé à un agent** — accusé d'avoir esquivé le travail et cité un identifiant
   inexistant ; il existait et a produit le meilleur diagnostic de la session.

## Non vérifié

- Effet réel du correctif sur le taux de flake — demanderait plusieurs runs CI consécutifs.
- `rangeStart` changeant en cours de session sans changement de `dayWidth` : couvert par le rejeu
  d'étendue, non prouvé sous charge CI.
- Firefox / mobile non exercés sur ce chemin.

## Signaux mémoire

- `[MEMORY:bug]` — `scrollLeft` est en px, l'échelle px/jour change au zoom : le navigateur rabat la
  valeur périmée sur `scrollWidth − clientWidth` et la virtualisation démonte tout. **Toute position
  de défilement mémorisée dans une vue à échelle variable se stocke dans l'unité du domaine, jamais
  en pixels.**
- `[MEMORY:pitfall]` — mesurer `scrollLeft` sur un conteneur `scroll-behavior: smooth` : 4 lectures
  contradictoires pour 2 écritures identiques. Attendre deux lectures consécutives égales, et poser
  une position avec `behavior:'instant'`.
- `[MEMORY:pitfall]` — un effet de positionnement en `useEffect(..., [])` dans un composant dont les
  données arrivent par requête : la fonction **réussit** sur une étendue fausse et n'est jamais
  rejouée, **sans aucun symptôme d'erreur**. Keyer sur l'identité des **données**, pas sur le montage.
- `[MEMORY:pattern]` — distinguer « l'utilisateur a défilé » de « le code a défilé » sans écouter
  `wheel`/`pointerdown` : deux refs (`anchorDaysRef` mise à jour par le handler, `autoAnchorRef`
  posée à chaque écriture programmatique) ; leur divergence signale la prise de main.

STATUS: PARTIAL
BLOQUE_SUR: effet sur le flake CI non mesuré — suite dans #451
