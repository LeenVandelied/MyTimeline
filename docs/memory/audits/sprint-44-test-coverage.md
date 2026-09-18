# Audit tests — Sprint 44 (Boucle démo frise + création d'événement)

> Généré en fin de Phase 6. Sprint **FRONTEND-ONLY** (zéro fichier backend touché, aucune migration).

## Couverture par issue / BR

| Issue | BR / contrat | Cross-system flow | Unit/RTL frontend | Backend | E2E parcours |
|-------|--------------|:---:|:---:|:---:|:---:|
| #301 frise réelle `/timeline` | affichage (BR-EVE-011 archivés exclus) | NON | ✅ 6 tests (`page.test.tsx` : garde auth, loading, vide, montage host, non-régression placeholder) + 1 (`AppShell.test.tsx` nav active) | ⚠ N/A (aucun fichier backend) | ⚠ gap testids (cf. Phase 8) |
| #300 drawer création | BR-EVE-002/006/013/014 + contrat `EventCreationRequest` | NON | ✅ 19 tests (`NewEventDrawer.test.tsx` + `AppShell.test.tsx` + `event.ts`) | ⚠ N/A (POST /api/events préexistant, non modifié) | ⚠ gap testids (cf. Phase 8) |

**Cross-system flow = NON pour les deux issues** : parcours mono-rôle (`ROLE_USER` authentifié), aucun flux
2+ systèmes/rôles introduit → **pas d'E2E métier obligatoire** au sens du protocole. Le déficit E2E ci-dessous
est une couverture de testids (Phase 8), pas un blocage Phase 6.

## Tests créés / modifiés
- `frontend/app/[locale]/(app)/timeline/page.test.tsx` (NEW, 6) — #301
- `frontend/src/components/events/NewEventDrawer.test.tsx` (NEW, 339 lignes) — #300
- `frontend/src/components/layout/AppShell.test.tsx` (MAJ : nav active `/timeline` + ouverture drawer) — #301/#300
- `frontend/src/types/event.test.ts` (MAJ : `toEventCreationPayload`, payload create) — #300
- `frontend/src/components/EventEditForm.test.tsx` (MAJ : prop `mode`) — #300

## Résultats runs (exécutés par le LEAD, pas par les subagents)
- **Suite frontend complète : 496 tests, 496 passed, 0 failed** (184 fichiers).
  Progression : 477 après #301 → 496 après #300 (+19).
- `npx tsc --noEmit` : **0 erreur**.
- `npx eslint` (fichiers touchés) : **0 issue** — garde-fou PIT-S41-005 (un `no-unused-vars` invisible à
  vitest avait cassé la CI en S41 ; `next build` est vérifié par la CI).
- **Backend : NON exécuté — justifié**, zéro fichier backend modifié par le sprint (`git diff origin/dev...HEAD
  -- backend/` vide). La CI relancera la suite backend complète sur la PR (job `backend` requis).
- **E2E : NON exécuté en local** (stack down — gate CI only, cf. [[mytimeline-e2e-ci-only-gate]]). Job CI `e2e` requis sur la PR.

## Phase 8 — Couverture E2E des nouveaux testids : **MAJEUR (11 testids sans spec)**
Vérification faite en excluant les fichiers de test et en distinguant les testids **réellement nouveaux** de
ceux simplement **déplacés** par le refactor `mode` (le diff brut ne fait pas la différence) :

- **Préexistants sur `origin/dev`, déplacés par le refactor → PAS un déficit de ce sprint** (leur gap E2E le
  précède) : `event-form-end-date`, `event-form-end-error`, `event-form-recurrence-end-date`,
  `event-form-archived-toggle`.
- **Réellement nouveaux ET sans spec Playwright (11)** :
  - #300 (8) : `shell-new-event-drawer`, `-overlay`, `-close`, `-loading`, `-empty`, `-product-trigger`,
    `-product-error`, `event-form-preview-recurrence`
  - #301 (3) : `timeline-screen`, `timeline-host`, `timeline-data-loading`
  - (`timeline-empty` est couvert.)
- **Plan** : `/create-e2e` après merge (invocation manuelle — bug nested skills). Follow-up consigné par les
  deux subagents [triage S | events]. Budgéter 2-3 itérations CI (spec non exécutable localement).
- Le testid supprimé `shell-new-event-dialog` n'était référencé par aucune spec → aucune spec cassée.

## Conclusion
**Prêt pour PR.** Aucune couverture de règle métier manquante (aucun flux cross-system introduit ; suite
frontend verte, typecheck et lint propres). Le déficit E2E (11 testids) est identifié, quantifié et porté en
follow-up explicite dans le corps de la PR — il n'est pas silencieux.
