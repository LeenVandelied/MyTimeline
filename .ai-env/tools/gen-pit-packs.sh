#!/usr/bin/env bash
# gen-pit-packs.sh — génère .ai-env/context-packs/pit-backend.md et pit-frontend.md
# à partir de docs/memory/pitfalls.md (source de vérité) + pit-classification.tsv.
#
# Pourquoi : inject-pack.sh (Layer A) émet systématiquement `pit-<stack>.md` dans
# chaque briefing de sous-agent. Sans ces deux packs, les pitfalls consignés en fin
# de sprint n'atteignent JAMAIS les sous-agents (échec silencieux : simple [WARN]
# sur stderr, jamais lu).
#
# Usage :
#   bash .ai-env/tools/gen-pit-packs.sh          # écrit les packs
#   bash .ai-env/tools/gen-pit-packs.sh --check  # échoue (exit 1) si les packs sont périmés
#
# À relancer en fin de sprint, après consolidation de docs/memory/pitfalls.md.
# Toute entrée absente de la table de classification part en `tooling` (donc dans
# LES DEUX packs) et est signalée sur stderr : jamais de perte silencieuse.
#
# BORNE DE TAILLE — pourquoi le pack n'est pas le fichier entier.
# pitfalls.md compte 183 entrées / 133 Ko ; les entrées post-S49 font ~10 lignes
# (l'en-tête « 4 lignes max » du fichier n'est plus tenu). Verbatim intégral =
# ~70 Ko (backend) et ~96 Ko (frontend) injectés dans CHAQUE briefing. Donc :
#   - verbatim   : sprints >= VERBATIM_FROM_SPRINT + les récurrents listés ci-dessous
#   - index seul : le reste (titre uniquement — le titre EST la règle, en 1 ligne)
# Le pack reste ainsi proportionné aux cp-*/br-* (8-24 Ko) qui l'accompagnent.

set -uo pipefail

# Fenêtre verbatim : entrées PIT-S<N>-* avec N >= ce seuil.
# S53 = 6 derniers sprints. Calibré pour que le pack reste du même ordre de grandeur
# que br-events.md (24 Ko) : S49 -> 52 Ko côté frontend (pit noierait les cp-*/br-*),
# S53 -> 37 Ko. Remonter le seuil quand les sprints s'accumulent.
VERBATIM_FROM_SPRINT="${VERBATIM_FROM_SPRINT:-53}"

# Récurrents : pièges qui ont re-mordu sur plusieurs sprints hors fenêtre, gardés
# verbatim quel que soit leur âge (chacun a une récidive documentée dans pitfalls.md).
RECURRENT_IDS="
PIT-S16-002
PIT-S19-001
PIT-S21-001
PIT-S22-003
PIT-S24-002
PIT-S27-003
PIT-S20-003
PIT-S27-002
PIT-S22-001
PIT-S41-005
PIT-S12-003
PIT-S45-003
"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="${ROOT}/docs/memory/pitfalls.md"
TABLE="${ROOT}/.ai-env/tools/pit-classification.tsv"
OUT_DIR="${ROOT}/.ai-env/context-packs"

MODE="${1:-write}"

[ -f "$SRC" ]   || { echo "[gen-pit-packs] source introuvable : $SRC" >&2; exit 2; }
[ -f "$TABLE" ] || { echo "[gen-pit-packs] table introuvable : $TABLE" >&2; exit 2; }

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# --- Découpe pitfalls.md en une section par PIT-ID ---------------------------
# Une section = de sa ligne `## PIT-...` (incluse) à la ligne précédant le `## ` suivant.
# `close(cur)` au changement d'entree : les sections sont contigues, donc 2 descripteurs
# ouverts au plus. Sans lui, awk garde 183 fichiers ouverts et bute sur FOPEN_MAX selon
# l'implementation (BWK awk / mawk / gawk n'ont pas la meme limite) -> portabilite.
awk -v dir="$TMP_DIR" '
  /^## / {
    id = ""
    if (match($0, /PIT-S[0-9]+-[0-9]+/)) id = substr($0, RSTART, RLENGTH)
    if (cur != "") { close(cur); cur = "" }
    if (id == "") next
    cur = dir "/" id
    order = order id "\n"
    print > cur
    next
  }
  cur != "" { print > cur }
  END { if (cur != "") close(cur); printf "%s", order > (dir "/.order") }
' "$SRC"

[ -s "$TMP_DIR/.order" ] || { echo "[gen-pit-packs] aucune entrée PIT trouvée dans $SRC" >&2; exit 2; }

# --- Classification ----------------------------------------------------------
cat_of() {
  local id="$1" c
  c=$(awk -F'\t' -v id="$id" '$1 == id { print $2; exit }' "$TABLE")
  printf '%s' "${c:-}"
}

UNCLASSIFIED=""
COUNT_B=0; COUNT_F=0

