#!/usr/bin/env bash
# =============================================================
# Sauvegarde de la production MyTimeline (issue #371, ADR-009 §8).
# À exécuter SUR l'hôte de production, par cron.
#
#   /opt/matimeline/scripts/backup-prod.sh
#
# Périmètre — les quatre sont nécessaires à une restauration complète :
#   1. la base PostgreSQL            (pg_dump, format custom)
#   2. le volume des avatars         (#212 : stockage local tant qu'il dure)
#   3. le volume des exports RGPD
#   4. le volume caddy-data          (certificats + compte ACME ; le perdre
#      force une réémission et peut heurter le quota Let's Encrypt)
#
# Le transfert HORS HÔTE est la raison d'être du script : une sauvegarde qui
# ne vit que sur la machine sauvegardée ne protège de rien.
# =============================================================
set -euo pipefail

STACK_DIR="${STACK_DIR:-/opt/matimeline}"
COMPOSE_FILE="${COMPOSE_FILE:-$STACK_DIR/docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/matimeline}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
# Cible distante OCI Object Storage. Vide => transfert SAUTÉ, et le script le
# signale bruyamment plutôt que de laisser croire à une sauvegarde hors hôte.
OCI_BUCKET="${OCI_BUCKET:-}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$BACKUP_DIR/$TS"
mkdir -p "$WORK"

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

cleanup_on_error() {
  log "ÉCHEC — suppression de la sauvegarde partielle $WORK"
  rm -rf "$WORK"
}
trap cleanup_on_error ERR

# --- 1. Base de données ------------------------------------------------------
# Format custom (-Fc) : restauration sélective possible et compression intégrée.
log "pg_dump…"
DB_NAME="$(compose exec -T postgres printenv POSTGRES_DB | tr -d '\r')"
DB_USER="$(compose exec -T postgres printenv POSTGRES_USER | tr -d '\r')"
compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$WORK/db.dump"

# Un pg_dump qui échoue APRÈS avoir écrit l'en-tête laisse un fichier non vide
# mais tronqué. `pg_restore --list` est le seul contrôle qui le détecte.
log "vérification de l'intégrité du dump…"
compose exec -T postgres pg_restore --list /dev/stdin < "$WORK/db.dump" > /dev/null
log "dump valide ($(du -h "$WORK/db.dump" | cut -f1))"

# --- 2..4. Volumes -----------------------------------------------------------
# Passage par un conteneur jetable : les volumes nommés ne sont pas montés sur
# l'hôte, et fouiller /var/lib/docker/volumes à la main est fragile.
PROJECT="$(compose config --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')"
for vol in avatars-data exports-data caddy-data; do
  log "archivage du volume $vol…"
  docker run --rm \
    -v "${PROJECT}_${vol}:/src:ro" \
    -v "$WORK:/out" \
    alpine:3 tar czf "/out/$vol.tar.gz" -C /src .
done

# --- Empreintes --------------------------------------------------------------
( cd "$WORK" && sha256sum ./* > SHA256SUMS )
log "sauvegarde locale prête : $WORK"

# --- Transfert hors hôte -----------------------------------------------------
if [ -n "$OCI_BUCKET" ]; then
  log "envoi vers OCI Object Storage ($OCI_BUCKET)…"
  for f in "$WORK"/*; do
    oci os object put --bucket-name "$OCI_BUCKET" \
      --name "matimeline/$TS/$(basename "$f")" --file "$f" --force >/dev/null
  done
  log "transfert hors hôte terminé"
else
  log "AVERTISSEMENT : OCI_BUCKET non défini — AUCUN transfert hors hôte."
  log "  Cette sauvegarde ne survivrait pas à la perte de l'instance."
fi

# --- Rétention ---------------------------------------------------------------
trap - ERR
log "purge locale au-delà de $RETENTION_DAYS jours…"
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime "+$RETENTION_DAYS" \
  -exec rm -rf {} +

log "OK"
