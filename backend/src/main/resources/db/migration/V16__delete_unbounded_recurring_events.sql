-- =============================================================
-- V16__delete_unbounded_recurring_events.sql — Purge des événements récurrents
-- SANS date de fin de récurrence (issue #452, BR-EVE-012)
--
-- CE QUI EST SUPPRIMÉ
--   Les lignes de `events` telles que `is_recurring IS TRUE` ET
--   `recurrence_end_date IS NULL`. Rien d'autre : aucune autre table n'est
--   touchée, aucune colonne n'est ajoutée/modifiée/supprimée, aucun DROP,
--   aucun TRUNCATE, et le DELETE porte toujours une clause WHERE.
--   Les événements NON récurrents (`is_recurring` false ou NULL) et les
--   récurrents PORTANT une `recurrence_end_date` ne sont pas concernés.
--   Les lignes archivées (`archived = true`) répondant au prédicat SONT
--   supprimées elles aussi : réactivées, elles produiraient exactement la
--   série non bornée que cette migration élimine.
--
-- POURQUOI
--   Avant #452, l'expansion d'une récurrence n'était bornée qu'en NOMBRE
--   d'occurrences (RecurrenceExpansion.MAX_OCCURRENCES = 4000), jamais en
--   DURÉE. Une série mensuelle sans date de fin couvrait donc ~333 ans
--   (4000 / 12), une série annuelle 4000 ans : un seul événement étalait la
--   frise sur des siècles et dégradait l'affichage de tout le compte.
--   #452 pose un horizon temporel côté applicatif
--   (RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS), qui borne le calcul
--   pour l'AVENIR. Les lignes déjà en base restent des séries indéfinies dont
--   l'intention utilisateur est inconnue (durée voulue ? oubli du champ, absent
--   du formulaire de création ?) : plutôt que de leur inventer une date de fin,
--   la décision produit du 2026-09-02 est de les supprimer. Il n'existe à ce
--   jour aucune donnée réelle en base.
--
-- IRRÉVERSIBLE
--   Cette migration DÉTRUIT des lignes. Il n'existe AUCUN rollback : les
--   valeurs supprimées ne sont ni copiées ni archivées ailleurs. Un retour
--   arrière suppose une restauration de sauvegarde de la base. Ne pas la
--   rejouer sur une base porteuse de données réelles sans sauvegarde préalable.
--
-- INTÉGRITÉ RÉFÉRENTIELLE
--   Aucune table enfant ne référence `events` (vérifié : aucune colonne
--   `event_id` dans V1..V15). Le DELETE est donc mono-table et ne laisse
--   aucun orphelin. `events` référence `products` (fk_events_product), sens
--   inverse : les produits ne sont pas affectés.
--
-- ddl-auto=validate : migration de DONNÉES uniquement, schéma strictement
-- inchangé. Aucun impact sur le mapping JPA de EventEntity.
--
-- IDEMPOTENTE : rejouée sur une base déjà purgée, le DELETE ne touche rien.
--
-- NE PAS éditer V1..V15 (déjà appliquées).
-- =============================================================

do $$
declare
    v_targets bigint;
begin
    select count(*) into v_targets
    from events
    where is_recurring is true
      and recurrence_end_date is null;

    raise notice 'V16 (#452) : % evenement(s) recurrent(s) sans recurrence_end_date vont etre SUPPRIMES (irreversible).', v_targets;
end $$;

delete from events
where is_recurring is true
  and recurrence_end_date is null;

-- ROLLBACK : AUCUN. Suppression définitive de lignes, restauration de
-- sauvegarde uniquement (cf. section IRRÉVERSIBLE ci-dessus).
