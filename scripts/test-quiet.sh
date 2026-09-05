#!/usr/bin/env bash
#
# test-quiet.sh — lanceur de tests à sortie condensée pour MyTimeline.
#
# Isole la sortie verbeuse Maven/Testcontainers du contexte appelant (agent
# test-runner, briefings de sprint) et ne remonte que l'essentiel : la ligne
# "Tests run: ..." et le statut BUILD SUCCESS/FAILURE. En cas d'échec, la
# sortie complète est conservée dans un fichier de log dont le chemin est
# affiché.
#
# Usage (appelable depuis la racine du repo OU n'importe où) :
#   ./scripts/test-quiet.sh [scope]
#
# Scopes :
#   unit | backend   (défaut) → suite backend Spring Boot (Testcontainers Postgres, Docker requis)
#   coverage                  → idem + rapport de couverture si jacoco est configuré
#   frontend                  → tests unitaires frontend Vitest (npm test = "vitest run")
#   e2e                       → tests E2E Playwright (npm run test:e2e ; navigateurs + stack requis)
#   all                       → backend puis frontend unitaires (Vitest). E2E NON inclus
#                               (nécessite la stack complète — lancer `e2e` séparément).
#
# Commande sous-jacente backend (la sortie verbeuse part dans un log, seul
# l'agrégat "Tests run:" + le verdict sont affichés) :
#   cd backend && SKIP_DELEGATION=1 ./mvnw test
# La variante quiet validée manuellement reste équivalente et fonctionne :
#   cd backend && SKIP_DELEGATION=1 ./mvnw -q test
# (SKIP_DELEGATION=1 neutralise le hook qui bloque `mvn test` nu ; le profil de
#  test injecte la datasource via Testcontainers, aucun DB_PASSWORD requis.)
#
set -euo pipefail

# --- Résolution du repo root depuis l'emplacement réel du script -------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
FRONTEND_DIR="${REPO_ROOT}/frontend"

SCOPE="${1:-unit}"

# --- Backend : sélectionne le wrapper si présent, sinon mvn système ----------
backend_mvn_cmd() {
  if [ -x "${BACKEND_DIR}/mvnw" ]; then
    echo "./mvnw"
  elif command -v mvn >/dev/null 2>&1; then
    echo "mvn"
  else
    echo "" # ni wrapper ni mvn
  fi
}

run_backend() {
  local goals=( "$@" ) # ex. ("test") ou ("test" "jacoco:report")
  local mvn_bin
  mvn_bin="$(backend_mvn_cmd)"
  if [ -z "${mvn_bin}" ]; then
    echo "✗ Ni ./mvnw (backend) ni mvn système trouvés — impossible de lancer les tests backend." >&2
    return 127
  fi

  local logfile
  logfile="$(mktemp -t mytimeline-backend-tests.XXXXXX.log)"

  echo "▶ Backend : ${mvn_bin} ${goals[*]}  (cwd=backend, SKIP_DELEGATION=1)"
  echo "  log complet → ${logfile}"

  local status=0
  # Sortie verbeuse complète capturée dans le log ; seul l'essentiel est affiché.
  # (Pas de -q ici, sinon surefire masque l'agrégat "Tests run:" et "BUILD SUCCESS"
  #  qu'on veut justement remonter. Le -q manuel reste valide hors script.)
  ( cd "${BACKEND_DIR}" && SKIP_DELEGATION=1 "${mvn_bin}" "${goals[@]}" ) \
    >"${logfile}" 2>&1 || status=$?

  # Résumé condensé : agrégat surefire (ligne "Tests run:" SANS suffixe "- in ...",
  # c.-à-d. le total du bloc Results) + le verdict du build.
  grep -E "^\[INFO\] Tests run:|^Tests run:" "${logfile}" | grep -v -- "- in " | tail -n 1 || true
  grep -E "BUILD (SUCCESS|FAILURE)" "${logfile}" | tail -n 1 || true

  if [ "${status}" -ne 0 ]; then
    # En cas d'échec, remonter aussi les classes/tests en échec pour le diagnostic.
    grep -E "Tests run:.*(Failures: [1-9]|Errors: [1-9])|FAIL|\[ERROR\]" "${logfile}" | tail -n 30 || true
    echo "✗ Backend : échec (exit ${status}). Sortie complète : ${logfile}" >&2
    return "${status}"
  fi
  echo "✓ Backend : OK"
  rm -f "${logfile}"
  return 0
}

