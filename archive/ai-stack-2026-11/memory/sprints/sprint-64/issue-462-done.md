# Issues #462 + #427 — E2E de CI contre un build de production

**Sprint 64, vague 3 (dernière)** · #462 P2/size:M `epic:infrastructure` · #427 P3/size:XS
`epic:devops` (absorbée ici sur arbitrage dev)

| Commit | Objet | Diff |
|---|---|---|
| `dcc23b2` | `:wrench: ci(e2e): fait tourner la suite E2E contre un build de production (#462)` | `.github/workflows/ci.yml` +169 / -22 |
| `edef66c` | `:wrench: fix(e2e): echoue tot si le webServer local n'a pas ses variables (#427)` | `frontend/playwright.config.ts` +77 / -3 |

## Forme retenue pour #462

**Un seul `next build`** (variables posées **au build**, `PIT-S58-003`), puis **deux `next start`**
issus de ce même build : `:3000` en mode dégradé, `:3001` avec `AUTH_JWT_PUBLIC_KEY`.
`PLAYWRIGHT_BASE_URL` est posé **par passe**.

Nouveaux steps du job `e2e` : `Build frontend (production)` → `Start frontend production servers` →
`Wait for frontends + oracles` → passe 1 → passe 2 → `Dump frontend logs (on failure)`.

