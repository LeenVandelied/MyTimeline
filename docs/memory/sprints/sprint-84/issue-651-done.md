# Issue #651 — MAJ next ≥ 15.5.24 + sharp ≥ 0.35.4 (avis critiques)

**Traitée par :** le lead (vague 0, seule — bump de dépendances = runtime partagé, cf. mémoire S31)
**Commit :** 4b78a47

## Résumé
- `next` ^15.2.4 → ^15.5.25 (installé 15.5.22 → 15.5.25) ; override `sharp` ^0.35.0 → ^0.35.4 (0.35.3 → 0.35.4).
- **Écart d'énoncé** : l'issue parle d'un passage 15.2.x → 15.5.x ; le lockfile était déjà en 15.5.22. Le saut réel est un patch (15.5.22 → 15.5.25), pas 3 mineures.
- Lockfile : 38 entrées modifiées, toutes de la famille next / @next/swc-* / sharp / @img/* (+ @emnapi/runtime 1.11.1 → 1.11.3). Aucune autre dérive.
- `eslint-config-next` laissé en 15.1.7 : aucun avis, et le monter changerait les règles de lint (hors périmètre).

## Vérifications
- `npm audit --omit=dev --audit-level=high` : 2 avis (1 critical, 1 high) → **found 0 vulnerabilities**
- `./scripts/test-quiet.sh frontend` : OK (build + tests unitaires + typecheck + lint)
- `npm run format:check` (via `rtk proxy`) : OK
- E2E : **non joué à ce stade** — reporté en Phase 6 (suite complète du sprint) ; job CI `security` à constater sur la PR.

## Signaux mémoire
(aucun)

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucune migration.
- Pas de RECOMMAND_SECURITY : correctif de dépendance, aucun code d'auth touché.
- Pas de RECOMMAND_UI_DESIGN : aucun changement visuel.
- Pas de RECOMMAND_TEST_RUNNER : suite E2E jouée par le lead en Phase 6.

STATUS: COMPLETED
