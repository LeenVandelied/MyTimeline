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

# --- Frontend unitaires : Vitest ("test" = "vitest run") ---------------------
run_frontend() {
  # Suite unitaire Vitest. Skip explicite si aucun script "test" (plutôt qu'un
  # faux échec). Code de sortie de Vitest propagé : un test rouge => script rouge
  # (critère #133).
  if [ -f "${FRONTEND_DIR}/package.json" ] \
     && grep -qE '"test"[[:space:]]*:' "${FRONTEND_DIR}/package.json"; then
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
