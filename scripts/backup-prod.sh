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
#   4. le volume caddy-data          (certificats + compte ACME)
#
# ⚠ Ce script opère via `docker` DIRECTEMENT (conteneurs repérés par leur label
# de projet, volumes par leur nom), et JAMAIS via `docker compose`. Raison
# apprise à l'usage : le fichier compose de prod exige `IMAGE_TAG` et les secrets
# (`${VAR:?}`), qu'une session de cron n'a aucune raison d'avoir en environnement.
# Une sauvegarde ne doit dépendre ni du tag d'image déployé ni des secrets — elle
# doit marcher tant que les conteneurs TOURNENT, un point c'est tout.
#
# Le transfert HORS HÔTE est la raison d'être du script : une sauvegarde qui ne
# vit que sur la machine sauvegardée ne protège d'aucun des scénarios réalistes.
# =============================================================
set -euo pipefail

PROJECT="${COMPOSE_PROJECT:-matimeline}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/matimeline}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
# Cible distante OCI Object Storage. Vide => transfert SAUTÉ, et le script le
# signale bruyamment plutôt que de laisser croire à une sauvegarde hors hôte.
OCI_BUCKET="${OCI_BUCKET:-}"
# Mode d'authentification OCI CLI. En prod : instance_principal (aucun secret sur
# la machine ; l'instance s'authentifie par son identité via le groupe dynamique
# matimeline-backup-dg + la policy matimeline-backup-policy). Vide => auth par
# fichier ~/.oci (utile pour un test depuis un poste déjà configuré).
OCI_CLI_AUTH_MODE="${OCI_CLI_AUTH_MODE:-instance_principal}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$BACKUP_DIR/$TS"
mkdir -p "$WORK"

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }

cleanup_on_error() {
  log "ÉCHEC — suppression de la sauvegarde partielle $WORK"
  rm -rf "$WORK"
}
trap cleanup_on_error ERR

# Conteneur d'un service du projet, repéré par ses labels Compose (indépendant
# du tag d'image et du nom exact du conteneur).
container_of() {
  local svc="$1" id
  id="$(docker ps -q \
    --filter "label=com.docker.compose.project=$PROJECT" \
    --filter "label=com.docker.compose.service=$svc")"
  [ -n "$id" ] || { log "ERREUR : conteneur du service '$svc' introuvable (projet $PROJECT)"; return 1; }
  printf '%s' "$id"
}

# --- 1. Base de données ------------------------------------------------------
# Format custom (-Fc) : restauration sélective possible et compression intégrée.
log "pg_dump…"
PG="$(container_of postgres)"
DB_NAME="$(docker exec "$PG" printenv POSTGRES_DB | tr -d '\r')"
DB_USER="$(docker exec "$PG" printenv POSTGRES_USER | tr -d '\r')"
docker exec "$PG" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$WORK/db.dump"

# Un pg_dump qui échoue APRÈS avoir écrit l'en-tête laisse un fichier non vide
# mais tronqué. `pg_restore --list` le détecte — mais le format custom (-Fc) exige
# un fichier SEEKABLE : le vérifier via `/dev/stdin` (un pipe) échoue sur
# « did not find magic string ». On réinjecte donc le dump dans un fichier temp
# du conteneur, on le liste, puis on nettoie — code retour propagé.
log "vérification de l'intégrité du dump…"
docker exec -i "$PG" sh -c \
  'cat > /tmp/_verify.dump && pg_restore --list /tmp/_verify.dump > /dev/null; rc=$?; rm -f /tmp/_verify.dump; exit $rc' \
  < "$WORK/db.dump"
log "dump valide ($(du -h "$WORK/db.dump" | cut -f1))"

# --- 2..4. Volumes -----------------------------------------------------------
# Passage par un conteneur jetable : les volumes nommés ne sont pas montés sur
# l'hôte, et fouiller /var/lib/docker/volumes à la main est fragile.
for vol in avatars-data exports-data caddy-data; do
  full="${PROJECT}_${vol}"
  if ! docker volume inspect "$full" >/dev/null 2>&1; then
    log "ERREUR : volume '$full' introuvable"; exit 1
  fi
  log "archivage du volume $vol…"
  docker run --rm -v "$full:/src:ro" -v "$WORK:/out" alpine:3 \
    tar czf "/out/$vol.tar.gz" -C /src .
done

# --- Empreintes --------------------------------------------------------------
( cd "$WORK" && sha256sum ./* > SHA256SUMS )
log "sauvegarde locale prête : $WORK ($(du -sh "$WORK" | cut -f1))"

# --- Transfert hors hôte -----------------------------------------------------
if [ -n "$OCI_BUCKET" ]; then
  command -v oci >/dev/null || { log "ERREUR : OCI_BUCKET défini mais l'outil 'oci' est absent"; exit 1; }
  AUTH_OPT=()
  [ -n "$OCI_CLI_AUTH_MODE" ] && AUTH_OPT=(--auth "$OCI_CLI_AUTH_MODE")
  log "envoi vers OCI Object Storage ($OCI_BUCKET, auth=${OCI_CLI_AUTH_MODE:-config})…"
  for f in "$WORK"/*; do
    oci os object put "${AUTH_OPT[@]}" --bucket-name "$OCI_BUCKET" \
      --name "matimeline/$TS/$(basename "$f")" --file "$f" --force >/dev/null
  done
  # Un transfert « sans erreur » ne prouve pas la présence : on RELIT la liste
  # distante du préfixe et on exige autant d'objets que ceux envoyés.
  sent=$(find "$WORK" -maxdepth 1 -type f | wc -l | tr -d ' ')
  got=$(oci os object list "${AUTH_OPT[@]}" --bucket-name "$OCI_BUCKET" \
    --prefix "matimeline/$TS/" --query 'length(data)' --raw-output 2>/dev/null || echo 0)
  [ "$got" = "$sent" ] || { log "ERREUR : $got objets distants pour $sent envoyés"; exit 1; }
  log "transfert hors hôte vérifié ($got objets sous matimeline/$TS/)"
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
