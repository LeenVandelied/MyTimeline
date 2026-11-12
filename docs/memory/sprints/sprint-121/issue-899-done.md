# Issue #899 — ci.yml : mentions de middleware.ts → proxy.ts

**Traitée par :** lead (XS)
**Commit :** `d5663546`

## Résumé
- 8 lignes de commentaires de `.github/workflows/ci.yml` (job `e2e`) : `middleware.ts` → `proxy.ts`, « modes du middleware » → « modes du proxy ».
- Absorbé (même nature, même fichier) : 4 mentions « vérification Edge » / « backend -> Edge », périmées depuis que le proxy tourne en runtime Node (#889, ADR-004 amendé).
- Aucune ligne non commentée modifiée ; YAML revalidé (`yaml.safe_load`). Plus aucune occurrence de `middleware` ni `Edge` dans `.github/`.
- Accord explicite du dev pour toucher au workflow : 2026-11-12 (validation du plan S121).

## Signaux mémoire
Aucun.

## Recommandations suite
Aucune. Pas de RECOMMAND_TEST_RUNNER : commentaires seulement, la CI de la PR exécutera le workflow.

STATUS: COMPLETED
