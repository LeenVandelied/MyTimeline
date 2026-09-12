# Spécialistes Sprint 60 — review batch, audit sécurité, exécution des suites

> Artefact de traçabilité (Phases 5-7). Les rapports des spécialistes n'étaient consignés que dans
> le contexte du lead ; ils sont fixés ici pour que la clôture soit vérifiable après coup.

## Audit sécurité — `security-expert`, sur le job `secret-scan` (#362)

Spawné par le lead (profondeur 1). Portée : `.github/workflows/ci.yml`, `.gitleaks.toml`,
`.gitleaksignore`, §9 de `docs/memory/audits/secret-exposure-audit.md`.

### `[MAJEUR]` — corrigé pendant le sprint (`bdf6671`)

`.gitleaksignore` épinglait une empreinte
(`0d1d7395…:…/ExportTokenServiceTest.java:generic-api-key:27`) sur le fixture `SECRET`
**toujours présent au HEAD** (`ExportTokenServiceTest.java:40`, `git blame` : ligne jamais modifiée
depuis son commit d'introduction). Cela contredit la règle écrite en tête de `.gitleaksignore`
lui-même : « NE PAS ajouter ici une occurrence encore présente au HEAD ».

La constante s'appelle `SECRET`, pas `EXPORT_TOKEN_SECRET` : l'allowlist durable, qui filtre par
**nom de clé**, ne la couvrait pas. Mode d'échec **discret plutôt que bruyant** — la ligne n'ayant
jamais été retouchée, l'empreinte restait valide indéfiniment, donc le masquage devenait
**permanent** au lieu de rougir au premier reformatage. Risque intrinsèque faible ici (valeur
auto-marquée `test-only-insecure`), mais le **mécanisme** était démontré cassé.

Correction : exclusion durable dans `.gitleaks.toml` (bloc 3), ancrée sur le marqueur
`test-only-insecure` de la valeur (en base64) **et** sur ce seul fichier, `condition = "AND"`.
Vérifié par le lead dans les deux sens après correction :
- dépôt complet → **772 commits, 0 détection, exit 0**
- même valeur dans `application-prod.properties` → **détectée** (`generic-api-key`)
- clé Stripe dans `ExportTokenServiceTest.java` → **détectée** (`stripe-access-token`)

Les 5 autres empreintes du groupe `jwt.secret=` ont été vérifiées **absentes du HEAD**.

### `[OK]` — chacun appuyé sur un test exécuté

- `condition = "AND"` prouvé indispensable : la variante `"OR"` rejouée rend **invisible** un secret
  posé hors des chemins listés (0 leak au lieu de 1).
- Blanchiment scopé par nom, pas par fichier : une clé Stripe dans `.env.example` (chemin
  allowlisté) reste détectée.
- Exclusion PEM : une vraie clé privée collée dans `JwtServiceRs256Test.java` — le fichier même de
  l'exclusion — reste détectée. Seul le littéral d'armure Java est blanchi.
- Somme SHA-256 du binaire gitleaks 8.30.1 **recalculée depuis GitHub** et conforme à
  `GITLEAKS_SHA256` du workflow : ce n'est pas un hash auto-référentiel.
- Angle mort `DB_PASSWORD` confirmé par test (`10 caractères alpha` → 0 détection) et correctement
  documenté, pas dissimulé.
- Sûreté du job : `permissions: contents: read` hérité, pas de `pull_request_target`, aucun
  `secrets.*` référencé, aucun `upload-artifact`, `--redact` présent, `persist-credentials: false`.

### `[NON TESTÉ]` assumé
Épinglage SHA des actions tierces (`checkout`, `setup-java`, `setup-node`, `trivy-action`) non
confronté aux tags officiels. Priorité faible en l'absence totale de secrets Actions.

## Review batch — `reviewer`, sur le diff complet

Spawné par le lead. **Aucun `[CRITIQUE]`.**

- `[MAJEUR]` sur la portée de l'exclusion PEM : demandait une contre-épreuve plutôt qu'il ne
  constatait un défaut. **Tranché par le lead**, dans des dépôts jetables — littéral d'armure seul
  → 0 détection exit 0 ; vraie clé PEM RSA-2048 dans ce **même** fichier exclu → détectée exit 1 ;
  clé PEM dans un fichier quelconque → détectée. **Aucun défaut.**
- `[MINEUR]` limite « imports mono-ligne » du préflight #308 → **traité**, écrit dans le README.
- `[MINEUR]` `secret-scan` pas encore requis → **follow-up**, dépend d'un premier run CI vert
  (désormais obtenu).
- `[OK]` : job `secret-scan`, empreintes `.gitleaksignore`, bump `nanoid`, préflight #308,
  cohérence README/code.

## Exécution des suites — pas de `test-runner`, écart assumé

**Aucun subagent `test-runner` n'a été spawné pour ce sprint.** Les suites ont été exécutées
directement, avec lecture des **codes de sortie réels** via `rtk proxy` (`PIT-S45-003`) :

- par l'agent de #422 : frontend 95 fichiers / 888 tests exit 0 · `build`/`typecheck`/`lint` exit 0
  · **E2E 169 passed / 0 failed / 8 skipped exit 0**
- re-mesuré par le lead après la reprise de #308 : frontend **95 fichiers / 888 tests exit 0**,
  chiffre identique — c'est ce qui permet d'affirmer que #308 n'a rien régressé.

Justification de l'écart : la suite frontend tient en ~20 s et 888 tests, sous les seuils qui
motivent l'isolation d'un `test-runner` (>500 tests **et** sortie volumineuse). Le risque que le
protocole veut couvrir — un rapport de test faux mais plausible, `PIT-S53-006` — a été traité
autrement : chaque chiffre a été re-mesuré depuis le worktree, et le cwd vérifié.

La suite **backend n'a pas été rejouée en local** : zéro fichier `backend/**` au diff. Le job CI
requis `backend` l'a couverte sur la PR #432 (**pass en 1 min 11**).

## Résultat CI final — PR #432, 7/7 verts au premier run

`secret-scan` 8 s · `ai-env-packs` 10 s · **`security` 39 s** · `flyway-smoke` 51 s ·
`backend` 1 min 11 · `frontend` 2 min 26 · `e2e` 6 min 39.

Le job `security` était rouge sur **toutes** les PR du dépôt avant ce sprint.

STATUS: COMPLETED
