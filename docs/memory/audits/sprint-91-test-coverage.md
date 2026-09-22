# Audit tests — Sprint 91 (Frise : instant, durée, série)

> Généré en fin de Phase 6. Un marqueur de manque bloque la PR (Phase 9) — ce document n'en contient aucun.
> Branche `sprint/91`, base `3e9aa77` (tête de `origin/dev` au démarrage). Commits de code : `18c4176` (#676), `9b8cd6e` (#594), `9d583db` (#595), `584ccd6` (correctif de review, spec seule).
> **Aucun changement backend** : la suite backend n'est pas rejouée en local (la CI de la PR la joue).

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-012 | Borne de série `recurrenceEndDate` : honorée telle quelle, **incluse** ; horizon 5 ans sans borne | OUI (API → view-model frise → formulaire d'édition) | ✅ existant (`EventServiceImpl`, non modifié) | ⚠ N/A (aucun changement backend) | ✅ `event.test.ts`, `TimelineEditHost.test.tsx` (#676) ; `lib/recurrence.test.ts`, `recurrence-marks.test.ts` (#595) | ✅ `sprint-91-edit-bounded-series-end-date` | ✅ même spec (ouverture depuis la frise d'une série bornée, date affichée, hint absent) + `sprint-91-recurrence-marks` (fantômes EXACTS jusqu'à la borne incluse) |
| BR-EVE-006 | Récurrence WEEK/MONTH/YEAR (occurrence k depuis l'origine) | NON (calcul frontend, API = une ligne par série) | ⚠ N/A | ⚠ N/A | ✅ `lib/recurrence.test.ts` (31 janv. mensuel, 3 unités, plafond) | ✅ `sprint-91-recurrence-marks` (3 frises) | ⚠ N/A (rendu, pas un flux multi-systèmes) |
| BR-EVE-009 | Encre lisible : libellé du pin en encre de page, garde-fou contraste réservé aux barres | NON | ⚠ N/A | ⚠ N/A | ✅ `EventPill.test.tsx` (#594) | ✅ `sprint-91-event-pin` (libellé en encre, 5 zooms), `timeline.spec` (libellé de secours sur barre) | ⚠ N/A |
| BR-EVE-011/013 | Série archivée : grisée, `↻` conservé, ni fantôme ni connecteur | NON | ⚠ N/A | ⚠ N/A | ✅ `recurrence-marks.test.ts` (archivé) | ✅ `sprint-61-archived-events` (non régression) | ⚠ N/A |

Cross-system flow = OUI seulement pour BR-EVE-012 ; son E2E métier existe et passe (suite complète, passe production).

## Tests créés
- `frontend/e2e/sprint-91-edit-bounded-series-end-date.spec.ts` (#676)
- `frontend/e2e/sprint-91-event-pin.spec.ts` (#594 — pin/barre, 5 zooms, cible ≥ 44 px, 3 frises)
- `frontend/e2e/sprint-91-recurrence-marks.spec.ts` (#595 — `↻`, fantômes bornés, connecteur, virtualisation, **ordre de peinture** et non-captation du clic, 3 frises)
- `frontend/src/lib/recurrence.test.ts`, `frontend/src/components/timeline/recurrence-marks.test.ts` (#595)
- Tests unitaires étendus : `event.test.ts`, `TimelineEditHost.test.tsx`, `EventPill.test.tsx`, `TimelineView.test.tsx`, `TimelineMobilePortrait.test.tsx`, `TimelineMobileLandscape.test.tsx`, `TimelineSidebar.test.tsx`, `TimelineGroupHead.test.tsx`, `zoom.test.ts`, `virtualization.test.ts`
- Specs existantes modifiées (auditées par le lead, justifiées) : `sprint-85-timeline-group-head.spec.ts`, `timeline.spec.ts` (#594)

## Contrôles négatifs (armement)
- #676 : `null` réintroduit dans `TimelineEditHost` → test « série bornée » rouge (1 failed / 21 passed), restauré.
- #595 : `return null` en tête de `RecurrenceMarks` → 3 échecs « fantôme monté près de A », restauré (shasum identique).
- Correctif de review `584ccd6` : `z-index:50` posé sur les marques → 3/3 frises rouges sur « centre des occurrences réelles » ; restauré (shasum identique, `timeline.css` = `9d583db` vérifié par le lead) → 8/8 vert.
- #594 : **non joué** (déclaré par l'agent) — la distinction pin/barre reste couverte par les assertions de géométrie et d'attribut `data-event-kind` de `sprint-91-event-pin`.

## Résultats des runs (lead, sur le worktree)
- **Frontend complet** `./scripts/test-quiet.sh frontend` sur `863da7b` (dernier commit de code produit = `9d583db`) : `next build` OK · Vitest **136 fichiers / 1698 tests passés** · `tsc --noEmit` OK · `next lint` OK (exit 0). Le correctif `584ccd6` ne touche qu'une spec E2E.
- **E2E suite complète** sur `863da7b` contre `next dev` (webpack) + backend e2e bâti depuis HEAD : **392 passés / 5 échoués / 8 sautés / 1 non exécuté** (406 tests, 2 workers, 7,6 min, un seul bloc « Running »). Les 5 échecs sont hors sprint :
  - `sprint-77-theme-visual:620` — contrôle d'armement de la comparaison de captures ; faux rouge darwin connu (`--ignore-snapshots` : le garde-fou refuse d'écrire, comportement voulu).
  - `sprint-90-first-contact:407/422/436/450` (#629, squelettes de segment) — attendent une réponse RSC `next-router-prefetch: 1` ; **Next.js ne précharge pas en `next dev`**. Aucun fichier du sprint ne touche `loading.tsx`, squelettes ni cette spec.
- **Passe en build de production** sur `584ccd6` (`next build` + `next start`, `NEXT_PUBLIC_API_URL=/api`, `E2E_API_PROXY_TARGET=:8086`, oracles 200/401) : `sprint-90-first-contact` + `sprint-91-edit-bounded-series-end-date` + `sprint-91-event-pin` + `sprint-91-recurrence-marks` → **24/24 passés** (9,7 s). **Confirme que les 4 échecs `sprint-90` venaient du mode `next dev`**, et que les 3 specs du sprint passent aussi en production.
- **Spec `sprint-91-recurrence-marks` après correctif** : 8/8 (run de l'agent) + incluse dans la passe production.
- **E2E des 17 specs qui citent la frise** (run de #595) : 122/122.
- `sprint-63-de-overflow-audit:397` : vert dans le run complet ; l'échec vu par #594 (purge `zz-purge`, 500 `uq_categories_owner_name`) ne s'est pas reproduit — cause préexistante probable (course de création de la catégorie poubelle, cf. `issue-594-done.md`).
- **Backend** : non rejoué (0 fichier `backend/` dans le diff du sprint).

## Vérifications non automatisées
- **Sonde visuelle du lead** (Playwright jetable, supprimée, non commitée) sur `584ccd6` : desktop 1280×800, portrait 390×844, paysage 844×520, clair ET sombre (classe `dark` vérifiée), légende — 11/11. Rendu conforme (pin + libellé en encre, `↻`, fantômes, connecteur, légende) sur les 3 frises et les 2 thèmes. Un défaut **préexistant** mesuré : `⋯` des barres mobiles à 1,07:1 en sombre (identique sur la base `3e9aa77`) → follow-up. Détail : `docs/memory/sprints/sprint-91/review-batch.md`.
- **Designer** : 10 écarts visuels arbitrés, aucune correction de code produit retenue (même fichier).

## Ce qui n'est PAS prouvé
- Ordre de peinture : prouvé aux points sondés seulement ; la sensibilité de l'assertion `overlapMisses` seule n'a pas été armée séparément.
- Aucun E2E d'édition depuis la frise sur le chemin **mobile** (#676 : même host, vérifié par lecture de code).
- Rendu des captures de référence Linux (`sprint-77-theme-visual`) : laissé à la CI.
- Lisibilité de deux occurrences RÉELLES superposées : hors périmètre (pas d'empilage, arbitrage dev).

## Conclusion
**Prêt pour PR.** Aucun manque de couverture sur les BR du sprint ; tous les échecs observés en local sont expliqués et hors sprint (faux rouge darwin connu ; 4 specs de préchargement confirmées vertes en build de production). La CI Linux de la PR reste le gate de merge (backend, captures de référence).
