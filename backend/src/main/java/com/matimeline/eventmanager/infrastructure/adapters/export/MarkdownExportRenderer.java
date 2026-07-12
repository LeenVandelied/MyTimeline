package com.matimeline.eventmanager.infrastructure.adapters.export;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport.ExportedCategory;
import com.matimeline.eventmanager.domain.models.export.UserDataExport.ExportedEvent;
import com.matimeline.eventmanager.domain.models.export.UserDataExport.ExportedProduct;
import com.matimeline.eventmanager.domain.ports.services.ExportRenderer;

/**
 * Rendu Markdown lisible de l'export RGPD (#58). Document structuré (profil, catégories,
 * produits avec événements imbriqués). Construction de chaîne pure — aucune bibliothèque.
 */
@Component
public class MarkdownExportRenderer implements ExportRenderer {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @Override
    public boolean supports(ExportFormat format) {
        return format == ExportFormat.MARKDOWN;
    }

    @Override
    public RenderedExport render(UserDataExport data) {
        StringBuilder md = new StringBuilder();
        md.append("# Export MyTimeline\n\n");
        md.append("Généré le : ").append(ISO.format(data.generatedAt())).append("\n\n");

        appendProfile(md, data.profile());
        appendCategories(md, data);
        appendProducts(md, data);

        byte[] content = md.toString().getBytes(StandardCharsets.UTF_8);
        return new RenderedExport(content, ExportFormat.MARKDOWN.contentType(),
                ExportFilenames.forFormat(ExportFormat.MARKDOWN, data.generatedAt()));
    }

    private void appendProfile(StringBuilder md, UserDataExport.ExportedProfile p) {
        md.append("## Profil\n\n");
        md.append("- **Identifiant** : ").append(p.id()).append("\n");
        md.append("- **Nom d'utilisateur** : ").append(nz(p.username())).append("\n");
        md.append("- **Nom** : ").append(nz(p.name())).append("\n");
        md.append("- **Email** : ").append(nz(p.email())).append("\n");
        md.append("- **Rôle** : ").append(nz(p.role())).append("\n");
        md.append("- **Avatar** : ").append(p.avatarPresent() ? "présent" : "aucun").append("\n\n");
    }

    private void appendCategories(StringBuilder md, UserDataExport data) {
        md.append("## Catégories (").append(data.categories().size()).append(")\n\n");
        if (data.categories().isEmpty()) {
            md.append("_Aucune catégorie._\n\n");
            return;
        }
        for (ExportedCategory c : data.categories()) {
            md.append("- **").append(nz(c.name())).append("**");
            if (c.color() != null) {
                md.append(" (couleur : ").append(c.color()).append(")");
            }
            if (c.description() != null && !c.description().isBlank()) {
                md.append(" — ").append(c.description());
            }
            md.append("\n");
        }
        md.append("\n");
    }

    private void appendProducts(StringBuilder md, UserDataExport data) {
        md.append("## Produits (").append(data.products().size()).append(")\n\n");
        if (data.products().isEmpty()) {
            md.append("_Aucun produit._\n\n");
            return;
        }
        for (ExportedProduct product : data.products()) {
            md.append("### ").append(nz(product.name())).append("\n\n");
            if (product.categoryName() != null) {
                md.append("- Catégorie : ").append(product.categoryName()).append("\n");
            }
            if (product.color() != null) {
                md.append("- Couleur : ").append(product.color()).append("\n");
            }
            md.append("- Événements : ").append(product.events().size()).append("\n\n");
            for (ExportedEvent event : product.events()) {
                appendEvent(md, event);
            }
        }
    }

    private void appendEvent(StringBuilder md, ExportedEvent e) {
        md.append("  - **").append(nz(e.title())).append("**");
        if (e.startDate() != null) {
            md.append(" — du ").append(e.startDate());
            if (e.endDate() != null) {
                md.append(" au ").append(e.endDate());
            }
        }
        if (Boolean.TRUE.equals(e.isRecurring()) && e.recurrenceUnit() != null) {
            md.append(" (récurrent : ").append(e.recurrenceUnit()).append(")");
        }
        md.append("\n");
    }

    /** Null-safe pour l'affichage : {@code null} -> chaîne vide. */
    private static String nz(String value) {
        return value == null ? "" : value;
    }
}
