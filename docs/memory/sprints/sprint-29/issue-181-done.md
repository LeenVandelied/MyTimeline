# Issue #181 — Valider migration Flyway V11 sur base prod (outillage)

**Commit :** 705c4ef (l'agent a mal reporté 22b6284 — race sur HEAD avec #112 en parallèle ; SHA réel = 705c4ef, vérifié `git show --stat`)
**Scope livré :** TOOLING + RUNBOOK (arbitrage dev 2026-07-11). Rien exécuté contre une vraie base.

## Livrable
- `scripts/flyway-validate.sh` (exécutable, shellcheck clean) : (a) `flyway validate`+`info` → détecte checksum mismatch V1–V10 (remédiation `flyway repair`) ; (b) requête diagnostic pré-V11 (psql sinon Docker `postgres:16`) ; (c) **GATE** count>0 → AVERTISSEMENT + `exit 2` avant tout `migrate` ; (d) `migrate` opt-in via `RUN_MIGRATE=1` uniquement si count=0. Runner CLI sinon Docker `flyway/flyway:10-alpine`. Garde-fou : URL non-locale refusée sans `CONFIRM_PROD=yes`.
- `docs/ops/flyway-v11-validation.md` : 2 risques (checksum Flyway 9→10 ; reclassification silencieuse V11 sans recalcul `end_date`), procédure, tableau de décision, squelette SQL de correction préalable, section « Résultat » = checklist critères d'acceptation.

## Reste ouvert (dev/ops, nécessite accès DB)
- `validate` + count diagnostic + `migrate` sur dump prod avec historique Flyway 9 → cases ouvertes §5 runbook.

## Recommandations suite
- RECOMMAND_FOLLOWUP : si `count>0` sur dump réel → script de correction préalable (recalcul/trace `end_date`) à finaliser avec décision produit (squelette fourni §4).

## STATUS
COMPLETED
