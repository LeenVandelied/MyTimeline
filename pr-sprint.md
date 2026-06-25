## Sprint 6 — Fondations outillage & CI

Sprint d'**enablers purs** (cohésion 0.55) : débloque tout le frontend futur. Zéro BR fonctionnelle, zéro changement backend.

### Issues livrées
| # | Titre | Commit |
|---|-------|--------|
| #45 (+ #35 absorbé) | Tokens Graphite (Tailwind 4 `@theme`) + thème clair/sombre + dead code | `1012034`, `4f5da4a` |
| #29 | Infra test frontend (Vitest+RTL+Playwright+Storybook+Prettier+Husky+commitlint) | `6ca0b13` |
| #38 | CI GitHub Actions + Dependabot + CODEOWNERS | `343461b` |
| review | Corrections theme-correctness + deps | `2f02142` |

### Changements clés

**#45 — Design system Graphite**
- Tokens récupérés du **hand-off Claude Design** (« Refonte graphique MyTimeline ») et déposés dans `frontend/src/styles/ds/` (source unique) + `docs/design/graphite-handoff.md`. *Ils n'existaient pas dans le repo — décision dev : porter les vraies valeurs validées.*
- Exposition Tailwind 4 via `@theme` (rampe graphite 12 paliers, accent bleu électrique, 12 couleurs event AA, surfaces clair/sombre, typo Archivo/IBM Plex Mono, spacing base-4, tokens timeline).
- `next-themes` (`attribute="class"`, system) — bascule clair/sombre sans reload ; ordre providers Theme>Auth>Query préparé (Auth/Query en S7).
- Polices via `next/font` (self-host, zéro requête Google en prod).
- Audit classes hardcodées : ~180 occurrences sur 15 fichiers → tokens sémantiques (0 résidu gray/purple).

**#35 absorbé (fermeture à la clôture du sprint)**
- Deps mortes retirées : `next-auth`, `@formatjs/intl-localematcher`, `negotiator`, `date-fns`, `react-day-picker` (vérif grep : i18n via `next-intl/middleware` ; `calendar.tsx` mort).
- Fichiers morts supprimés : `ui/calendar.tsx`, `client-only.tsx`, `client-wrapper.tsx`, `calendar.css`. Rename `tailwing.config.ts`→`tailwind.config.ts`.
- `FullCalendarEvent` **gardé** (vivant — pas un vestige, divergence assumée vs brief).

**#29 — Infra test**
- Vitest 2.1.9 + RTL 16 + Playwright 1.61 + Storybook 8.6 (builder **Vite** — webpack `@storybook/nextjs` casse sur Next 15.2) + Prettier + Husky 9 + lint-staged + commitlint gitmoji.
- Scripts : `test`, `test:e2e`, `typecheck`, `format`, `storybook` (+ `build-storybook`).
- Husky résolu pour le **worktree** : `core.hooksPath` en scope `--worktree`.

**#38 — CI**
- `.github/workflows/ci.yml` : 2 jobs parallèles — backend `./mvnw verify` (Java 21, Testcontainers, cache Maven) + frontend `npm ci`→`build`/`test`/`typecheck`/`lint` (Node 20, cache npm). Triggers PR+push sur `dev`/`main`, `concurrency.cancel-in-progress`.
- Dependabot (maven `/backend` + npm `/frontend` + github-actions) ; CODEOWNERS (`@LeenVandelied`).
- ⚠ **Branch protection NON activée** (volontaire — l'activer avant le 1er run vert bloquerait cette PR). Procédure `gh api` documentée en tête de `ci.yml`. À activer après le 1er vert.

### BR impactées
Aucune (sprint outillage).

### Audit tests (Phase 6) — `docs/memory/audits/sprint-6-test-coverage.md`
- Frontend re-vérifié vert par le lead : **Vitest 1/1 · typecheck 0 · lint clean · `next build` OK**.
- Backend non impacté (0 fichier modifié). E2E : aucune spec (1ʳᵉ E2E métier en S8).
- ⚠ La CI elle-même n'est **pas exécutable en local** → 1er vrai run = à l'ouverture de cette PR. À surveiller : Testcontainers/Docker runner, durée < 10 min.

### Review (Phase 7) — résolu
Reviewer : 0 CRITIQUE / 5 MAJEUR / 4 MINEUR, **tous résolus** (`2f02142`) : couleurs hardcodées hors DS (TimelineCalendar violet/emerald/indigo, status pills), `text-ink`→`text-accent-ink` (contraste sombre), deps commitlint en direct.

### Cohésion
0.55 (epic:design + epic:devops ×2 — liés par « débloquer le frontend »).

### Suivi (follow-ups à trier en clôture)
- Activer branch protection après 1er run CI vert.
- Porter `landing.css`/`animations.css` (hex de marque) + `TestimonialCard` (blue/cyan/pink) sur tokens.
- Consommer `ds/components/{core,timeline,i18n}.css` lors de l'intégration des écrans (S7/S8).
- `toLocaleDateString` sans locale (AddProducts) ; `commitlint-config-gitmoji` non utilisé (candidat suppression).
- Vrais tests RTL + premières specs Playwright quand le socle S7 atterrit.
