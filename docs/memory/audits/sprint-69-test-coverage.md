# Audit tests — Sprint 69

> Généré en fin de Phase 6. Récurrence : câbler le flag `capped` (#439 backend, #67 frontend).
> Résultats **mesurés** (re-run indépendant par le lead), pas rapportés par les subagents.

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Slice controller | Vitest frontend | E2E parcours |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-012 | `recurrenceEndDate` borne la récurrence + flag `capped` (troncature MAX_OCCURRENCES / horizon 5 ans) exposé via endpoint preview | NON¹ | ✅ (`RecurrenceExpansionServiceImplTest`, préexistant, non cassé) | ✅ (`RecurrencePreviewControllerTest` — 6 tests) | ✅ (`EventEditForm.test.tsx` — 5 tests #67) | ⚠ différé² |

¹ **Cross-system flow = NON** au sens « E2E métier obligatoire ». Il ne s'agit pas d'un flux multi-rôles avec handoff d'état (type billing : paiement→webhook→entitlement), mais d'un **calcul pur sans état** (`RecurrenceExpansionService`, 0 accès DB, 0 donnée utilisateur) consommé par un **hint UI mono-utilisateur, mono-écran**. Les deux extrémités sont couvertes en isolation (slice contrôleur + unit form). La valeur E2E résiduelle (le hint s'affiche-t-il face à un vrai backend) est réelle mais relève du `/create-e2e` post-merge, déjà planifié par le check coverage-E2E Phase 8.

² **E2E parcours différé** — le harnais Playwright exige la stack complète (backend up + frontend build) non exécutable dans ce worktree (pas de `node_modules`, endpoint #439 non déployé). Plan : `/create-e2e` post-merge sur `data-testid="event-form-recurrence-capped-hint"` (récurrence sans borne → hint visible ; poser une borne courte → hint disparaît). Suivi en follow-up Phase 4.

## Tests créés

**Backend (#439 + review fix) :**
- `RecurrencePreviewControllerTest.java` — 6 tests : bornée sous limite (200, capped=false), non-bornée tronquée (200, capped=true), `recurrenceEndDate`<`startDate` (422 BR-EVE-012), `startDate` manquant (400, service non appelé), `recurrenceUnit` manquant (400, service non appelé), **`recurrenceUnit` inconnu `"weeks"` (400, service non appelé)** ← ajouté en correction review.

**Frontend (#67) :**
- `EventEditForm.test.tsx` describe `#67` — 5 tests : `capped=true` → hint + `role=status`/`aria-live` + i18n ; `capped=false` → absent ; réponse absente → absent ; `isRecurring=false` → absent ; hint ne bloque pas `onSubmit`.

## Résultats runs (mesurés par le lead, re-run indépendant)

- **Backend** : `./scripts/test-quiet.sh backend` → **Tests run: 476, Failures: 0, Errors: 0, Skipped: 0** — BUILD SUCCESS. (475 avant sprint + 1 test review-fix ; les 6 tests preview inclus dans le total, la classe préexistante S65 fournissait déjà 475.)
- **Frontend** : `vitest run` sur les fichiers touchés → `EventEditForm.test.tsx` **45/45**, dossier `src/services/` **16/16**, total mesuré **61/61 PASS**. `tsc --noEmit` : **0 erreur sur les fichiers du sprint** (les seules erreurs `tsc` sont dans des `*.stories.tsx` — dette d'environnement `node_modules` périmé sur le plugin storybook v10, hors périmètre sprint, CI installe frais).
- **Suite frontend complète** : rapportée 1040/1040 par le subagent (via vitest direct) ; le lead a re-mesuré les fichiers impactés (61/61) + tsc ciblé propre. La suite intégrale n'est pas re-mesurable telle quelle dans le worktree (pas de `node_modules`) → **CI est le gate autoritatif** pour la suite frontend + E2E complète.
- **E2E** : non exécuté localement (stack complète requise). Gate autoritatif = CI (job `e2e` requis).

## Revue

Reviewer batch (Phase 7) : **PRÊT MERGE** — 0 CRITIQUE / 0 MAJEUR. 2 MINEURs, tous deux **corrigés** avant PR (commit `aa49f74`) : validation Zod runtime de la réponse preview + test contrat enum inconnu. [OK] confirmés : Option 2 respectée (`EventResponse` intact), hexagonal strict, capping non dupliqué, mapping 400/422/401, auth ROLE_USER, hint réactif débouncé + testid + non bloquant, i18n 4 locales.

## Conclusion

**Prêt pour PR.** Logique couverte en unit backend + slice contrôleur + unit frontend, tous verts (re-run lead). E2E parcours du hint différé en `/create-e2e` post-merge (tracké Phase 4), conformément au workflow E2E-CI de ce dépôt. Aucun test requis manquant bloquant : la couverture pré-merge est adéquate pour la nature du flux (calcul pur + hint UI mono-rôle).