# --- Préflight frontend (#308) -----------------------------------------------
# Mode d'échec visé : `node_modules` absent ou incomplet dans le répertoire
# RÉELLEMENT testé. Le symptôme brut est trompeur — la suite
# src/__tests__/console-error-guard.test.ts charge la config ESLint réelle
# (`new ESLint().calculateConfigForFile`), donc exécute les imports de
# frontend/eslint.config.mjs ; un plugin manquant y produit
#   Error: Cannot find package 'eslint-plugin-storybook' imported from …
# qui se lit comme une régression de la garde anti-fuite credentials #160/#258
# alors que seul l'environnement est en cause. Cas déjà survenu deux fois
# (PIT-S41-004, PIT-S53-006 : rapport d'agent entièrement faux mais plausible).
# On échoue donc AVANT vitest, avec le diagnostic et le correctif.
frontend_env_hint() {
  cat >&2 <<EOF
  ─────────────────────────────────────────────────────────────────────────────
  Ce n'est PAS une régression du code testé : l'environnement Node du
  répertoire ci-dessous est absent ou incomplet.
    répertoire testé : ${FRONTEND_DIR}
    script exécuté   : ${SCRIPT_DIR}/test-quiet.sh  (les chemins sont résolus
                       depuis la position du script, jamais depuis le cwd)
  Correctif :
    ( cd "${FRONTEND_DIR}" && npm ci )
  Chaque worktree de sprint (.claude/worktrees/…) a son PROPRE node_modules :
  lancer ce script depuis le dépôt principal ne teste PAS le code du worktree,
  et inversement. Vérifier le dépôt visé :
    /usr/bin/git -C "${REPO_ROOT}" rev-parse --show-toplevel
    /usr/bin/git -C "${REPO_ROOT}" branch --show-current
  Approvisionnement automatique de node_modules dans les worktrees : issue #272
  (hors périmètre de ce préflight, qui se contente de nommer le problème).
  ─────────────────────────────────────────────────────────────────────────────
EOF
}

frontend_preflight() {
  if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
    echo "✗ Frontend : ${FRONTEND_DIR}/node_modules est absent — dépendances jamais installées ici." >&2
    frontend_env_hint
    return 3
  fi
  # Répertoire présent mais vide (symlink cassé, install interrompue) : même cause.
  if [ -z "$(ls -A "${FRONTEND_DIR}/node_modules" 2>/dev/null)" ]; then
    echo "✗ Frontend : ${FRONTEND_DIR}/node_modules existe mais est VIDE." >&2
    frontend_env_hint
    return 3
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "✗ Frontend : 'node' introuvable dans le PATH — impossible de lancer Vitest." >&2
    return 127
  fi

  # Résolvabilité des paquets importés par eslint.config.mjs. Limites assumées :
  # ne couvre QUE les imports mono-ligne de ce seul fichier (un import multi-ligne
  # ou un `require()` dynamique passe sous le radar), et ne valide pas le reste de
  # l'arbre de dépendances — c'est un détecteur du cas de figure documenté
  # ci-dessus, pas une vérification d'intégrité de node_modules.
  local missing=""
  local probe_status=0
  missing="$(PREFLIGHT_FRONTEND_DIR="${FRONTEND_DIR}" node - <<'PREFLIGHT_JS'
const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

const dir = process.env.PREFLIGHT_FRONTEND_DIR
const cfgPath = path.join(dir, 'eslint.config.mjs')
if (!fs.existsSync(cfgPath)) process.exit(0)

const src = fs.readFileSync(cfgPath, 'utf8')
const specs = new Set()
const importRe = /^\s*import\s[^'"]*['"]([^'"]+)['"]/gm
let m
while ((m = importRe.exec(src)) !== null) specs.add(m[1])

const req = createRequire(path.join(dir, '__preflight__.cjs'))
const missing = []
for (const spec of specs) {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:')) continue
  try {
    req.resolve(spec)
  } catch (err) {
    // Seul un paquet INTROUVABLE compte. Un paquet présent mais non exposé en
    // CJS échoue avec ERR_PACKAGE_PATH_NOT_EXPORTED : ce n'est pas un manque.
    if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ERR_MODULE_NOT_FOUND') missing.push(spec)
  }
}
process.stdout.write(missing.join(' '))
PREFLIGHT_JS
  )" || probe_status=$?

  if [ "${probe_status}" -ne 0 ]; then
    # Le préflight ne doit jamais empêcher de lancer les tests : on prévient et on passe.
    echo "⚠ Frontend : préflight de résolution non concluant (exit ${probe_status}) — poursuite vers Vitest." >&2
    return 0
  fi

  if [ -n "${missing}" ]; then
    echo "✗ Frontend : paquet(s) importé(s) par eslint.config.mjs non résolvable(s) : ${missing}" >&2
    echo "  Sans ce préflight, le symptôme est \"Cannot find package …\" dans" >&2
    echo "  src/__tests__/console-error-guard.test.ts (il charge la config ESLint réelle)," >&2
    echo "  ce qui se lit à tort comme une régression de la garde console.error #160/#258." >&2
    frontend_env_hint
    return 3
  fi
  return 0
}

