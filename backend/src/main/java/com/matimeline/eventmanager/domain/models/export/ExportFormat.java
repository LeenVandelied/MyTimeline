package com.matimeline.eventmanager.domain.models.export;

import com.matimeline.eventmanager.domain.exceptions.ExportFormatNotSupportedException;

/**
 * Formats d'export RGPD supportés (#58). Chaque format porte son type MIME, l'extension
 * de fichier associée et un drapeau {@code sync} :
 * <ul>
 *   <li>{@code sync = true}  ({@link #JSON}, {@link #MARKDOWN}) : génération inline, réponse
 *       HTTP immédiate (GET).</li>
 *   <li>{@code sync = false} ({@link #ZIP}, {@link #CSV}) : génération asynchrone via job +
 *       polling + URL signée (POST).</li>
 * </ul>
 *
 * <p>Domaine PUR : aucune dépendance framework. Le parsing du paramètre HTTP passe par
 * {@link #fromParam(String)}, qui lève {@link ExportFormatNotSupportedException} (mappée en
 * 400) pour toute valeur inconnue — jamais de {@code null}.
 */
public enum ExportFormat {

    JSON("application/json", "json", true),
    MARKDOWN("text/markdown", "md", true),
    ZIP("application/zip", "zip", false),
    CSV("text/csv", "csv", false);

    private final String contentType;
    private final String extension;
    private final boolean sync;

    ExportFormat(String contentType, String extension, boolean sync) {
        this.contentType = contentType;
        this.extension = extension;
        this.sync = sync;
    }

    public String contentType() {
        return contentType;
    }

    public String extension() {
        return extension;
    }

    /** {@code true} pour les formats à génération inline (JSON, Markdown). */
    public boolean isSync() {
        return sync;
    }

    /**
     * Parse un paramètre de requête (insensible à la casse) en {@link ExportFormat}.
     *
     * @throws ExportFormatNotSupportedException si {@code value} est {@code null}, vide ou
     *         ne correspond à aucun format supporté.
     */
    public static ExportFormat fromParam(String value) {
        if (value != null) {
            String normalized = value.trim().toUpperCase();
            for (ExportFormat format : values()) {
                if (format.name().equals(normalized)) {
                    return format;
                }
            }
        }
        throw new ExportFormatNotSupportedException(value);
    }
}
