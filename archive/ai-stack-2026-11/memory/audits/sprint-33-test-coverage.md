# Audit tests — Sprint 33

> Généré en fin de Phase 6. Un marqueur bloquant (M-I-S-S-I-N-G) bloquerait la Phase 9 PR — aucun présent.
> Thème : Conformité EU frontend — export RGPD UI (#59) + fix locales es/de (#235).

> **Rectificatif** : le pack cp-frontend annonçait `frontend/e2e/` VIDE (info périmée S9). En réalité le harness Playwright est **peuplé** (9 specs : golden-path, categories, products, settings-*). Les deux fullstack-dev ont été induits en erreur par le pack mais le dev #59 a tout de même écrit un e2e du parcours export.

## Couverture par issue

| Issue | Description | Cross-system flow | Unit/Component | i18n 4 langues | E2E |
|-------|-------------|:---:|:---:|:---:|:---:|
| #59 | Flux export RGPD 3 étapes (Réglages) | NON¹ | ✅ | ✅ | ◑ partiel² |
| #235 | Aligner locales layout es/de (fix 404) | NON | ✅ | ✅ (audit clés) | ⚠ suivi³ |

¹ #59 = UI frontend consommant le contrat backend #58 **déjà testé en S32** (tests backend export livrés). Le contrôle d'accès PII / token signé / ownership est backend, hors scope frontend. Pas de nouveau flux métier cross-system introduit côté front → E2E métier NON obligatoire.
² E2E `settings-account.spec.ts` couvre le **happy-path JSON sync** (`export-flow/format/start/step-confirm/step-ready/ready-sync`). Parcours NON couverts en e2e : **async ZIP/CSV (polling)**, **lien expiré**, **erreur/FAILED** — MAIS couverts en component/unit (`useExportFlow.test.ts` : async polling multi-tours + FAILED + network ; `ExportDataFlow.test.tsx` : 5 états + a11y). testids sans spec e2e : export-step-preparing, export-ready-async, export-download, export-expired, export-relaunch, export-expiry, export-step-error, export-retry, export-heading, export-format-hint, export-again. → RECOMMAND_FOLLOWUP `/create-e2e` (async/expiré/erreur).
³ E2E `/es` et `/de` → 200 non couvert (le dev #235 croyait le harness vide). Couverture = test unitaire de la constante `SUPPORTED_LOCALES` (12 tests). Ajoutable maintenant que le harness est connu peuplé. → RECOMMAND_FOLLOWUP.

## Tests créés
- `frontend/src/services/exportService.test.ts` (6 tests — endpoints + Zod + strip `/api`) — #59
- `frontend/src/hooks/useExportFlow.test.ts` (5 tests — sync/async/polling multi-tours/FAILED/network) — #59
- `frontend/src/components/settings/ExportDataFlow.test.tsx` (6 tests — 5 états + a11y) — #59
- `frontend/src/components/settings/AccountSection.test.tsx` (4 tests, maj) — #59
- `frontend/src/i18n/locales.test.ts` (12 tests — 4 locales + rejets) — #235

## Résultats runs (test-runner, isolation Haiku)
- Frontend : **412 passed / 419** (7 skipped), durée 10 s.
- Tests du sprint : **33/33 verts** (6+5+6+4 export + 12 locales).
- Backend : NON exécuté (aucun changement backend ce sprint).
- E2E : non exécuté (`frontend/e2e/` vide).

## Échec non bloquant (pré-existant, hors sprint)
- `src/__tests__/console-error-guard.test.ts` — `eslint-plugin-storybook` absent de `eslint.config.mjs`.
  Cause : dépendance storybook manquante dans le node_modules (partagé via symlink worktree). NON lié aux commits du sprint. Confirmé par les deux fullstack-dev + test-runner.
- Idem `npx tsc` sur `*.stories.tsx` : 55 erreurs pré-existantes (`@storybook/react-vite` mismatch). `tsc` sur les fichiers du sprint : 0 erreur.

## Conclusion
**Prêt pour PR.** Aucun marqueur bloquant : les deux issues sont du frontend (UI + routing) sans nouveau flux métier cross-system, le backend consommé étant déjà testé (S32). Le happy-path export (JSON sync) est e2e-couvert ; les branches async/expiré/erreur sont component/unit-couvertes. `RECOMMAND_FOLLOWUP` E2E (async/expiré/erreur export + `/es` `/de` routing) à arbitrer en Phase 4 de `/sprint end`.
