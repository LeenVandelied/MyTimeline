# Issue #883 — Node 20 → 22 en CI et dans l'image frontend

## Résumé

Fait par le lead. Commits `dc882ebc` (Dockerfile, engines, compose) et `8b15c851` (ci.yml, diff montré et validé par
l'utilisateur avant commit — règle « modification de pipeline CI »), puis merge de `dev` (`9d8d0b45`) qui combine
setup-node v7.1.0 (#880) et `node-version: "22"`.

- `frontend/Dockerfile` : `node:22-alpine` aux étapes deps, build, runtime.
- `frontend/package.json` : `engines.node: ">=22.12.0"`.
- `.github/workflows/ci.yml` : 3 étapes `Set up Node 22`, `node-version: "22"` (jobs frontend, e2e, security).
- `docker-compose.yml` : commentaire aligné.
- `@types/node` ^20 → ^22 (livré avec #884, peer de vitest 5).

**Recherche exhaustive des épinglages Node 20** (`/usr/bin/grep -rnIE "node-version|node:2[0-9]|FROM node|\"node\":|NODE_VERSION|setup-node"`
hors `node_modules`, `.git`, `.next`, `docs/`) : seuls ci.yml (3) et le Dockerfile (3) ; ni `.nvmrc`, ni `.node-version`,
ni `.tool-versions`.

## Tests
CI : `frontend` vert sur Node 22 ; `e2e` (image et `next build` en Node 22) : voir audit.

## Recommandations suite
- Pas de RECOMMAND_* : changement de configuration, couvert par la CI.

STATUS: COMPLETED
