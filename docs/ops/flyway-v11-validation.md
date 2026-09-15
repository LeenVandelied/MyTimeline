# Runbook — Validation Flyway V11 sur base prod réelle (issue #181)

> **Objectif** : vérifier, sur un dump/staging représentatif (avec historique
> Flyway 9), deux risques jamais testés hors base fraîche Testcontainers, AVANT
> de déployer la migration V11 en production.
>
> **Outil** : [`scripts/flyway-validate.sh`](../../scripts/flyway-validate.sh).
> Le script ne modifie **rien** de lui-même sans opt-in explicite.

---

## 1. Les deux risques

### Risque A — Checksum mismatch V1–V10 (Flyway 9 → 10)
L'upgrade Spring Boot 3.2→3.4 (issue #162) a fait passer Flyway de **9.22.3 à
10.20.1**. L'**algorithme de checksum a changé entre Flyway 9 et 10**. Sur une
base dont l'historique (`flyway_schema_history`) a été écrit par Flyway 9, un
`flyway validate` / `migrate` peut remonter un **checksum mismatch** sur V1–V10,
ce qui **avorte la migration**.

- **Détection** : `flyway validate` (rouge = mismatch) + `flyway info`.
- **Remédiation** : `flyway repair` réaligne les checksums de l'historique sur
  l'algorithme courant **sans rejouer** les migrations, PUIS relancer la validation.
  Ne **jamais** lancer `migrate` tant que `validate` est rouge.

### Risque B — Reclassification silencieuse par V11 (sans recalcul `end_date`)
`V11__events_conditional_check_constraints.sql` **neutralise défensivement** les
lignes incohérentes AVANT de poser ses 2 contraintes CHECK :

| Ligne legacy | Reclassement V11 | Effet de bord |
|---|---|---|
| `type='duration'` sans `duration_unit` | `type='single'` | `end_date` **non recalculée**, non tracée |
| `is_recurring=true` sans `recurrence_unit` | `is_recurring=false` | flag orphelin retiré, non tracé |

Sur base fraîche (Testcontainers) ces `UPDATE` sont des **no-op**. Sur données
réelles legacy, ils peuvent muter des lignes **silencieusement**. C'est
sémantiquement **irréversible** (l'unité manquante n'a jamais existé).

---

## 2. Pré-requis

- **Dump représentatif** de la prod, restauré sur une base jetable/staging,
  avec un **historique Flyway 9 réel** (`flyway_schema_history` non vide) et des
  **données non vides**. Un schéma fraîchement migré ne teste ni A ni B.
- **Flyway CLI 10.x** OU **Docker** (le script bascule sur `flyway/flyway:10-alpine`,
  aligné sur le projet). Pour la requête de diagnostic : `psql` OU Docker (`postgres:16`).
- **Ne jamais** cibler la prod live. Le script refuse toute URL non-locale sans
  `CONFIRM_PROD=yes` ; ce flag est réservé à un **dump/staging**.

---

## 3. Procédure pas-à-pas

```bash
# 1. Restaurer le dump sur une base jetable (exemple)
#    createdb eventmanager_v11check && pg_restore -d eventmanager_v11check dump.dump

# 2. Lancer la validation (base locale = pas de confirmation requise)
FLYWAY_URL=jdbc:postgresql://localhost:5432/eventmanager_v11check \
FLYWAY_USER=eventuser FLYWAY_PASSWORD=*** \
./scripts/flyway-validate.sh

# 2 bis. Base non-locale (staging) -> garde-fou : exige CONFIRM_PROD=yes
CONFIRM_PROD=yes \
FLYWAY_URL=jdbc:postgresql://staging-host:5432/eventmanager \
FLYWAY_USER=... FLYWAY_PASSWORD=*** \
./scripts/flyway-validate.sh
```

Le script enchaîne :
- **(a)** `flyway validate` + `flyway info` → détection checksum mismatch V1–V10.
  Si rouge : `flyway repair` puis relancer (cf. Risque A).
