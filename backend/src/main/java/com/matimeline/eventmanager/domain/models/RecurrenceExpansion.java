package com.matimeline.eventmanager.domain.models;

import java.time.LocalDate;
import java.util.List;

/**
 * Résultat borné de l'expansion d'une récurrence (#54).
 *
 * @param occurrences dates de début de chaque occurrence, {@code startDate} inclus, triées croissant.
 * @param capped {@code true} si la série a été TRONQUÉE — soit par le plafond d'occurrences
 *               ({@link RecurrenceExpansion#MAX_OCCURRENCES}), soit par l'horizon temporel
 *               ({@link RecurrenceExpansion#MAX_UNBOUNDED_EXPANSION_YEARS}) d'une récurrence sans
 *               {@code recurrenceEndDate}. Dans les deux cas la sémantique est la même du point de vue
 *               de l'appelant : « il existerait d'autres occurrences au-delà de ce que je te rends ».
 *
 * <p><b>ATTENTION — ce drapeau n'a AUCUN consommateur à ce jour.</b> Il n'est exposé par aucune
 * réponse d'API et {@code grep capped frontend/src} ne rend rien (vérifié au S65). Les issues
 * ouvertes #67 et #439 PRÉVOIENT de l'exposer sous forme de hint frontend, mais ce câblage
 * n'existe pas : ne pas lire cette javadoc comme la description d'un contrat en vigueur.
 * Le service qui produit ce record ({@code RecurrenceExpansionService}) est lui-même sans
 * appelant dans {@code src/main} — l'ensemble est un durcissement préventif, pas un chemin
 * exécuté en production. Toute évolution de la sémantique de {@code capped} devra être
 * re-validée AU MOMENT du câblage, pas supposée acquise ici.
 */
public record RecurrenceExpansion(List<LocalDate> occurrences, boolean capped) {

    /**
     * Plafond dur d'occurrences générées, borne de sécurité mémoire/CPU (#54).
     *
     * <p>Depuis #452 ce plafond ne borne plus QUE les séries à {@code recurrenceEndDate}
     * EXPLICITE (une borne lointaine posée par l'utilisateur, cf. BR-EVE-012) : les séries
     * indéfinies sont bornées en amont par {@link #MAX_UNBOUNDED_EXPANSION_YEARS}, bien plus tôt.
     * Il reste donc actif et nécessaire — il n'est PAS remplacé.
     */
    public static final int MAX_OCCURRENCES = 4000;

    /**
     * Horizon temporel d'une récurrence SANS {@code recurrenceEndDate} (#452).
     *
     * <p>Complète {@link #MAX_OCCURRENCES}, qui est exprimé en NOMBRE d'occurrences et non en
     * DURÉE : à 4000 occurrences, la portée temporelle explose avec la taille de l'unité —
     * hebdomadaire ~77 ans, mensuel ~333 ans, annuel 4000 ans. Un seul événement mensuel créé
     * sans date de fin étalait ainsi la frise sur plusieurs siècles.
     *
     * <p><b>Pourquoi 5 ans.</b> Une récurrence sans date de fin est une récurrence <i>indéfinie</i>
     * (réunion hebdomadaire, renouvellement annuel) : rien ne permet d'en déduire une portée, il
     * faut donc en choisir une. 5 ans couvre les horizons de planification réalistes d'une frise
     * produit tout en gardant la série la plus dense (hebdomadaire) à 261 occurrences, soit ~6,5 %
     * du garde-fou mémoire de 4000. Effet mesuré sur les séries indéfinies :
     * hebdomadaire 4000 occ/~77 ans → 261 occ/5 ans ; mensuel 4000/~333 ans → 61/5 ans ;
     * annuel 4000/4000 ans → 6/5 ans.
     *
     * <p>Un utilisateur qui a besoin d'aller au-delà pose une {@code recurrenceEndDate} explicite
     * (PATCH, BR-EVE-012) : cette borne est honorée telle quelle, jusqu'à {@link #MAX_OCCURRENCES}.
     * L'horizon ne rogne donc JAMAIS une intention explicite.
     */
    public static final int MAX_UNBOUNDED_EXPANSION_YEARS = 5;

    public int size() {
        return occurrences.size();
    }
}
