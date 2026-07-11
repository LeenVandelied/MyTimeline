#!/usr/bin/env bash
# =============================================================
# flyway-validate.sh — Runbook exécutable : valider la migration Flyway V11
# sur une base RÉELLE (dump/staging avec historique Flyway 9) AVANT prod.
# Issue #181 (Sprint 29). Voir docs/ops/flyway-v11-validation.md.
#
# CE QUE FAIT CE SCRIPT (aucune écriture DDL/DML de lui-même sans confirmation) :
#   (a) flyway validate + flyway info  -> détecte tout CHECKSUM MISMATCH V1–V10
#       (l'algorithme de checksum a changé entre Flyway 9 et Flyway 10, upgrade #162).
#   (b) requête de diagnostic PRÉ-V11 : compte les lignes que V11 reclasserait
#       SILENCIEUSEMENT (duration->single, is_recurring->false) sans recalcul end_date.
#   (c) GATE : si count > 0, AVERTISSEMENT + arrêt AVANT `migrate`. Décision à
#       documenter (accepter la reclassification OU script de correction préalable).
#   (d) `migrate` n'est proposé QUE si count = 0 ET si l'opérateur passe RUN_MIGRATE=1.
#
# USAGE :
#   FLYWAY_URL=jdbc:postgresql://host:5432/eventmanager \
#   FLYWAY_USER=eventuser FLYWAY_PASSWORD=*** \
#   ./scripts/flyway-validate.sh
#
#   # Base non-locale (staging/prod-like) : garde-fou -> exige CONFIRM_PROD=yes
#   CONFIRM_PROD=yes FLYWAY_URL=jdbc:postgresql://staging-host/... ./scripts/flyway-validate.sh
#
#   # Proposer flyway migrate après un run vert (count=0) :
#   RUN_MIGRATE=1 ./scripts/flyway-validate.sh
#
# PRÉ-REQUIS : Flyway CLI 10.x OU Docker (image flyway/flyway:10-alpine, alignée
#   sur le projet — Boot 3.4.13 embarque Flyway 10.x, cf. issue #162 : 10.20.1).
#   Requête de diagnostic : psql local OU Docker (postgres:16).
# =============================================================
set -euo pipefail

# --- Paramètres (défauts = base LOCALE de dev) ---------------------------------
FLYWAY_URL="${FLYWAY_URL:-jdbc:postgresql://localhost:5432/eventmanager}"
FLYWAY_USER="${FLYWAY_USER:-eventuser}"
FLYWAY_PASSWORD="${FLYWAY_PASSWORD:-}"
CONFIRM_PROD="${CONFIRM_PROD:-no}"
RUN_MIGRATE="${RUN_MIGRATE:-0}"
FLYWAY_IMAGE="${FLYWAY_IMAGE:-flyway/flyway:10-alpine}"

# Emplacement des migrations (source unique de vérité).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${REPO_ROOT}/backend/src/main/resources/db/migration"

log()  { printf '\033[1;34m[flyway-validate]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[AVERTISSEMENT]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[ERREUR]\033[0m %s\n' "$*" >&2; exit 1; }

[ -d "${MIGRATIONS_DIR}" ] || die "Dossier migrations introuvable : ${MIGRATIONS_DIR}"

# --- Garde-fou prod : refuse une URL non-locale sans confirmation explicite ----
case "${FLYWAY_URL}" in
  *localhost*|*127.0.0.1*)
    : ;;  # base locale : OK sans confirmation
  *)
    if [ "${CONFIRM_PROD}" != "yes" ]; then
      die "FLYWAY_URL ne pointe pas une base locale (${FLYWAY_URL}).
       Refus par sécurité. Ce script est un OUTIL DE VALIDATION, pas un déployeur.
       Si vous ciblez sciemment un dump/staging représentatif, relancez avec :
         CONFIRM_PROD=yes ...
       Ne JAMAIS le lancer contre la prod live."
    fi
    warn "URL non-locale confirmée (CONFIRM_PROD=yes) : ${FLYWAY_URL}"
    ;;
esac