# --- Frontend unitaires : Vitest ("test" = "vitest run") ---------------------
run_frontend() {
  # Suite unitaire Vitest. Skip explicite si aucun script "test" (plutôt qu'un
  # faux échec). Code de sortie de Vitest propagé : un test rouge => script rouge
  # (critère #133).
  if [ -f "${FRONTEND_DIR}/package.json" ] \
     && grep -qE '"test"[[:space:]]*:' "${FRONTEND_DIR}/package.json"; then
    # #308 — échouer avec un diagnostic actionnable plutôt que de laisser Vitest
    # cracher un « Cannot find package » qui accuse le code.
    local pre=0
    frontend_preflight || pre=$?
    if [ "${pre}" -ne 0 ]; then
      return "${pre}"
    fi
    echo "▶ Frontend (unitaires) : npm test  (vitest run, cwd=frontend)"
    local status=0
    ( cd "${FRONTEND_DIR}" && npm test --silent ) || status=$?
    if [ "${status}" -ne 0 ]; then
      echo "✗ Frontend (unitaires) : échec Vitest (exit ${status})." >&2
      return "${status}"
    fi
    echo "✓ Frontend (unitaires) : OK"
  else
    echo "⊘ Frontend : aucun script \"test\" (Vitest) dans package.json — skip."
  fi
  return 0
}

# --- E2E : Playwright ("test:e2e" = "playwright test") -----------------------
run_e2e() {
  # Suite E2E Playwright. Nécessite les navigateurs Playwright ET la stack
  # (backend + frontend) accessibles là où le script tourne (local + CI, cf. job
  # `e2e` de .github/workflows/ci.yml). Skip explicite si aucun script "test:e2e".
  # Code de sortie de Playwright propagé (critère #207).
  if [ -f "${FRONTEND_DIR}/package.json" ] \
     && grep -qE '"test:e2e"[[:space:]]*:' "${FRONTEND_DIR}/package.json"; then
    echo "▶ E2E : npm run test:e2e  (Playwright, cwd=frontend)"
    local status=0
    ( cd "${FRONTEND_DIR}" && npm run test:e2e ) || status=$?
    if [ "${status}" -ne 0 ]; then
      echo "✗ E2E : échec Playwright (exit ${status}). Vérifier navigateurs (npx playwright install) et stack up." >&2
      return "${status}"
    fi
    echo "✓ E2E : OK"
  else
    echo "⊘ E2E : aucun script \"test:e2e\" (Playwright) dans package.json — skip."
  fi
  return 0
}

case "${SCOPE}" in
  unit|backend)
    run_backend test
    ;;
  coverage)
    # Pas de plugin jacoco dans backend/pom.xml à ce jour : 'coverage' exécute la
    # suite. Brancher le goal jacoco (ex. "test jacoco:report") quand il sera ajouté.
    if grep -q "jacoco" "${BACKEND_DIR}/pom.xml" 2>/dev/null; then
      run_backend test jacoco:report
    else
      echo "ℹ jacoco non configuré dans backend/pom.xml — exécution de la suite sans rapport de couverture."
      run_backend test
    fi
    ;;
  frontend)
    run_frontend
    ;;
  e2e)
    run_e2e
    ;;
  all)
    run_backend test
    run_frontend
    ;;
  -h|--help|help)
    sed -n '2,40p' "${BASH_SOURCE[0]}"
    ;;
  *)
    echo "Scope inconnu : '${SCOPE}'. Scopes valides : unit | backend | coverage | e2e | frontend | all" >&2
    exit 2
    ;;
esac
