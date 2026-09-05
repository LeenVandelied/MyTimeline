#!/usr/bin/env bash
# check-rules-jit-drift.sh — détecte la dérive des copies Layer B de rules-jit/
# vis-à-vis de leur source amont dans le plugin ai-env (Layer A).
#
# POURQUOI. `.ai-env/rules-jit/{backend,frontend}.md` sont des COPIES figées d'une
# version du plugin (les symlinks vers `~/.claude/plugins/cache/` ne sont pas
# committables : chemin absolu, hors dépôt, versionné). Au bump du plugin, la source
# évolue et la copie ne bouge pas — dérive parfaitement silencieuse, exactement la
# classe de défaut que la PR #420 corrige par ailleurs.
#
# Usage :
#   bash .ai-env/tools/check-rules-jit-drift.sh
#     exit 0 = à jour, OU plugin introuvable (cas CI : SKIP explicite, non bloquant)
#     exit 1 = dérive détectée
#     exit 2 = manifeste absent/illisible
#
# En CI le cache plugin n'existe pas : le contrôle SKIP en l'annonçant. Il n'a de
# valeur que sur un poste de dev — à lancer en fin de sprint et après tout bump.
#
# Après un bump volontaire : recopier les sources (en conservant l'en-tête de
# provenance) puis régénérer le manifeste avec --update.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="${ROOT}/.ai-env/rules-jit/.provenance.tsv"
MODE="${1:-check}"

[ -f "$MANIFEST" ] || { echo "[rules-jit-drift] manifeste introuvable : $MANIFEST" >&2; exit 2; }

PLUGIN_VERSION=$(awk -F'\t' '!/^#/ && NF>=3 { print $2; exit }' "$MANIFEST")
[ -n "$PLUGIN_VERSION" ] || { echo "[rules-jit-drift] manifeste illisible" >&2; exit 2; }

# Localiser la source amont. CLAUDE_PLUGIN_ROOT si défini, sinon le cache.
SRC_DIR=""
for c in "${CLAUDE_PLUGIN_ROOT:-}/rules-jit" \
         "$HOME/.claude/plugins/cache"/*/ai-env/"$PLUGIN_VERSION"/rules-jit; do
  [ -n "$c" ] && [ -d "$c" ] && { SRC_DIR="$c"; break; }
done

if [ -z "$SRC_DIR" ]; then
  echo "[rules-jit-drift] SKIP : plugin ai-env $PLUGIN_VERSION introuvable sur cette machine."
  echo "                 (attendu en CI — ce contrôle n'a de sens que sur un poste de dev)"
  exit 0
fi

if [ "$MODE" = "--update" ]; then
  TMP="${MANIFEST}.new"
  {
    awk '/^#/' "$MANIFEST"
    awk -F'\t' -v d="$SRC_DIR" '!/^#/ && NF>=3 { print $1 }' "$MANIFEST" | while IFS= read -r f; do
      printf '%s\t%s\t%s\n' "$f" "$PLUGIN_VERSION" "$(shasum -a 256 "${SRC_DIR}/${f}" | cut -d' ' -f1)"
    done
  } > "$TMP" && mv "$TMP" "$MANIFEST"
  echo "[rules-jit-drift] manifeste régénéré depuis $SRC_DIR"
  exit 0
fi

RC=0
while IFS=$'\t' read -r f ver want; do
  case "$f" in ''|'#'*) continue ;; esac
  src="${SRC_DIR}/${f}"
  if [ ! -f "$src" ]; then
    echo "[rules-jit-drift] DISPARU en amont : rules-jit/${f} (plugin ${ver})" >&2
    RC=1; continue
  fi
  got=$(shasum -a 256 "$src" | cut -d' ' -f1)
  if [ "$got" != "$want" ]; then
    echo "[rules-jit-drift] DÉRIVE : rules-jit/${f} a changé en amont depuis la copie (plugin ${ver})" >&2
    echo "                  attendu ${want}" >&2
    echo "                  amont   ${got}" >&2
    echo "                  diff : diff <(tail -n +6 .ai-env/rules-jit/${f}) ${src}" >&2
    RC=1
  fi
done < "$MANIFEST"

if [ "$RC" -eq 0 ]; then
  echo "[rules-jit-drift] OK : copies alignées sur le plugin $PLUGIN_VERSION"
else
  echo "" >&2
  echo "Résolution : recopier la source en conservant l'en-tête de provenance (4 lignes)," >&2
  echo "puis  bash .ai-env/tools/check-rules-jit-drift.sh --update" >&2
fi
exit "$RC"
