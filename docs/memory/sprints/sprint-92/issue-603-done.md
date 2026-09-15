# Issue #603 — Liste produits : prochain événement (récurrences comprises) et nombre d'événements

**Vague :** 1 (en parallèle de #621) · **Agent :** fullstack-dev (opus, high) · **Spawn ref :** `449a7f2`

## Commit (vérifié par le lead)
- `f1bf100` — :bug: fix(products): prochain événement (récurrences comprises) et nombre d'événements dans la liste (#603)
- `git show --stat` : 12 fichiers, +784/−178 — `lib/next-occurrence.ts` (+115) et son test (+159), `dashboard/lib.ts`, `dashboard-components.test.tsx`, `ProductsListView.tsx` et son test, `products.json` ×4, `e2e/sprint-92-products-next-event.spec.ts` (+251), `e2e/sprint-89-local-date-west.spec.ts` (8). Aucun fichier de #621.
- `git branch --contains f1bf100` = `sprint/92`.

## Résumé
- Helper mutualisé `frontend/src/lib/next-occurrence.ts` : `nextStart(event, now)`, `nextEvent(product, now)` (→ `{title, start: 'YYYY-MM-DD'}`), `startOfLocalDay`. Comparaison au début du jour LOCAL (un événement du jour reste « à venir » toute la journée). Récurrence via `occurrenceStart` depuis l'origine (pas de dérive au 28), bornée par `seriesHorizon` (`recurrenceEndDate` inclusive, sinon 5 ans comme les fantômes de la frise), boucle plafonnée `MAX_OCCURRENCES`. Archivés exclus.
- Consommateurs : `ProductsListView` + dashboard `ProductList` / `ProductCarousel` (re-export dans `dashboard/lib.ts`). **Changement de comportement voulu du dashboard** : récurrences désormais vues, événement du jour inclus.
- Colonnes : Produit (pastille + nom + catégorie mono dessous ; testids `products-row-category-*` conservés) · Prochain événement (titre + `<time class="mt-date--long">` ISO, toujours visible) · mini-frise (`md:`) · nb d'événements (`sm:`) · Actions.
- **Écart au briefing assumé par l'agent** : la catégorie passe sous le nom (handoff §5) → la colonne disparaît, donc le tri `categoryAsc` aussi. Tris : `nextEvent` (défaut ; sans échéance en dernier, départage par nom), `nameAsc`, `nameDesc`.
- Compteur = événements non archivés (même base que `counts.active` du détail). Nombre visible `aria-hidden` + pluriel `eventsCount` en sr-only.
- Sans échéance : `—` `aria-hidden` + sr-only `noUpcoming`, pas de `<time>`.
- i18n ×4 : ajout `columns.{product,nextEvent,events}`, `noUpcoming`, `eventsCount`, `sort.nextEvent` ; retrait `columns.{name,category,lastActivity}`, `noActivity`, `sort.{categoryAsc,lastActivityDesc,lastActivityAsc}` ; `subtitle` reformulé. `list.count` laissée telle quelle (non consommée).

## Tests (déclarés par l'agent)
- Vitest 1747/1747 (138 fichiers) · tsc 0 · `format:check` OK · eslint 0.
- `--list` : spec neuve 2 tests ; `sprint-89-local-date-west` 1 test (adaptée : testid `products-row-next-*`, texte ISO).
- Armement : récurrence désactivée → 11 rouges ; comparaison à `now` → 3 rouges ; fichier restauré (`cmp`).
- **E2E NON exécuté par l'agent — à jouer par le lead après la vague** : `sprint-92-products-next-event`, `sprint-89-local-date-west`, `products`, `categories`, `sprint-90-first-contact`.

## Fichiers de contexte lus (déclaration de l'agent)
- cp-frontend (Sync Zod, i18n) ; br-events BR-EVE-006/011/012/013 ; br-products BR-PRO-007 l.83 ; pit-frontend PIT-S82-002, PIT-S91-002 l.1440 ; handoff l.105-120, l.182-191.
- `.claude/rules/frontend-stack.md` NON LU ; `.claude/rules/conventions.md` NON LU.

## Non vérifié
- E2E (seulement `--list`) ; rendu visuel et paliers responsive réels.
- Série non bornée démarrée il y a plus de 5 ans → « aucune échéance » (cohérent avec la frise, mais décision produit).
- `ProductSparkline` inclut toujours les archivés (hors périmètre).
- Spec E2E potentiellement instable si un run franchit minuit.

## Incident d'environnement (causé par le lead)
Le lead a lancé `ln -s <dépôt principal>/frontend/node_modules frontend/node_modules` en croyant le dossier absent ; il existait déjà (installation réelle) → création d'un symlink IMBRIQUÉ `frontend/node_modules/node_modules`, que Node résout avant les vrais paquets : Vitest (`eachMapping`) et eslint (`eslint-patch`) cassés dans le worktree. L'agent l'a diagnostiqué et retiré (`unlink`, cible intacte). Vérifié par le lead : symlink imbriqué absent, `node_modules` du worktree = 569 entrées.

## Signaux mémoire
- [MEMORY:pitfall] `ln -s <cible> node_modules` quand `node_modules` existe déjà comme dossier crée `node_modules/node_modules`, que la résolution Node privilégie → versions étrangères chargées (Vitest/eslint cassés). Tester `test -e` AVANT, ou `ln -sn` sur un chemin absent seulement.
- [MEMORY:decision] `nextStart` borné par `seriesHorizon` (5 ans pour une série non bornée) — même règle que les fantômes de la frise.

## Recommandations suite
- RECOMMAND_FOLLOWUP : trancher si une série non bornée doit avoir une prochaine occurrence au-delà de 5 ans (liste/dashboard vs frise) [XS | produit].
- Pas de RECOMMAND_TEST_RUNNER car le lead joue l'E2E après la vague.
- Pas de RECOMMAND_DB_EXPERT car changement frontend uniquement.
- Pas de RECOMMAND_SECURITY car aucune surface auth ni donnée personnelle touchée.
- Pas de RECOMMAND_UI_DESIGN pré-implémentation car revue Designer batch prévue en fin de sprint.

STATUS: COMPLETED
