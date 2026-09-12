# Issue #167 — CI : pin actions par SHA + persist-credentials:false + job scan sécurité

**Vague :** 1 (∥ #180) · **Modèle :** sonnet/medium · **Statut :** livré

## Commits
- `5bcdf3a3f581c78484cd373bb7e32418a780367a`

## Résumé
- Actions pinnées par SHA commit complet (+ commentaire `# v4`) sur TOUTES les occurrences du fichier (job `e2e` inclus, pas seulement les 4 lignes du triage — zizmor `unpinned-uses` scanne tout le fichier) :
  - `actions/checkout@34e1148…` (×3 backend/frontend/e2e + security)
  - `actions/setup-java@c1e3236…` (×2)
  - `actions/setup-node@49933ea…` (×3)
  - `actions/upload-artifact@ea165f8…` (×1)
  - `aquasecurity/trivy-action@ed142fd…` (v0.36.0, nouveau job)
  - SHA résolus via `gh api .../git/refs/tags/vX` (tous type=commit). Non inventés.
- `persist-credentials: false` sur les 3 checkout existants + celui du job security.
- Nouveau job `security` (permissions héritées `contents: read`) : `npm audit --audit-level=high` (working-dir frontend) + `trivy fs --severity CRITICAL --exit-code 1 --ignore-unfixed`.
- Validation locale (zizmor + trivy installés) : `zizmor` exit=0, ZÉRO finding high (unpinned-uses + artipacked résolus). YAML valide.

## ⚠ Point d'attention CI (à résoudre avant merge — hors scope initial)
- `trivy fs CRITICAL` : rouge en local sur tomcat + spring-security = EXACTEMENT les CVE que #180 résout → co-atterrit même PR → attendu VERT après #180. OK.
- `npm audit --audit-level=high` : rouge en local sur 4 HIGH + 1 CRITICAL, **toutes dev/test-deps** (vitest CRITICAL direct ; vite/minimatch/picomatch/flatted HIGH transitives). #180 est Maven-only → **NE résout PAS** ce step. Il restera rouge après #180.
  - Options tranchées par le lead avant PR : (a) `npm audit --audit-level=high --omit=dev` (ne bloquer que la prod) OU (b) bump dev-deps frontend (vitest/vite chain) OU (c) follow-up issue + relâcher temporairement le step.
  - L'agent a gardé le critère littéral `--audit-level=high` (non affaibli silencieusement).

## [MEMORY:decision]
Pin CI #167 : pinner TOUTES les occurrences (job e2e inclus) + upload-artifact, pas juste les 4 lignes du triage. Why : zizmor `unpinned-uses` scanne tout le fichier — un pin partiel ne satisfait pas « 0 finding high ».

## Recommandations suite
- RECOMMAND_FOLLOWUP : vérif CI post-merge dev que backend/frontend/e2e restent verts avec les SHA pins ET que `security` passe vert une fois #180 mergé (côté trivy CRITICAL).
- RECOMMAND_FOLLOWUP : décision npm dev-deps — soit `--omit=dev`, soit bump vitest/vite/storybook chain. Sinon le step `npm audit >=high` reste rouge indépendamment de #180.

STATUS: COMPLETED
