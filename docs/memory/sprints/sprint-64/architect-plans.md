# Mini-plans architect — Sprint 64

> Produit en Phase 3 de `/sprint start 64` (le sprint n'a jamais été planifié par `/sprint plan` —
> même écart qu'aux S62 et S63). Architect en lecture seule, confronté au code au commit `a5f4636`.
> Lu par la composition des briefings fullstack-dev.

## Faits établis en Phase 3 (vérifiés deux fois : architect, puis lead)

1. **Aucune CI ne tourne sur `sprint/64`.** `.github/workflows/ci.yml:35-39` ne déclenche que sur
   `pull_request: [dev, main]` et `push: [dev, main]`. Conséquence directe : le sprint n'a **aucun
   retour CI** avant l'ouverture de la PR (Phase 9), et le critère d'acceptation de #461 (« vérifier
   sur un échec provoqué en CI ») exige une **PR jetable vers `dev`**.
2. **`frontend/middleware.ts:110-118` lit `AUTH_JWT_PUBLIC_KEY` au RUNTIME**, par requête,
   explicitement non inlinée au build (commentaire `:110-112`, mesure #322). Donc pour #462 :
   **un seul `next build` suffit**, seuls les *process* doivent différer — deux `next start` sur
   deux ports, un par mode. Deux builds seraient du gaspillage (+2,5 à +3 min de CI pour rien).
3. **PIT-S58-003 (`pitfalls.md:818-825`)** — les rewrites Next sont sérialisées dans
   `routes-manifest.json` **au build**. `NEXT_PUBLIC_API_URL` ET `E2E_API_PROXY_TARGET` doivent donc
   être posés au `next build`, pas au démarrage. Oracle fiable : `curl /api/auth/me` → 401.
4. **`output: 'standalone'` (`next.config.mjs:30`) est additif** : `next start` reste valide. Ne PAS
   basculer sur `.next/standalone/server.js`, qui exigerait de copier `public/` et `.next/static`
   à la main.
5. **Parallélisme intra-sprint = 0.** Les 4 issues touchent toutes `frontend/playwright.config.ts` ;
   #461 et #462 touchent toutes deux `.github/workflows/ci.yml`. Trois vagues séquentielles.
6. Les pistes fichiers/lignes des issues sont **exactes** au commit `a5f4636`, à un décalage près :
   #461 cite `playwright.config.ts:24` pour `trace: 'on-first-retry'` → c'est la **ligne 25**.
   `frontend/package.json:7-8` déclare déjà `build` et `start` — rien à créer, contrairement à ce
   que suggère #462.

## Vagues

- **V1** = #461 — seul livrable qui produit l'outil de diagnostic, et le seul dont le critère
  d'acceptation exige une CI rouge : à faire avant que #462 ne remue le job `e2e`.
- **V2** = #465 — parade `workers` locale, une ligne, zéro conflit CI.
- **V3** = #462 (+ #427 absorbée) — le plus intrusif : réécrit `webServer` et les deux passes.
  Bénéficie des artefacts livrés par #461 quand il fera rougir la CI.

Ordre naïf #461 → #462 → #465 **écarté** : placer #465 après #462 l'expose à une re-scope à zéro
sur le malentendu « le mode prod règle le problème » — or #465 porte sur le poste **local**, où
`next dev` reste utilisé après #462.

## Arbitrages du dev (2026-09-01, avant tout développement)

- **#427 absorbée dans #462** (au lieu d'être laissée au backlog ou fermée comme caduque). #462
  supprime le `webServer` en CI mais le **conserve en local** (`PLAYWRIGHT_BASE_URL` absent) : le
  défaut de #427 survit intégralement au poste local, où il a déjà fait dérailler les sprints 47,
  56 et 57. ⚠ PIT-S58-003 **invalide la piste principale de #427** (« injecter un bloc `env` dans
  `webServer` ») pour les rewrites : seule sa 2e piste tient — **échouer tôt, avec un message
  explicite, si les variables manquent**.
- **#465 re-scopée en parade documentée** — critère « cause racine identifiée » retiré. Corps de
  l'issue réécrit + commentaire de traçabilité (`#issuecomment-5500891018`).
- **#461 : PR jetable autorisée**, suppression de la branche distante à reconfirmer au moment venu.

---

