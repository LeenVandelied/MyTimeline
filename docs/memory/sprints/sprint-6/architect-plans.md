# Mini-plans architect — Sprint 6

> Généré par /sprint plan 3 (architect, 2026-06-25). Lu par /sprint start 6 Phase 4.1
> pour injection dans le HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> Thème : Fondations outillage & CI (enablers, zéro dette greenfield). Cohésion 0.55.
> Vagues : V1 (∥) = #45 + #29 (sérialiser package.json) | V2 = #38 (dépend #29).
> ⚠ #35 (typo tailwing.config.ts + deps mortes next-auth/date-fns) absorbé comme tâche-zéro de #45.
> ⚠ layout.tsx : ordre providers imposé Theme(#45) > Auth(S7 #40) > Query(S7 #48).

```yaml
issue_45:
  fichiers_cles:
    - "frontend/tailwind.config.ts"        # renommé depuis tailwing.config.ts (#35)
    - "frontend/src/app/globals.css"       # @theme tokens + vars clair/sombre, retrait bg-gray-900 body
    - "frontend/src/app/layout.tsx"        # next/font Archivo+IBM Plex Mono, ThemeProvider next-themes
    - "frontend/package.json"              # +next-themes, -next-auth -date-fns (#35)
  couches_touchees: ["frontend-tokens", "frontend-layout"]
  strategie_test: "Storybook visual (livré par #29 en parallèle, sinon manuel) + check contraste AA des 12 couleurs event. Pas d'unit. Snapshot Playwright reporté S8."
  risque_regression: "ELEVE — audit exhaustif des classes hardcodées bg-gray-*/bg-purple-* ; un oubli = régression visuelle. layout.tsx = fichier partagé à risque (ordre providers Theme>Auth>Query)."
  ordre_ecriture: "rename+fix tailwind config (#35) → tokens @theme → next/font → next-themes ThemeProvider → audit/remplacement classes hardcodées"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "tailwing.config.ts typo CONFIRMÉE ; next-auth@4.24.11 + date-fns@3.6.0 deps mortes CONFIRMÉES ; pas de next-themes ; layout.tsx existe."

issue_29:
  fichiers_cles:
    - "frontend/vitest.config.ts"
    - "frontend/playwright.config.ts"
    - "frontend/.storybook/main.ts"
    - "frontend/.storybook/preview.ts"
    - "frontend/.prettierrc"
    - "frontend/.husky/pre-commit"
    - "frontend/commitlint.config.js"
    - "frontend/package.json"   # scripts test/test:e2e/typecheck/format/storybook + devDeps
  couches_touchees: ["frontend-config"]
  strategie_test: "Auto-méta : npm run test (0 test OK), test:e2e config existe, storybook démarre, commit gitmoji-invalide rejeté."
  risque_regression: "MOYEN — Storybook + Next.js App Router (@storybook/nextjs) incompat versions ; Husky v9 (husky init). package.json partagé avec #45 → #29 écrit en dernier, merge des blocs deps."
  ordre_ecriture: "vitest → RTL → playwright config → storybook → prettier → husky+lint-staged+commitlint → scripts package.json"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "aucune evidence — pas de vitest/playwright/storybook/husky dans package.json (CONFIRMÉ absent)."

issue_38:
  fichiers_cles:
    - ".github/workflows/ci.yml"      # backend mvn verify + frontend npm ci/build/test/typecheck/lint
    - ".github/dependabot.yml"
    - ".github/CODEOWNERS"
  couches_touchees: ["devops-ci"]
  strategie_test: "Ouvrir PR drainante → CI déclenchée < 10min ; cache .m2 + node_modules."
  risque_regression: "FAIBLE — branch protection APRÈS 1er vert sinon bloque tous les merges. Dépend des scripts livrés par #29 (V2 séquentiel)."
  ordre_ecriture: "ci.yml jobs backend+front → cache → dependabot → CODEOWNERS → branch protection post-vert"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "aucune evidence — repo sans .github/workflows (CONFIRMÉ pas de CI)."
```