# --- Sélection du runner Flyway : CLI native sinon Docker ----------------------
flyway_run() {
  if command -v flyway >/dev/null 2>&1; then
    flyway \
      -url="${FLYWAY_URL}" -user="${FLYWAY_USER}" -password="${FLYWAY_PASSWORD}" \
      -locations="filesystem:${MIGRATIONS_DIR}" \
      -baselineOnMigrate=true \
      "$@"
  elif command -v docker >/dev/null 2>&1; then
    # host.docker.internal : depuis le conteneur, 'localhost' = le conteneur.
    local url="${FLYWAY_URL/localhost/host.docker.internal}"
    docker run --rm \
      -v "${MIGRATIONS_DIR}:/flyway/sql:ro" \
      "${FLYWAY_IMAGE}" \
      -url="${url}" -user="${FLYWAY_USER}" -password="${FLYWAY_PASSWORD}" \
      -locations="filesystem:/flyway/sql" \
      -baselineOnMigrate=true \
      "$@"
  else
    die "Ni la CLI 'flyway' ni 'docker' ne sont disponibles.
       Installez Flyway 10.x (https://flywaydb.org/download) ou Docker, puis relancez."
  fi
}

# --- Diagnostic SQL (psql local sinon Docker postgres:16) ----------------------
# Parse jdbc:postgresql://host:port/db -> host / port / db pour psql.
parse_jdbc() {
  local u="${FLYWAY_URL#jdbc:postgresql://}"
  u="${u%%\?*}"                 # retire ?params éventuels
  local hostport="${u%%/*}"
  DB_NAME="${u#*/}"
  DB_HOST="${hostport%%:*}"
  DB_PORT="${hostport##*:}"
  [ "${DB_PORT}" = "${DB_HOST}" ] && DB_PORT="5432"  # pas de port explicite
}

DIAGNOSTIC_SQL="SELECT count(*) FROM events \
WHERE (type='duration' AND duration_unit IS NULL) \
   OR (is_recurring IS TRUE AND recurrence_unit IS NULL);"

run_diagnostic_count() {
  parse_jdbc
  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="${FLYWAY_PASSWORD}" psql \
      -h "${DB_HOST}" -p "${DB_PORT}" -U "${FLYWAY_USER}" -d "${DB_NAME}" \
      -tAc "${DIAGNOSTIC_SQL}"
  elif command -v docker >/dev/null 2>&1; then
    local host="${DB_HOST/localhost/host.docker.internal}"
    docker run --rm -e PGPASSWORD="${FLYWAY_PASSWORD}" postgres:16 \
      psql -h "${host}" -p "${DB_PORT}" -U "${FLYWAY_USER}" -d "${DB_NAME}" \
      -tAc "${DIAGNOSTIC_SQL}"
  else
    die "Ni 'psql' ni 'docker' pour exécuter la requête de diagnostic."
  fi
}

# =============================================================
# (a) Détection checksum mismatch V1–V10 (Flyway 9 -> 10)
# =============================================================
log "Étape (a) — flyway validate (détection checksum mismatch V1–V10)…"
if flyway_run validate; then
  log "validate OK : aucun checksum mismatch."
else
  warn "flyway validate a échoué. Cause probable : CHECKSUM MISMATCH V1–V10"
  warn "(algorithme changé entre Flyway 9 et 10, upgrade #162)."
  warn "REMÉDIATION : réaligner l'historique avec 'flyway repair' AVANT tout migrate,"
  warn "puis relancer ce script. NE PAS lancer 'migrate' tant que validate est rouge."
  warn "Consultez 'flyway info' ci-dessous pour identifier les versions concernées."
  flyway_run info || true
  die "Arrêt : résoudre le mismatch (flyway repair) avant de continuer."
fi

log "flyway info (état de l'historique) :"
flyway_run info || true

# =============================================================
# (b) Requête de diagnostic pré-V11
# =============================================================
log "Étape (b) — diagnostic pré-V11 (lignes reclassées silencieusement par V11)…"
RECLASS_COUNT="$(run_diagnostic_count | tr -d '[:space:]')"
[ -n "${RECLASS_COUNT}" ] || die "Impossible de lire le count de diagnostic."
log "Lignes candidates à la reclassification silencieuse : ${RECLASS_COUNT}"

# =============================================================
# (c) GATE
# =============================================================
if [ "${RECLASS_COUNT}" -gt 0 ]; then
  warn "======================================================================"
  warn " GATE BLOQUANT : ${RECLASS_COUNT} ligne(s) seront RECLASSÉES par V11 SANS"
  warn " recalcul de end_date ni traçabilité :"
  warn "   - events type='duration' sans duration_unit   -> type='single'"
  warn "   - events is_recurring=true sans recurrence_unit -> is_recurring=false"
  warn ""
  warn " DÉCISION REQUISE (à documenter dans docs/ops/flyway-v11-validation.md) :"
  warn "   1. ACCEPTER la reclassification (perte sémantique jugée acceptable), OU"
  warn "   2. Écrire un SCRIPT DE CORRECTION PRÉALABLE (recalcule end_date / trace"
  warn "      les lignes avant migration). Squelette dans le runbook §Correction."
  warn ""
  warn " 'migrate' N'EST PAS proposé. Arrêt volontaire avant toute écriture."
  warn "======================================================================"
  exit 2
fi

log "GATE OK : count = 0, aucune reclassification silencieuse. Base saine pour V11."

# =============================================================
# (d) migrate — optionnel, opt-in explicite uniquement
# =============================================================
if [ "${RUN_MIGRATE}" = "1" ]; then
  warn "RUN_MIGRATE=1 : exécution de 'flyway migrate' (écriture DDL/DML réelle)."
  warn "URL cible : ${FLYWAY_URL}"
  flyway_run migrate
  log "migrate terminé. Relancez 'flyway info' pour confirmer V12 appliqué."
else
  log "Pré-requis validés. Pour appliquer la migration, relancez avec RUN_MIGRATE=1."
  log "  RUN_MIGRATE=1 ${0}"
fi

log "Terminé."