`APP_CORS_ALLOWED_ORIGINS` élargi à `:3001` (`PIT-S56-004` — le proxy Next relaie l'`Origin`).

## Le point dur : la passe 2 RS256 exerce-t-elle encore le mode vérifiant ?

C'était le mode d'échec silencieux à éviter : une passe 2 **verte en n'exerçant plus rien**.

**Deux ports plutôt qu'un kill/relance — choix motivé par le mode d'échec**, et c'est le bon
raisonnement : un `kill` raté laisse la passe 2 tourner sur le serveur dégradé, **verte et vide** ;
un `:3001` absent donne une **connexion refusée**, bruyante et immédiate. On échange une panne
silencieuse contre une panne visible.

**Preuve par contrôle négatif** — mesurée en local sur un build de production, backend frère
appairé (paire jetable) :

| Cible de la passe 2 | Résultat |
|---|---|
| serveur **vérifiant** | **12/12, 0 skip** — dont anti-dégradé, contrôle positif, signature falsifiée, `alg:none`, `alg:HS256`, jeton expiré |
| serveur **dégradé** (contrôle négatif) | **5 ROUGES**, anti-dégradé en tête : `Expected 307 / Received 200` |

Le faux vert est donc **structurellement impossible** : si la passe 2 était pointée sur le mauvais
serveur, elle rougirait. C'est exactement le niveau de preuve que réclamait le briefing.

**En plus** : un step d'oracle `curl` **avant** les passes — un cookie `jwt` non-JWT sur
`/fr/dashboard` doit rendre **200 sur `:3000`** et **307 sur `:3001`**, sinon `::error::` nommé.
Mesuré 200/307 sur les deux builds locaux. Le mode d'authentification est donc vérifié avant que le
moindre test ne tourne.

## `document-lang.spec.ts` — le risque le plus sournois, levé

Les 5 tests exposés ont été **rejoués un par un** contre un `next start` de production, comme exigé
(et non supposés verts) :

`/fr/nope` ✓ · `/en/nope` ✓ · `/es/nope` ✓ · `/de/nope` ✓ — 404 + `<html lang>` +
`global-not-found-screen` + `<title>` = « Ma Timeline ». Hydratation `/de/nope` ✓ (`lang=de`,
h1 « Seite nicht gefunden », href `/de`).

Les 8 autres tests du fichier sont verts aussi : **13/13**. Le prérendu de `/_not-found` en
production ne casse pas le contrat.

## #427 — échec précoce

`assertWebServerEnv()` est évalué **avant** la construction de l'objet `webServer`, donc uniquement
sur le chemin local (`PLAYWRIGHT_BASE_URL` absent). Contrôles joués :

| Cas | Résultat |
|---|---|
| sans variables | **exit 1 en < 1 s** |
| `PLAYWRIGHT_BASE_URL` posée | OK — 239 tests listés |
| variables posées | OK |
| `E2E_API_PROXY_TARGET=` **vide** | **échec** (`PIT-S55-001` : une variable exportée vide n'est pas une variable posée) |

Le message nomme les variables manquantes, donne la cause (404 sur register, sprints 47/56/57),
deux recettes de lancement, et l'oracle `curl /api/auth/me` → 401. La piste `env` de l'issue est
écartée **et motivée dans le fichier** (elle inventerait le port du backend).

## Coût CI — mesuré en local seulement

**Aucun run CI n'a eu lieu.** Mesures locales, même poste, `workers: 1` :

- `next build` : **28 s**
- suite complète : **4,3 min en production** contre **9,0 min en dev** (mesure #465)

Signal inattendu et à confirmer : le surcoût du build est **probablement plus que compensé** par la
disparition des compilations à froid — le job pourrait **raccourcir**, pas rallonger. Référence
avant : 13 min 14 s (run `33431893101`).

## Non prouvé — à lire avant de considérer la vague close

1. **Aucun run CI.** Le dev n'a pas ouvert de PR jetable, en jugeant que l'arbitrage humain tracé ne
   couvrait que #461 et qu'une PR sur un **dépôt public est une publication**. Ce refus de
   généraliser une autorisation ponctuelle est le bon réflexe. Restent donc non prouvés sur runner :
   la **durée réelle** du job, le comportement de `next build` sous `ignoreBuildErrors: false` en CI,
   et le fait que GitHub Actions garde **deux `next start`** en tâche de fond entre steps (même
   patron que le backend, qui fonctionne déjà — mais non vérifié pour deux process frontend).
   → La PR de sprint (Phase 9) est le premier run réel.
2. **La passe 2 appairée a été prouvée sur `:3100`**, pas `:3001` — le CORS du conteneur local était
   figé sur 3000/3100. Seul le numéro de port diffère.
3. **Écart avec la correction d'environnement transmise par le lead** : à son démarrage, `:3000`
   **était vivant** (PID 26726, `curl` 401) — c'est **ce dev** qui l'a tué pour libérer le port. La
   « mort à la reap » rapportée par la vague 2 était donc inexacte. Sans conséquence sur les mesures
   de #465, qui sont antérieures.
   État final : ports 3000/3100 libres ; le `.next` du worktree est bâti vers un backend `:8087`
   **supprimé depuis** — **rebâtir avant tout usage**.

## Flake de virtualisation revu (non corrigé)

`timeline.spec.ts:966 :: live-region` — `pill.focus()` en timeout, locator à 0 élément. **Non
corrigé et non confondu avec un effet du passage en production**, comme demandé. Le même run compte
230 passed, et la vague 2 avait vu l'**autre** membre de la famille (`event-outside-label`) : cela
confirme une nouvelle fois qu'il s'agit d'une famille dépendante du volume accumulé, pas d'une
régression. Suivi : issue **#467**.

## Vérifications faites par le lead

- `git show --stat` sur les deux commits : périmètres conformes (`ci.yml` seul pour #462,
  `playwright.config.ts` seul pour #427).
- Garde-fous des vagues précédentes **intacts** : `workers: 1` (ligne 141), reporter composite
  (156), `testMatch` firefox (196), `if-no-files-found: warn` (461).
- `assertWebServerEnv()` relu : bien placé **avant** la construction de `webServer` (206-217), et
  commente `PIT-S55-001` sur la variable vide.
- Structure des steps du job `e2e` relue : build → 2 serveurs → oracles → passe 1 → passe 2 →
  upload → dump logs → stop.

## [MEMORY:*] signaux

- **[MEMORY:pitfall]** `next start` émet « does not work with `output: standalone` » — message
  **trompeur** : le service a été vérifié correct (SSG 200, `/fr/nope` 404, chunk JS 200, CSS 200,
  `favicon.ico` 200, rewrite actif). **Contredit `PIT-S62-009`**, qui l'annonçait « non fiable ».
  Ne pas basculer sur `.next/standalone/server.js` sur la foi de ce message.
- **[MEMORY:pattern]** Prouver un **mode d'exécution** par **contrôle négatif** — pointer la passe
  sur le mauvais serveur et **exiger le rouge** — tranche là où une CI verte ne prouve rien.
  Généralisable au-delà de ce cas.
- **[MEMORY:pitfall]** `curl … -w '%{http_code}' || echo 000` **concatène** au lieu de substituer →
  `000000`, qui passe le test `-lt 500` : la boucle d'attente est rompue dès le premier tour.
- **[MEMORY:decision]** Deux ports plutôt qu'un kill/relance entre les passes : on choisit le mode
  d'échec **bruyant** (connexion refusée) contre le mode d'échec **silencieux** (passe verte qui
  n'exerce plus rien).

## Recommandations suite

- **RECOMMAND_FOLLOWUP** — mesurer la durée réelle du job `e2e` sur la PR de sprint et la consigner
  (le gain attendu est un signal, pas un acquis).
- **RECOMMAND_FOLLOWUP** — `frontend/.gitignore` n'ignore pas `*.log` : `next-degraded.log` /
  `next-verifying.log` ne sont produits qu'en CI, mais restent un butin possible pour un `git add`
  voisin.

STATUS: COMPLETED
