# Traitement du signal RECOMMAND_TEST_RUNNER — Sprint 89

> Signal émis par l'agent #546 (`issue-546-done.md`) : « jouer `categories.spec.ts` (5 tests) et `next build` ».
> **Traité par le lead, pas par l'agent `test-runner`** : la mémoire du projet proscrit de lui déléguer l'E2E
> (quatre faux verdicts « E2E impossible », dont S73). Toutes les preuves ci-dessous ont été jouées par le lead.

## Ce qui était demandé, et ce qui a été joué

| Demande | Joué | SHA | Résultat |
|---|---|---|---|
| `next build` | `next build` de production, `NEXT_PUBLIC_API_URL=/api` et `E2E_API_PROXY_TARGET=http://localhost:8086` posés AU build | `7ed997c` | 52/52 pages, lint et types exécutés, exit 0 ; log réel de 107 lignes (pas un résumé RTK) |
| `categories.spec.ts` (5 tests) | Suite E2E **complète** (qui inclut les 5) contre `next start` :3100, backend `s89e2e` :8086 (image du 2026-09-14 09:35Z), base recréée, 2 workers | `7ed997c` | 368 passés / 10 échecs / 8 sautés / 1 non exécuté en 2,5 min |

## Détail pour `categories.spec.ts`
Les 5 tests ont été vus en progression et aucun ne figure parmi les échecs :
- l.89 création via le drawer ;
- l.107 édition via le drawer ;
- l.129 suppression sans produits liés ;
- l.151 suppression avec produits liés, réassignation puis suppression ;
- **l.197 (nouveau, #546)** suppression d'une catégorie ne portant qu'un produit archivé : bascule en réassignation.

## Échecs de la suite complète — hors #546
Les 10 échecs sont tous `sprint-77-theme-visual.spec.ts:580` « capture de référence » (5 pages × 2 thèmes) :
10 × `doesn't exist`, 0 × `did not match`. Références Linux absentes sur macOS, faux rouges connus ; les 10 PNG
`*-chromium-darwin.png` générés ont été supprimés. Le test « non exécuté » n'est pas identifié (l'un des 16 tests à
titre dupliqué ; les 371 titres distincts ont tous tourné). Le job CI `e2e` (Linux) fait foi.

## Complément post-revue
Après le correctif `aria-describedby` (`f5729ba`), `DeleteConfirmDialog.test.tsx` rejoué : 18/18 ; contre-épreuve
(ligne retirée → le cas « 409 sans cible » rougit). Les E2E n'ont pas été rejoués localement après ce commit
(attribut non vérifié par un spec) : c'est le job CI `e2e` sur la tête de PR qui fait foi.
