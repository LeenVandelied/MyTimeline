# Issue #888 — `npm ci` sur les PR Dependabot npm

## Résumé
Fait par le lead. Commit `f2c54752`. Prémisse vérifiée sur `dev` : sous Next 16, le lock n'a PLUS de copie imbriquée
`next-intl/node_modules/@swc/helpers` (next 16 exige `@swc/helpers` 0.5.23, la copie racine satisfait le pair optionnel
`>=0.5.17` de `@swc/core`). Le défaut ne se reproduisait plus localement. Correctif durable quand même :
`@swc/helpers` épinglé en dépendance directe (0.5.23, version de next) → une copie racine satisfait toujours ce pair,
quel que soit le pin interne de next.

Simulation du comportement Dependabot (npm 10.9.7, `--package-lock-only`) : lock régénéré de zéro, montée
`next`/`next-intl`/`eslint-config-next`, montée `@swc/core`+`axios` → `npm ci` OK dans les trois cas.
`.github/dependabot.yml` non modifié.

## Limite
Critère de fin (« une PR Dependabot npm frontend passe `frontend` et `e2e` sans retouche ») non observable pendant le
sprint : aucune PR Dependabot npm ouverte (passage hebdomadaire). Constatation à faire à la prochaine PR npm.

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT / SECURITY / UI_DESIGN : config de dépendances seule.

STATUS: COMPLETED
