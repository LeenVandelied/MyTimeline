# Sprint 55 — corrections de revue (PR #402)

## Corrections appliquées

- `.env.example` [MAJEUR] — `BREVO_API_KEY=` VIDE (le placeholder `xkeysib-REMPLACER-…`
  n'était pas blanc, donc `BrevoEmailService:64` (`apiKey.isBlank()`) ne no-opait PAS et
  l'appel HTTP partait réellement -> 401 -> `log.error`). Format `xkeysib-…` déplacé dans
  le commentaire.
- `.env.example` [MINEUR] — `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` commentés
  (`#BREVO_…`) : exportés vides, ils écrasent les defaults
  `@Value("${brevo.sender.email:no-reply@mytimeline.app}")` /
  `@Value("${brevo.sender.name:MyTimeline}")` par la chaîne vide.
- `.env.example` [MINEUR] — citation corrigée `BR-AUT-005` -> `BR-AUT-012`
  (`.ai-env/context-packs/br-auth.md:119` = anti-énumération ; `:69` = 401 sans fuite).
- `.env.example` [MINEUR] — l'avertissement « compose ne propage pas » couvre désormais les
  TROIS variables `BREVO_*` (vérifié : `grep BREVO docker-compose.yml` = 0 occurrence).
- `.github/workflows/ci.yml` [MINEUR] — `psql` n'est plus supposé présent sur le runner :
  fonction shell qui l'exécute depuis l'image `postgres:16` déjà tirée pour le service
  container (`docker run --rm --network host -e PGPASSWORD postgres:16 psql`). Ni apt-get,
  ni tirage réseau supplémentaire.
- `.github/workflows/ci.yml` [MINEUR] — filtre `version is not null` ajouté aux deux requêtes
  (comptage + première version) : les migrations répétables `R__*.sql` sont aussi de
  `type='SQL'` mais sans version, et feraient rougir le comptage à tort.
- `frontend/README.md` [MINEUR] — prérequis Node 20 + `npm install` avant `npm run dev`,
  avec renvoi au README racine. 2 lignes, aucune duplication.

## Vérifications

1. YAML valide (Ruby/psych) : `["backend", "e2e", "flyway-smoke", "frontend", "security"]`,
   `needs=nil steps=7`.
2. `bash -n` sur le bloc `run` modifié : OK.
3. `grep -n BREVO .env.example` : `60:BREVO_API_KEY=` (valeur vide), `69:#BREVO_SENDER_EMAIL=`,
   `70:#BREVO_SENDER_NAME=`.
4. `grep -in "vercel|déploiement|deploy" frontend/README.md` : aucune occurrence (exit 1).
5. SQL final :
   `select count(*) from flyway_schema_history where type = 'SQL' and version is not null and success`
   et
   `select version from flyway_schema_history where type = 'SQL' and version is not null order by installed_rank limit 1`.
   Reste juste pour V1..V15 : les 15 fichiers du dossier sont TOUS versionnés (`V1__` … `V15__`,
   aucun `R__`), donc `version is not null` ne retire aucune ligne aujourd'hui — `applied` vaut
   toujours 15 et `first` vaut toujours `1`.

## Non appliqué

- `BrevoEmailService.java:84` cite lui aussi `BR-AUT-005` au lieu de `BR-AUT-012` — hors
  périmètre (code applicatif), non touché comme demandé. C'est la source de l'erreur de citation.
- `docker-compose.yml` ne propage aucune variable `BREVO_*` — non modifié (décision de
  conception, pas une correction de revue).
- CI non rejouée localement (impossible) : les deux modifications de `ci.yml` sont tranchées par
  le run déclenché par le push.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — `BrevoEmailService.java:84` (commentaire du `catch`) et le javadoc de
  classe (~l.30) citent `BR-AUT-005` au lieu de `BR-AUT-012`. C'est la **source** de l'erreur de
  citation propagée dans `.env.example` puis dans l'audit. [XS | auth]
- `RECOMMAND_FOLLOWUP` — `docker-compose.yml` ne propage aucune variable `BREVO_*` au service
  backend : renseigner `.env` seul ne les active pas sous `docker compose up`. Décision de
  conception, pas une correction de revue. [S | infrastructure]
- Pas de `RECOMMAND_DB_EXPERT` : aucune migration, aucun `.sql` touché.
- Pas de `RECOMMAND_SECURITY` : aucun code d'authentification modifié — le seul fichier lié à un
  secret est `.env.example`, dont la valeur livrée est désormais **vide**.
- Pas de `RECOMMAND_TEST_RUNNER` : aucun code applicatif touché, la suite est exercée par la CI
  de la PR (5/5 verts).
- Pas de `RECOMMAND_UI_DESIGN` : aucun `.tsx`, aucun token, aucun rendu modifié.

STATUS: COMPLETED
