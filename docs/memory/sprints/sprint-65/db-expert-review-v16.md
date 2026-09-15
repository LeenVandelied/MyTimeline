# Review db-expert — migration V16 (issue #452)

> Spawné par le lead sur `RECOMMAND_DB_EXPERT` de `issue-452-done.md`. Lecture seule.
> **Conséquence : la migration V16 a été RETIRÉE** (commit `61ca5d0`). Ce fichier est la trace
> de la décision — la migration n'existe plus dans l'arbre.

## Verdict

**[CRITIQUE]** `V16:62-64` — le `DELETE` détruit un état que l'application **recrée par design dès
le prochain `create`**. `recurrenceEndDate` restant hors du DTO de création (BR-EVE-012 inchangée,
décision produit du 2026-09-02), `recurrence_end_date IS NULL` est l'état **NORMAL** post-#452, pas
une donnée héritée. Purge sans effet durable ; aucune contrainte DB ne l'empêche de revenir.

**[CRITIQUE]** `V16:14-33` — justification factuellement caduque. L'expansion est calculée **à la
LECTURE** (`RecurrenceExpansionServiceImpl:48-51` — `unbounded = (recurrenceEndDate == null)` →
`startDate.plusYears(5)`), et aucune table d'occurrences n'est matérialisée (0 colonne `event_id`
sur V1..V16). Les lignes visées sont **déjà bornées à 5 ans** par #452, lignes préexistantes
comprises. L'en-tête affirmait que #452 « borne pour l'AVENIR » : faux, il borne aussi le passé.
Bénéfice fonctionnel du `DELETE` : **nul**.

**[MAJEUR]** `V16:12-14` — les lignes `archived = true` répondant au prédicat étaient supprimées
physiquement. `archived` (V7:106) est le tier soft-delete du projet (#44) et aucun `@SQLRestriction`
ne protège `EventEntity`. Contredit le standard « jamais de DELETE physique sur donnée métier ».

**[MINEUR]** `V16:46-60` — bloc `do $$ … raise notice` inutile : Flyway ne remonte pas les NOTICE
Postgres (SQLWarning JDBC non loggé), le message est invisible. Coût : un seq scan de plus.

**[MINEUR]** `V16:63` — aucun index sur `(is_recurring, recurrence_end_date)` → seq scan + lock
exclusif mono-batch. Sans risque sur une table vide, à revoir si volume réel.

## Ce qui était correct (vérifié indépendamment, à conserver comme acquis)

**[OK]** Prédicat exact. `is_recurring` (V1:50, nullable) + `recurrence_end_date` (V7:105) : noms
confirmés, mapping `EventEntity.java:41,47-48` cohérent. `is true` exclut `NULL`, aligné sur la
convention de V11 (`is_recurring is not true` = non récurrent). Bon choix de 3-valued logic.

**[OK]** Intégrité référentielle : **zéro** `event_id`, zéro `references events` sur V1..V15.
Seule FK = `fk_events_product` (V1:70), sens sortant. Aucun orphelin possible.

**[OK]** Nommage `V16__{desc}.sql`, numérotation séquentielle sans trou, V1..V15 non modifiées,
schéma inchangé donc `ddl-auto=validate` non impacté.

## Décision du dev (2026-09-02)

Sur présentation des deux `[CRITIQUE]`, le dev a tranché : **supprimer V16**, plutôt que la garder,
l'amender pour épargner les archivés, ou remplacer le `DELETE` par un `UPDATE` de bornage.
Motif retenu : une migration destructive et irréversible qui ne corrige rien n'a pas sa place.

`V16` reste le prochain numéro de migration libre (CLAUDE.md inchangé).