is_verbatim() {
  local id="$1" sprint
  case " $(echo "$RECURRENT_IDS" | tr '\n' ' ') " in *" $id "*) return 0 ;; esac
  sprint=$(printf '%s' "$id" | sed -E 's/^PIT-S([0-9]+)-.*/\1/')
  [ "$sprint" -ge "$VERBATIM_FROM_SPRINT" ] 2>/dev/null
}

emit_pack() {
  local stack="$1" out="$2" nv=0 ni=0
  {
    echo "# Pitfalls — stack \`${stack}\` (MyTimeline)"
    echo ""
    echo "> **GÉNÉRÉ — ne pas éditer à la main.**"
    echo "> Source : \`docs/memory/pitfalls.md\` · Table : \`.ai-env/tools/pit-classification.tsv\`"
    echo "> Régénérer : \`bash .ai-env/tools/gen-pit-packs.sh\` (fin de sprint, après consolidation)."
    echo ">"
    echo "> Entrées classées \`${stack}\`, \`both\` ou \`tooling\`. Les \`tooling\` (worktree, RTK,"
    echo "> CI, environnement) figurent dans les DEUX packs : elles piègent les sous-agents"
    echo "> quelle que soit leur stack."
    echo ">"
    echo "> **§1 = texte intégral** (sprints ≥ S${VERBATIM_FROM_SPRINT} + récurrents). **§2 = index de titres** ;"
    echo "> le titre énonce la règle — si une entrée de §2 touche ton issue, lire le détail"
    echo "> dans \`docs/memory/pitfalls.md\` AVANT de coder."
    echo ""
    echo "---"
    echo ""
    echo "## §1 — Actifs (texte intégral)"
    echo ""
    while IFS= read -r id; do
      [ -z "$id" ] && continue
      local c; c=$(cat_of "$id")
      case "$c" in "$stack"|both|tooling|"") : ;; *) continue ;; esac
      is_verbatim "$id" || continue
      cat "${TMP_DIR}/${id}"
      echo ""
      nv=$((nv + 1))
    done < "$TMP_DIR/.order"

    echo "---"
    echo ""
    echo "## §2 — Index historique (titre = règle ; détail dans docs/memory/pitfalls.md)"
    echo ""
    while IFS= read -r id; do
      [ -z "$id" ] && continue
      local c; c=$(cat_of "$id")
      case "$c" in "$stack"|both|tooling|"") : ;; *) continue ;; esac
      is_verbatim "$id" && continue
      echo "- $(head -1 "${TMP_DIR}/${id}" | sed -E 's/^## //')"
      ni=$((ni + 1))
    done < "$TMP_DIR/.order"
    echo ""
  } > "$out"
  printf '%s/%s' "$nv" "$ni"
}

# Repérage des non-classés (avant génération, pour le rapport).
while IFS= read -r id; do
  [ -z "$id" ] && continue
  [ -z "$(cat_of "$id")" ] && UNCLASSIFIED="${UNCLASSIFIED}${id} "
done < "$TMP_DIR/.order"

GEN_DIR="$TMP_DIR/out"; mkdir -p "$GEN_DIR"
COUNT_B=$(emit_pack backend  "${GEN_DIR}/pit-backend.md")
COUNT_F=$(emit_pack frontend "${GEN_DIR}/pit-frontend.md")

if [ -n "$UNCLASSIFIED" ]; then
  echo "[gen-pit-packs] AVERTISSEMENT : entrées non classées (parties dans LES DEUX packs) :" >&2
  echo "                ${UNCLASSIFIED}" >&2
  echo "                Compléter .ai-env/tools/pit-classification.tsv." >&2
fi

# --- Écriture ou vérification ------------------------------------------------
if [ "$MODE" = "--check" ]; then
  rc=0
  for f in pit-backend.md pit-frontend.md; do
    if ! cmp -s "${GEN_DIR}/${f}" "${OUT_DIR}/${f}"; then
      echo "[gen-pit-packs] PÉRIMÉ : ${OUT_DIR}/${f} diffère de la génération courante" >&2
      rc=1
    fi
  done
  [ "$rc" -eq 0 ] && echo "[gen-pit-packs] OK : packs à jour"
  exit "$rc"
fi

mkdir -p "$OUT_DIR"
cp "${GEN_DIR}/pit-backend.md"  "${OUT_DIR}/pit-backend.md"
cp "${GEN_DIR}/pit-frontend.md" "${OUT_DIR}/pit-frontend.md"

echo "[gen-pit-packs] OK : pit-backend.md (§1+§2 = $COUNT_B, $(wc -c < "${OUT_DIR}/pit-backend.md" | tr -d ' ') o) · pit-frontend.md (§1+§2 = $COUNT_F, $(wc -c < "${OUT_DIR}/pit-frontend.md" | tr -d ' ') o)"