```yaml
issue_461:
  fichiers_cles:
    - "frontend/playwright.config.ts:22"       # reporter
    - ".github/workflows/ci.yml:310-316"       # bloc upload-artifact
  couches_touchees: ["outillage-e2e", "ci"]
  strategie_test: |
    PR JETABLE vers dev (aucune CI ne tourne sur sprint/64). Branche
    chore/461-artifact-proof depuis sprint/64, spec chromium en echec DETERMINISTE,
    PR draft "TEMP — ne pas merger", telechargement de l'artefact, preuve
    index.html + trace.zip, puis fermeture de la PR et nettoyage.
    Ne JAMAIS provoquer l'echec sur la PR de sprint.
  risque_regression: "FAIBLE — le reporter 'list' local reste inchange ; seule la taille de l'artefact (traces) est a mesurer"
  ordre_ecriture: "config reporter -> ci upload paths -> spec temporaire -> run PR -> telechargement + preuve -> nettoyage"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — reporter 'github' seul confirme ligne 22, upload limite a playwright-report/ confirme ci.yml:310-316)"

issue_465:
  fichiers_cles:
    - "frontend/playwright.config.ts:21"                    # workers
    - "docs/memory/audits/sprint-63-test-coverage.md:95"    # libelle fautif a corriger
  couches_touchees: ["outillage-e2e", "documentation"]
  strategie_test: |
    Un run local COMPLET (tous projets : setup + chromium + firefox) sans
    ECONNREFUSED / NS_ERROR_CONNECTION_REFUSED. C'est l'oracle UNIQUE.
    Aucune cause racine a prouver — l'issue a ete re-scopee en parade.
  risque_regression: "MOYEN — la duree du run local augmente avec des workers bornes ; AUCUNE cause racine n'est prouvee, la parade doit etre assumee et ecrite comme telle"
  ordre_ecriture: "workers borne + commentaire justifiant la valeur -> run local complet -> correction du libelle de l'audit S63 -> documentation de la parade dans le done.md"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — workers: CI ? 1 : undefined confirme ligne 21, fullyParallel: true ligne 18)"

issue_462:
  fichiers_cles:
    - "frontend/playwright.config.ts:72-79"       # webServer
    - ".github/workflows/ci.yml"                  # job e2e, 2 passes (~272 et ~296)
    - "frontend/next.config.mjs:23-30"
    - "frontend/e2e/document-lang.spec.ts"        # 5 tests exposes au passage en prod
  couches_touchees: ["outillage-e2e", "ci", "config-next"]
  strategie_test: |
    UN SEUL next build, avec NEXT_PUBLIC_API_URL=/api ET E2E_API_PROXY_TARGET
    poses AU BUILD (PIT-S58-003). DEUX next start : :3000 (mode degrade) et :3001
    (avec AUTH_JWT_PUBLIC_KEY). PLAYWRIGHT_BASE_URL pose par passe.
    Oracle prealable a toute conclusion : curl /api/auth/me -> 401.
    RE-JOUER EXPLICITEMENT les 5 tests de document-lang.spec.ts — ne pas les supposer verts.
  risque_regression: |
    ELEVE. (1) SSG vs dev sur /_not-found et sur l'attribut lang.
    (2) Rewrites bakees au build (PIT-S58-003).
    (3) Le webServer LOCAL doit etre preserve — c'est le perimetre de #427, absorbee ici.
    (4) next build ajoute au job e2e le rend sensible aux erreurs lint/TS (ignoreBuildErrors:false).
  ordre_ecriture: |
    absorber #427 (echec precoce + message clair si les variables manquent) ->
    step next build -> deux next start -> PLAYWRIGHT_BASE_URL par passe ->
    verifier document-lang -> mesurer la duree du job
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — webServer = npm run dev confirme lignes 72-79, aucun PLAYWRIGHT_BASE_URL dans ci.yml)"
```

## Pièges de non-régression (V3 surtout)

| Fichier:ligne | Ce qui casse |
|---|---|
| `playwright.config.ts:62` | `testMatch` firefox restreint à 1 spec. L'élargir est une **décision de sprint** non prise (`:43-59`). Le job CI installe firefox exprès — le retirer fait rougir `e2e` (check requis). |
| `playwright.config.ts:17` + `e2e/global-setup.ts` | Purge de `.auth/accounts.json`, **une fois par invocation**. Avec deux passes en prod, la passe 2 re-purge et re-provisionne → vérifier que le rate-limit register (5/min/IP) n'est pas franchi. |
| `ci.yml` ~304 | Le filtre de la passe 2 cite `auth.setup.ts` **explicitement** (revue S50). Le retirer fait consommer le `storageState` de la passe 1 — couplage silencieux. Ne pas « simplifier » la passe 2. |
| `next.config.mjs:57-58` | `experimental.globalNotFound`. **Risque le plus sournois de #462** : en prod `/_not-found` est prérendu au build. `e2e/document-lang.spec.ts` assert sur le HTML SERVI (statut 404, `<html lang>`, `data-testid="global-not-found-screen"`, `<title>` = « Ma Timeline »). Le test post-hydratation (`lang` de `/de/nope`) est le plus exposé. **5 tests à rejouer, pas à supposer verts.** |
| `app/[locale]/layout.tsx:31` | `generateStaticParams()` (~52 pages). En prod les pages sont prérendues : toute spec dont l'oracle est le HTML servi via `request.get()` est exposée. Les specs data (produits/événements) restent client-side/react-query → non exposées. |
| `next.config.mjs:61-65` | `ignoreBuildErrors:false` + `ignoreDuringBuilds:false` : ajouter `next build` au job `e2e` le fait désormais rougir sur une erreur lint/TS. Doublon avec le job `frontend`, couplage nouveau à assumer. |

## Coût CI estimé de #462

Job `e2e` actuel (run `33431893101`, `dev`, vert) : **13 min 14 s**. Job `frontend` complet
(npm ci + `next build` + vitest + typecheck + lint) : 2 min 07 s ⇒ `next build` seul ≈ **60-90 s**.
Un seul build nécessaire ⇒ **surcoût ≈ +1 à +1,5 min (~+10 %)**, partiellement compensé par la
disparition des compilations à froid `next dev` et du `timeout: 120_000` de démarrage.