- **(b)** requête de diagnostic pré-V11 (§4) → affiche le count.
- **(c)** **gate** : si count > 0 → AVERTISSEMENT explicite + arrêt (`exit 2`)
  AVANT `migrate`.
- **(d)** si count = 0 : `migrate` proposé uniquement en opt-in `RUN_MIGRATE=1`.

```bash
# 3. (après un run vert, count=0) appliquer réellement la migration
RUN_MIGRATE=1 \
FLYWAY_URL=jdbc:postgresql://localhost:5432/eventmanager_v11check \
FLYWAY_USER=eventuser FLYWAY_PASSWORD=*** \
./scripts/flyway-validate.sh
```

---

## 4. Requête de diagnostic + tableau de décision

```sql
SELECT count(*) FROM events
WHERE (type='duration' AND duration_unit IS NULL)
   OR (is_recurring IS TRUE AND recurrence_unit IS NULL);
```

| Count | Décision |
|---|---|
| **0** | ✅ Aucune reclassification silencieuse. V11 est un no-op sur les données. Déploiement OK côté Risque B. |
| **> 0** | ⚠️ Décision **explicite à documenter** ci-dessous : soit **(1) accepter** la reclassification (perte sémantique jugée acceptable), soit **(2) exécuter un script de correction préalable** (recalcule/trace avant migration). |

### Squelette de script de correction préalable (option 2)
À exécuter **AVANT** `flyway migrate`, dans une transaction, sur le dump.
Il **trace** les lignes impactées et **recalcule** `end_date` plutôt que de
laisser V11 muter en silence.

```sql
BEGIN;

-- 4.1 Tracer les lignes impactées (audit avant toute mutation)
CREATE TABLE IF NOT EXISTS events_v11_reclass_audit (
    event_id        uuid,
    reason          text,
    old_type        text,
    old_is_recurring boolean,
    old_end_date    timestamptz,
    captured_at     timestamptz DEFAULT now()
);

INSERT INTO events_v11_reclass_audit (event_id, reason, old_type, old_is_recurring, old_end_date)
SELECT id,
       CASE WHEN type='duration' AND duration_unit IS NULL THEN 'duration_sans_unite'
            ELSE 'recurring_sans_unite' END,
       type, is_recurring, end_date
FROM events
WHERE (type='duration' AND duration_unit IS NULL)
   OR (is_recurring IS TRUE AND recurrence_unit IS NULL);

-- 4.2 Correction métier (à ADAPTER selon la règle retenue) :
--     ex. affecter une unité par défaut + recalculer end_date au lieu de
--     laisser V11 reclasser en 'single'. Décision produit requise.
-- UPDATE events SET duration_unit='days', end_date = start_date + interval '1 day'
-- WHERE type='duration' AND duration_unit IS NULL;

COMMIT;
```

> Après correction, relancer `scripts/flyway-validate.sh` : le count doit
> retomber à **0** avant d'autoriser `migrate`.

---

## 5. Résultat (à remplir par le dev/ops — critères d'acceptation issue #181)

> Ces cases exigent une exécution sur **données réelles** ; elles restent
> ouvertes tant qu'un dump n'a pas été passé dans le runbook.

- [ ] Dump prod représentatif (historique Flyway 9, données non vides) restauré.
- [ ] `flyway validate` exécuté → **aucun** checksum mismatch V1–V10
      (ou mismatch résolu via `flyway repair`, tracé ici : __________).
- [ ] Requête de diagnostic exécutée → count = ______.
- [ ] Si count > 0 : décision documentée → ☐ accepter reclassification
      ☐ script de correction préalable (lien/commit : __________).
- [ ] `flyway migrate` rejoué sur le dump → V12 tête, `flyway info` vert.
- [ ] Go/No-Go déploiement prod : __________ (date / responsable).
```
