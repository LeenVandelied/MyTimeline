# Audit tests — Sprint 89

> Généré en fin de Phase 6 par le lead. SHA mesuré : `7ed997c` (dernier commit de code du sprint).
> Une ligne marquée comme lacune bloquerait la PR ; aucune n'est ouverte ci-dessous.

## Couverture par règle métier

| Issue | Règle / comportement | Flux inter-systèmes | Unit / IT backend | Vitest frontend | E2E parcours | E2E métier |
|---|---|---|:---:|:---:|:---:|:---:|
| #546 | Un produit archivé occupe toujours sa catégorie (option A) : suppression sans cible → 409, catégorie conservée ; avec cible → réassignation puis suppression | OUI (409 API → bascule du dialogue) | ✅ `CategoryDeleteReassignIntegrationTest` (409 + produit toujours lié, et cas avec cible) | ✅ `DeleteConfirmDialog.test.tsx` (bascule sur 409, contre-épreuve 3 rouges / 5 sans correctif) | ✅ `categories.spec.ts` (5 tests) | ✅ `categories.spec.ts:197` « catégorie ne portant qu'un produit archivé bascule en réassignation » |
| #652 | Une `LocalDate` est une date civile lue à minuit local (option A) ; `LocalDateTime` serveur et date légale inchangés | OUI (`LocalDate` API → affichage dashboard / produits / frise) | N/A (backend inchangé) | ✅ `date-iso.local-date.test.tsx` sous `America/New_York` forcé par le test (14 rouges / 5 sans correctif, sans TZ shell comme avec `TZ=UTC`) | ✅ 21 fichiers citant les testids touchés (agent : 170/0/0) | ✅ `sprint-89-local-date-west.spec.ts:76` (`timezoneId: America/New_York`, rouge en A/B : attendu `2026-09-17`, obtenu `2026-09-16`) |
| #685 | Garde-fous de test S88 : provenance du statut dans la boucle annotée ; « propriété blanche = plafond par défaut » via le vrai binding `@Value Integer` | NON (tests uniquement, aucun code de production) | ✅ `RateLimitTunableCeilingTest` (5 cas via `ApplicationContextRunner`, mutations `#{null}` retiré et `Integer`→`int` vues rouges) | ✅ `e2e-rate-limit-budget.test.ts` 37/37 (10 cas nouveaux ; gardes désactivées → 8 rouges) | N/A | N/A |

## Tests créés ou modifiés
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` (#546)
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitTunableCeilingTest.java` (#685)
- `frontend/src/components/shared/DeleteConfirmDialog.test.tsx` (#546 — l'ancien cas « 409 catégorie sans cible », qui validait le bug, déplacé sur la variante event)
- `frontend/src/lib/date-iso.local-date.test.tsx` (#652)
- `frontend/src/__tests__/e2e-rate-limit-budget.test.ts` (#685)
- `frontend/e2e/categories.spec.ts` (#546, nouveau cas l.197)
- `frontend/e2e/sprint-89-local-date-west.spec.ts` (#652, nouveau)

## Résultats des runs
- **Backend** (lead, seul, sous verrou Maven, SHA `6eee23e` — aucun commit backend ensuite) : 610 tests, 0 échec, 0 erreur, 0 ignoré, BUILD SUCCESS (S88 : 603).
- **Frontend** (agent #652, `./scripts/test-quiet.sh frontend`, SHA `7ed997c`) : Vitest 1587 passés, `tsc` 0 erreur, lint OK, build 52/52.
- **Build de production** (lead, SHA `7ed997c`, `NEXT_PUBLIC_API_URL=/api` et `E2E_API_PROXY_TARGET` au build) : 52/52 pages, lint et types exécutés, exit 0.
- **E2E suite complète** (lead, `next start` :3100, backend `s89e2e` :8086 image du 2026-09-14 09:35Z, base recréée, 2 workers, SHA `7ed997c`) : **368 passés / 10 échoués / 8 sautés / 1 non exécuté**, 2,5 min, serveur resté vivant tout le run.
  - Les **10 échecs** sont tous `sprint-77-theme-visual.spec.ts:580` « capture de référence » (5 pages × 2 thèmes), 10 × `doesn't exist` et **0** `did not match` : références Linux absentes sur macOS, faux rouges connus. Les 10 PNG `*-chromium-darwin.png` générés ont été supprimés, non committés.
  - **1 non exécuté : non identifié.** Les 371 titres distincts listés ont tous été vus en progression ; il s'agit donc de l'un des 16 tests à titre dupliqué. Le job CI `e2e` (Linux) fait foi.
- **Coverage E2E des testids** (phase 8) : 1 testid ajouté (`delete-reassign-required-note`), cité par `categories.spec.ts` → OK.

## Revues
- Backend cycle 1 : 0 CRITIQUE / 0 MAJEUR / 2 MINEUR (`sprints/sprint-89/specialists-reviewer-backend.md`).
- Frontend cycle 1 : 0 CRITIQUE / 0 MAJEUR / 3 MINEUR (`sprints/sprint-89/specialists-reviewer-frontend.md`).

## Non vérifié
- Vues mobiles (bottom sheet, drawer paysage) sous fuseau ouest en E2E : couvertes par Vitest seulement.
- Colonne exacte de la pastille dans la frise sous New_York en E2E : géométrie vérifiée en unitaire seulement.
- Rendu visuel des 10 références `sprint-77` : laissé à la CI Linux.

## Conclusion
Prêt pour PR : aucune lacune ouverte ; résultat final soumis au check `e2e` de la CI.
