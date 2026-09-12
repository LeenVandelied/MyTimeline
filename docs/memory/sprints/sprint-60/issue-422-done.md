# Issue #422 — nanoid < 3.3.18 (GHSA-2v37-7h3g-55p8, HIGH)

- commits: [da0f0a3] (lockfile) + commit de ce rapport (2e commit, pas d'amend — PIT-S55-002)
- resume:
  - Fichier modifie : `frontend/package-lock.json` SEUL, 3 lignes. `package.json` NON touche.
  - AUDIT AVANT : `npm audit --omit=dev --audit-level=high` -> `1 high severity vulnerability` (nanoid <3.3.18), exit 1.
  - AUDIT APRES : meme commande -> `found 0 vulnerabilities`, **exit 0**.
  - nanoid `3.3.16` -> `3.3.18` (lock l.11121-11124). Chaine : `postcss@8.5.23 (overridden) > nanoid`.
  - CASCADE : **aucun autre paquet**. `diff --stat` = `1 file changed, 3 insertions(+), 3 deletions(-)`.
  - ECART PISTE ISSUE : `npm audit fix` **ECHOUE** ici -> `npm error Unable to resolve reference $postcss`
    (npm 10.9.7 / node 22.22.2), du a `overrides: {"postcss": "$postcss"}`. Pas de `--force`.
    Contournement : `npm update nanoid` (reste dans `nanoid: ^3.3.16` exige par postcss -> aucun majeur).
  - TESTS (codes de sortie reels, `rtk proxy`, cwd worktree verifie) :
    - `./scripts/test-quiet.sh frontend` : **exit 0**, 95 fichiers / **888 tests passed**.
      (Ce scope ne lance QUE vitest — script l.96-103 : ni build, ni typecheck, ni lint.)
    - `npm run lint` **exit 0** ; `npm run build` **exit 0** (Next 15.5.22).
    - `npm run typecheck` : exit 2 au 1er essai (artefact PERIME `.next/types/validator.ts` citant
      `app/[locale]/settings/page.js`, chemin disparu au passage en route group) -> **exit 0** apres build.
      Pre-existant, sans lien avec nanoid.
    - **E2E complet : exit 0 — 169 passed / 0 failed / 8 skipped (177 total), 1.8 min.**
      Stack : backend Docker `mytimeline-e2e` `:8086` (profil e2e verifie, test-support -> 404) ; frontend
      builde AVEC `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8086` puis `next start -p 3000`
      (oracles : `/api/auth/me` 401, `/fr/register` 200) ; `CI=1 --workers=1` ; `PLAYWRIGHT_BASE_URL` pose
      (webServer Playwright desactive, PIT-S56-005). Serveur `:3000` arrete apres le run.
      Les `[setup] ... e2e-500-persistant ... 500` du log = self-test `e2e/auth-setup-render-retry.spec.ts:53`, pas un echec.

- [MEMORY:*] signaux:
  - [MEMORY:pitfall] `npm audit fix` echoue sur `frontend/` (`Unable to resolve reference $postcss`) : l'arbre
    virtuel d'audit fix ne resout pas l'override `"postcss": "$postcss"`. Solution : `npm update <transitif>` si la
    version corrigee tient dans la plage semver du parent (lire la plage dans le lock AVANT). Prevention : ne jamais
    ecrire dans une issue que `npm audit fix` « est confirme suffisant » sans l'avoir lance ; ne pas glisser vers `--force`.
  - [MEMORY:pitfall] `npm run typecheck` rouge sur une route FANTOME : `tsconfig.json:26` inclut `.next/types/**/*.ts`,
    donc tsc type-checke les artefacts d'un build anterieur. Solution : rebuild puis re-typecheck. Prevention : une
    erreur tsc qui ne cite QUE `.next/**` n'est pas imputable a son propre diff.
  - [MEMORY:pitfall] `:3100` etait tenu par un `next-server` d'un AUTRE WORKTREE MyTimeline
    (`worktrees/new-feature-2347-14cb9a/frontend`, up 21 h) rendant **500 sur /fr/register** — variante de
    PIT-S56-004 ou le squatteur est le meme projet. Solution : `lsof -a -p <pid> -d cwd` pour identifier le
    proprietaire, puis prendre un port libre plutot que tuer le process d'une autre session.
  - [MEMORY:pattern] `test-quiet.sh frontend` est decrit partout comme « vitest + build + typecheck + lint » : il ne
    lance QUE vitest. Anti-pattern : conclure « frontend vert » sur ce seul scope.

- recommandations suite:
  - Pas de RECOMMAND_DB_EXPERT (aucune migration), ni RECOMMAND_UI_DESIGN (aucun changement visuel),
    ni RECOMMAND_TEST_RUNNER (suites jouees ici avec exit codes), ni RECOMMAND_SECURITY (advisory purge,
    verifie par la commande exacte du job CI).
  - RECOMMAND_FOLLOWUP: reparer `npm audit fix` sur `frontend/` (evaluer `"postcss": "^8.5.23"` litteral dans
    `overrides`, re-tester audit fix ET le build Tailwind v4). [triage S | domaine frontend]
  - RECOMMAND_FOLLOWUP: aligner `scripts/test-quiet.sh frontend` sur ce qu'annoncent les briefings
    (ajouter typecheck+lint+build, ou renommer le scope `frontend-unit`). [triage S | domaine tooling]
  - RECOMMAND_FOLLOWUP: 6 HIGH subsistent en dev+prod (etape CI INFORMATIVE, chaine eslint/brace-expansion
    documentee incorrigible `ci.yml:498-515`) — hors perimetre #422. [triage M | domaine tooling]

- ABSORBED: aucune (`.github/**` et `docs/memory/audits/**` laisses intacts — perimetre #362).

## Non verifie / limites assumees
- Job CI `security` PAS observe vert (rien n'est pousse) ; preuve locale = commande exacte de l'etape bloquante
  (`ci.yml:517-519`) en exit 0.
- Backend E2E `:8086` up depuis 21 h, non rebuild : peut preceder `sprint/60`. Sans impact attendu (diff 100 % frontend).
- `npm ci` from scratch non rejoue (arbre mis a jour en place par `npm update`).

STATUS: COMPLETED
