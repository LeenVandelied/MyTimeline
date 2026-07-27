#!/usr/bin/env bash
# coverage-e2e-check.sh — Phase 8 du /sprint : testids ajoutés par le sprint sans spec E2E.
#
# Remplace l'heuristique inline du SKILL, cassée de deux façons (constaté S46, PR #324) :
#   1. `for tid in $NEW_TESTIDS` fait du word-splitting sur une liste multi-lignes ET
#      sur les testids contenant des espaces -> faux positifs en cascade.
#   2. Elle ne grep que `frontend/e2e/`, en ratant les testids déclarés dans un fichier
#      de support, et ne distingue pas un testid *ajouté* d'un testid *déplacé*.
#
# Ici : lecture NUL-safe, dédup, et exclusion des testids qui étaient déjà présents sur
# la base de comparaison (déplacement != ajout).
#
# Usage : bash coverage-e2e-check.sh [base-ref]   (défaut : origin/dev)

set -uo pipefail

BASE="${1:-origin/dev}"
cd "$(git rev-parse --show-toplevel)" || exit 2

# Testids présents sur HEAD dans les .tsx, et absents de la base -> réellement ajoutés.
mapfile -t ADDED < <(
  comm -13 \
    <(git grep -hoE 'data-testid="[^"]+"' "$BASE" -- '*.tsx' 2>/dev/null \
        | sed 's/^data-testid="//; s/"$//' | sort -u) \
    <(git grep -hoE 'data-testid="[^"]+"' HEAD -- '*.tsx' 2>/dev/null \
        | sed 's/^data-testid="//; s/"$//' | sort -u)
)

if [ "${#ADDED[@]}" -eq 0 ]; then
  echo "[COVERAGE-E2E] Aucun testid ajouté par rapport à $BASE — rien à couvrir."
  exit 0
fi

MISSING=()
for tid in "${ADDED[@]}"; do
  [ -z "$tid" ] && continue
  # -F : le testid est une chaîne littérale, pas une regex (les '.' et '-' abondent).
  if ! git grep -qF -- "$tid" HEAD -- 'frontend/e2e/' 2>/dev/null; then
    MISSING+=("$tid")
  fi
done

echo "[COVERAGE-E2E] testids ajoutés depuis $BASE : ${#ADDED[@]} | sans spec : ${#MISSING[@]}"
if [ "${#MISSING[@]}" -gt 0 ]; then
  printf '  [SANS SPEC] %s\n' "${MISSING[@]}"
  echo "[COVERAGE-E2E] MAJEUR — documenter l'écart dans le body de PR, ou couvrir avant merge."
  exit 1
fi
echo "[COVERAGE-E2E] OK — chaque testid ajouté est référencé par au moins une spec."
