# Review batch — Sprint 118 (reviewer, HEAD `55a89660`)

Bilan : 0 CRITIQUE / 2 MAJEUR / 8 MINEURS. Aucun défaut de code ; les MAJEUR sont des docs et commentaires devenus faux.

| # | Constat | Suite donnée |
|---|---------|--------------|
| M1 | `frontend/README.md:12` — prérequis Node 20 (seul Node 20 restant hors `docs/`) ; « Next.js 15 » | Corrigé `56f7f6de` |
| M2 | `ci.yml:394-398` — commentaire « `ignoreDuringBuilds:false`, le job e2e rougit sur le lint » faux sous Next 16 | Corrigé `39b1ef7e` (diff validé par l'utilisateur) |
| m1 | `ci.yml:152` — « `next lint` » | Corrigé `39b1ef7e` ; `:365` laissé (paragraphe « AVANT », historique) |
| m2 | `scripts/test-quiet.sh`, `README.md`, `CLAUDE.md`, `Dockerfile`, `vitest.config.mts`, `login/page.test.tsx` — Next 15 / `next lint` | Corrigé `56f7f6de` |
| m3 | 2 tests hooks — « Vitest 3.2.7 » dans des commentaires de piège | Corrigé `56f7f6de` (« mesuré sous 3.2.7, vert sous 5.1.0 ») |
| m4 | `package.json` `_overridesRationale.postcss` — « next@15 épingle 8.4.31 » périmé (next 16.4.6 épingle 8.5.23) | Texte corrigé `56f7f6de` ; override gardé comme garde |
| m5 | `build --webpack` vs `dev` Turbopack non documenté | Documenté `56f7f6de` (README frontend, CLAUDE.md) ; passage du build à Turbopack = follow-up |
| m6 | `period-zoom` : branche bornée sans trace | Annotation `oracle-borné` ajoutée `4ba1621a` |
| m7 | `eslint.config.mjs:19-22` — commentaire `next lint` | Corrigé `56f7f6de` |
| m8 | `setRequestLocale` seulement dans le layout (next-intl conseille aussi chaque page) | Sans suite : SSG vérifié (table de routes ● ×48, `.next/server/app/<locale>/*.html`) ; les appels serveur de pages (privacy, terms) passent `locale` explicitement |

Points challengés par le reviewer et jugés OK : oracle e2e borné toujours discriminant (l'assertion « ≠ ancre d'avant T » reste) ; `eslint .` 0 erreur / 0 directive inutilisée sur le périmètre élargi ; Node 22 cohérent ; SHA épinglé de docker/login-action.
