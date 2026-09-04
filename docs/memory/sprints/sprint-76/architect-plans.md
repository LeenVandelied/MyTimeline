# Mini-plans architect — Sprint 76

> Généré par /sprint plan (architect, 2e vague S74-S77). Lu par /sprint start Phase 4.1.
> Type : UX/hardening. Cohésion 0.33 ⚠ (3 fixes robustesse hétérogènes). Toutes XS → pas de bloc YAML.

# #237 (XS) — Filtrer refetchQueries du retry bannière réseau
#   `NetworkStatusContext.tsx:82` = queryClient.refetchQueries() sans predicate → ne refetch que les queries en erreur.
# #310 (XS) — Garde anti-boucle retry « garder mes modifications » (409)
#   ⚠ Fichier de la modale conflit 409 (réf #231/#306) NON localisé sous components/events/ → domain-researcher doit le localiser AVANT estimation ferme (risque dérapage XS→S si onKeepMine diffus). "à déterminer par fullstack-dev".
# #175 (XS) — EventServiceImpl.deleteById double-hit DB
#   `EventServiceImpl.java:238-241` = existsById() puis deleteById(). Supprimer le double-hit EN PRÉSERVANT le contrat 404.
