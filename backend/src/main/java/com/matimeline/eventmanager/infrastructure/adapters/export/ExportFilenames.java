package com.matimeline.eventmanager.infrastructure.adapters.export;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import com.matimeline.eventmanager.domain.models.export.ExportFormat;

/**
 * Fabrique de noms de fichier d'export (#58). Nom stable et SANS PII : préfixe fixe +
 * date de génération + extension du format ({@code mytimeline-export-YYYYMMDD.<ext>}).
 * Aucun userId/email dans le nom (évite la fuite via Content-Disposition ou le disque).
 */
final class ExportFilenames {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String PREFIX = "mytimeline-export-";

    private ExportFilenames() {
    }

    static String forFormat(ExportFormat format, LocalDateTime generatedAt) {
        return PREFIX + DAY.format(generatedAt) + "." + format.extension();
    }
}
