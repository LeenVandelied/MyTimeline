package com.matimeline.eventmanager.domain.models.export;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;

/**
 * Snapshot IMMUTABLE et LEAK-PROOF des données personnelles d'un utilisateur (#58, RGPD
 * Art. 20). Structure de sérialisation unique consommée par tous les renderers (JSON, MD,
 * CSV, ZIP) — la forme du fichier exporté dérive de ces records, jamais des domain models
 * bruts (qui portent des champs à ne PAS exposer, ex. {@code User.password}).
 *
 * <p>Domaine PUR (aucun framework). L'assemblage passe par {@link #assemble} qui recopie
 * CHAMP PAR CHAMP les seules données de portabilité :
 * <ul>
 *   <li>profil : id, username, name, email, role — <b>JAMAIS le password hash</b>
 *       (BR-AUT-002) ni les octets d'avatar (seul {@code avatarPresent} est noté) ;</li>
 *   <li>produits (actifs) + leurs événements imbriqués ;</li>
 *   <li>catégories possédées.</li>
 * </ul>
 * Passer par des records dédiés (et non {@code @JsonIgnore} sur l'entité) garantit qu'aucun
 * ajout futur de champ sensible au domaine ne fuite par réflexion.
 */
public record UserDataExport(
        ExportedProfile profile,
        List<ExportedCategory> categories,
        List<ExportedProduct> products,
        LocalDateTime generatedAt) {

    /** Profil utilisateur SANS secret (pas de password, pas d'octets d'avatar). */
    public record ExportedProfile(
            UUID id,
            String username,
            String name,
            String email,
            String role,
            boolean avatarPresent) {
    }

    /** Catégorie possédée par l'utilisateur. */
    public record ExportedCategory(
            UUID id,
            String name,
            String color,
            String description) {
    }

    /** Produit (avec sa catégorie réduite à {id,name}) et ses événements imbriqués. */
    public record ExportedProduct(
            UUID id,
            String name,
            String color,
            UUID categoryId,
            String categoryName,
            List<ExportedEvent> events) {
    }

    /** Événement rattaché à un produit. */
    public record ExportedEvent(
            UUID id,
            String title,
            String type,
            Integer durationValue,
            String durationUnit,
            Boolean isRecurring,
            String recurrenceUnit,
            LocalDate recurrenceEndDate,
            LocalDate startDate,
            LocalDate endDate,
            Boolean isAllDay,
            String color) {
    }

    /**
     * Assemble le snapshot depuis les modèles domaine. Recopie explicite (anti-fuite) :
     * seul un sous-ensemble validé des champs est repris ; {@code user.getPassword()} n'est
     * jamais lu.
     *
     * @param user       profil du propriétaire (non {@code null})
     * @param products   produits du user, événements pré-chargés
     * @param categories catégories POSSÉDÉES par le user (système déjà exclues en amont)
     * @param generatedAt horodatage de génération (Clock injecté côté service)
     */
    public static UserDataExport assemble(User user, List<Product> products,
                                          List<Category> categories, LocalDateTime generatedAt) {
        ExportedProfile profile = new ExportedProfile(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getAvatar() != null && !user.getAvatar().isBlank());

        List<ExportedCategory> exportedCategories = categories.stream()
                .map(c -> new ExportedCategory(c.getId(), c.getName(), c.getColor(), c.getDescription()))
                .toList();

        List<ExportedProduct> exportedProducts = products.stream()
                .map(UserDataExport::toExportedProduct)
                .toList();

        return new UserDataExport(profile, exportedCategories, exportedProducts, generatedAt);
    }

    private static ExportedProduct toExportedProduct(Product product) {
        Category category = product.getCategory();
        List<ExportedEvent> events = product.getEvents() == null
                ? List.of()
                : product.getEvents().stream().map(UserDataExport::toExportedEvent).toList();
        return new ExportedProduct(
                product.getId(),
                product.getName(),
                product.getColor(),
                category != null ? category.getId() : null,
                category != null ? category.getName() : null,
                events);
    }

    private static ExportedEvent toExportedEvent(Event event) {
        return new ExportedEvent(
                event.getId(),
                event.getTitle(),
                event.getType(),
                event.getDurationValue(),
                event.getDurationUnit(),
                event.getIsRecurring(),
                event.getRecurrenceUnit() != null ? event.getRecurrenceUnit().name() : null,
                event.getRecurrenceEndDate(),
                event.getStartDate(),
                event.getEndDate(),
                event.getIsAllDay(),
                event.getColor());
    }
}
