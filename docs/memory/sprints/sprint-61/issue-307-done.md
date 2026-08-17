# Issue #307 — [PRODUIT] Que faire d'un événement archivé ? (réouverture / désarchivage)

**Sprint :** 61 · **Vague :** 1 · **Taille :** M · **Modèle :** opus / effort high
**Commit :** `1dfb527` — 10 fichiers, +675 / −22

## Décision produit appliquée

**Option A** (tranchée par le dev au démarrage du sprint) : l'événement archivé reste atteignable.
L'option B (archivage définitif) a été écartée.

Matérialisation retenue par le subagent : des onglets **« Actifs · n / Archivés · n / Tous · n »**
au-dessus de la sous-frise du produit. En vue « archivés », l'événement **revient dans la frise**,
donc `TimelineEditHost` le rouvre pré-rempli sans qu'aucune modification de la frise ni du
formulaire ne soit nécessaire. Sa ligne d'historique porte un badge et un bouton « Désarchiver ».

Le filtre en dur `!event.archived` (`ProductDetailView.tsx:59`) est remplacé par un **état de vue**
`EventViewFilter = 'active' | 'archived' | 'all'`, comme demandé au briefing pour que #230 puisse
brancher le grisage sans réécrire la logique.

## BR touchées

- **BR-EVE-013** (archived PATCH-only) — désarchivage via PATCH minimal `{archived, version}`.
- **BR-EVE-011** (quota events actifs) — **non régressée** : le compteur `active` est calculé sur
  `!archived` indépendamment du filtre de vue, avec un test de non-régression dédié. C'était le
  risque principal identifié au briefing.
- **BR-EVE-015** (optimistic locking) — `version` threadée, 409 déterministe, message inline dédié
  et re-fetch. Sans `version`, un désarchivage fondé sur un cache périmé serait devenu un
  écrasement silencieux.

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `frontend/src/components/products/ProductDetailView.tsx` | filtre en dur → état de vue pilotant frise + historique |
| `frontend/src/components/products/ProductDetailView.test.tsx` | +7 tests |
| `frontend/src/hooks/useSetEventArchived.ts` (+ test, 4) | mutation TanStack, invalidation `products.all` y compris sur 409 |
| `frontend/src/services/eventService.ts` | `setEventArchived`, payload minimal |
| `frontend/public/locales/{fr,en,de,es}/products.json` | clés i18n, 4 locales |
| `frontend/e2e/sprint-61-archived-events.spec.ts` | 3 specs — rend enfin testable le critère de #232 |

Interdictions du briefing **respectées** (vérifié par le lead sur `git show --stat`) : zéro
modification backend, zéro `EventEditForm*`, zéro `timeline/**`, zéro CSS.

## Tests

- **Vitest : 900/900 verts.**
- `tsc --noEmit` : 0 erreur · `eslint` sur les fichiers touchés : 0 · `npm run build` : OK
  (PIT-S22-001 respecté) · prettier : OK.
- ⚠️ **E2E NON JOUÉ** — voir « Recommandations suite ».

## Signaux mémoire

- **[MEMORY:pitfall]** Vitest 3.2.7 : un mock de module **partagé** rendant une promesse rejetée,
  combiné à `mockReset()`/`mockClear()` en `beforeEach`, fait rapporter la valeur de rejet comme un
  échec de test (`Serialized Error`, message `undefined`) **alors que le rejet est bien traité**.
  Établi par bisection : passe sans `beforeEach`, échoue avec `mockReset`, avec `mockClear` ou avec
  une promesse pré-`catch`ée. Remède : recréer un `vi.fn()` par test. Variante de PIT-S11-002.
- **[MEMORY:decision]** Désarchivage = PATCH minimal `{archived, version}` + message inline
  (conflit / générique). La modale comparative #231 n'est **pas** réutilisée : elle diffe des
  saisies, alors qu'ici un seul booléen change.
- **[MEMORY:decision]** `.mt-evt--archived` (opacité .45) appliqué à la **pastille décorative**,
  pas au titre — une opacité .45 sur du texte passe sous le seuil de contraste AA. À reprendre par
  #230, qui applique le grisage dans la frise.

## Recommandations suite

- **RECOMMAND_TEST_RUNNER — E2E non joué.** Aucun serveur sur `:3000` / `:8080` pendant la vague ;
  `sprint-61-archived-events.spec.ts` n'a **jamais tourné**, seule sa compilation est prouvée.
  Stack à monter selon `docs/memory/sprints/sprint-47/e2e-local-runbook.md`, `--workers=1`.
  **À traiter en Phase 6 — bloquant pour la PR.**
- **RECOMMAND_FOLLOWUP** : mutualiser `httpStatusOf`, aujourd'hui dupliqué en 6 exemplaires
  (`ProductDrawer`, `CategoryDrawer`, `DeleteConfirmDialog`, `useEventEditConflict`,
  `categoryService`, `ProductDetailView`). [triage XS | domaine events/frontend]
- **RECOMMAND_FOLLOWUP** : le commentaire de `sprint-42-events.spec.ts:262-268` (« pas de vue
  archivés ») est désormais périmé. [triage XS | domaine events]
- Pas de RECOMMAND_SECURITY : aucun changement d'authentification ni de PII.
- Pas de RECOMMAND_UI_DESIGN : primitives du DS existantes, aucune nouvelle règle CSS.

## Non vérifié (déclaré par le subagent)

- Rendu réel en navigateur (thème clair / sombre, mobile).
- Contraste **mesuré** du badge et du bouton « Désarchiver ».
- Comportement du 409 contre un vrai backend.

## ABSORBED

Aucune.

STATUS: COMPLETED
