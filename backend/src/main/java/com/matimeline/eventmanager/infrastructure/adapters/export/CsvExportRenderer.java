package com.matimeline.eventmanager.infrastructure.adapters.export;

import java.nio.charset.StandardCharsets;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport.ExportedCategory;
import com.matimeline.eventmanager.domain.models.export.UserDataExport.ExportedEvent;
import com.matimeline.eventmanager.domain.models.export.UserDataExport.ExportedProduct;
import com.matimeline.eventmanager.domain.ports.services.ExportRenderer;

/**
 * Rendu CSV de l'export RGPD (#58). Un seul fichier CSV sectionné (chaque entité a son bloc
 * {@code # SECTION} + en-tête + lignes). Échappement RFC 4180 manuel (guillemets doublés,
 * champs entourés si virgule / guillemet / saut de ligne) — pas de dépendance externe
 * ajoutée, cf. ADR-003.
 */
@Component
public class CsvExportRenderer implements ExportRenderer {

    @Override
    public boolean supports(ExportFormat format) {
        return format == ExportFormat.CSV;
    }

    @Override
    public RenderedExport render(UserDataExport data) {
        StringBuilder csv = new StringBuilder();

        csv.append("# PROFILE\n");
        csv.append("id,username,name,email,role,avatarPresent\n");
        UserDataExport.ExportedProfile p = data.profile();
        csv.append(row(str(p.id()), p.username(), p.name(), p.email(), p.role(),
                String.valueOf(p.avatarPresent())));

        csv.append("\n# CATEGORIES\n");
        csv.append("id,name,color,description\n");
        for (ExportedCategory c : data.categories()) {
            csv.append(row(str(c.id()), c.name(), c.color(), c.description()));
        }

        csv.append("\n# PRODUCTS\n");
        csv.append("id,name,color,categoryId,categoryName\n");
        for (ExportedProduct product : data.products()) {
            csv.append(row(str(product.id()), product.name(), product.color(),
                    str(product.categoryId()), product.categoryName()));
        }

        csv.append("\n# EVENTS\n");
        csv.append("id,productId,title,type,durationValue,durationUnit,isRecurring,"
                + "recurrenceUnit,recurrenceEndDate,startDate,endDate,isAllDay,color\n");
        for (ExportedProduct product : data.products()) {
            for (ExportedEvent e : product.events()) {
                csv.append(row(str(e.id()), str(product.id()), e.title(), e.type(),
                        str(e.durationValue()), e.durationUnit(), str(e.isRecurring()),
                        e.recurrenceUnit(), str(e.recurrenceEndDate()), str(e.startDate()),
                        str(e.endDate()), str(e.isAllDay()), e.color()));
            }
        }

        byte[] content = csv.toString().getBytes(StandardCharsets.UTF_8);
        return new RenderedExport(content, ExportFormat.CSV.contentType(),
                ExportFilenames.forFormat(ExportFormat.CSV, data.generatedAt()));
    }

    /** Assemble une ligne CSV terminée par un {@code \n}, chaque champ échappé RFC 4180. */
    private static String row(String... fields) {
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < fields.length; i++) {
            if (i > 0) {
                line.append(',');
            }
            line.append(escape(fields[i]));
        }
        return line.append('\n').toString();
    }

    /**
     * Échappement RFC 4180 : entoure de guillemets si nécessaire, double les guillemets.
     * Neutralise d'abord l'injection de formule (préfixe apostrophe) — cf. {@link #neutralizeFormula}.
     */
    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        String sanitized = neutralizeFormula(value);
        boolean needsQuoting = sanitized.contains(",") || sanitized.contains("\"")
                || sanitized.contains("\n") || sanitized.contains("\r");
        if (!needsQuoting) {
            return sanitized;
        }
        return "\"" + sanitized.replace("\"", "\"\"") + "\"";
    }

    /**
     * Mitigation OWASP CSV injection : un champ user-controlled commençant par
     * {@code = + - @} (ou une tabulation / un retour chariot) est interprété comme formule
     * à la réouverture dans Excel / Google Sheets. On préfixe une apostrophe pour forcer
     * l'interprétation en texte, AVANT l'échappement RFC 4180. Surface élargie par RGPD
     * Art.20 (le fichier peut être transmis à un tiers). #58.
     */
    private static String neutralizeFormula(String value) {
        if (value.isEmpty()) {
            return value;
        }
        char first = value.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@'
                || first == '\t' || first == '\r') {
            return "'" + value;
        }
        return value;
    }

    private static String str(Object value) {
        return value == null ? null : value.toString();
    }
}
