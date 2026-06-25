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
#   e2e | frontend            → tests frontend (aucun runner configuré à ce jour → skip explicite)
#   all                       → backend puis frontend
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

run_frontend() {
  # Aucun runner de test configuré dans frontend/package.json (ni Playwright,
  # ni Jest/Vitest) au moment de l'écriture. On skippe explicitement plutôt que
  # de remonter un faux échec. À câbler ici quand un script "test"/"e2e" existera.
  if [ -f "${FRONTEND_DIR}/package.json" ] \
     && grep -qE '"(test|e2e|test:e2e)"[[:space:]]*:' "${FRONTEND_DIR}/package.json"; then
    echo "▶ Frontend : npm test"
    ( cd "${FRONTEND_DIR}" && npm test --silent )
    echo "✓ Frontend : OK"
  else
    echo "⊘ Frontend : aucun runner de test configuré (package.json sans script test/e2e) — skip."
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
  e2e|frontend)
    run_frontend
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
