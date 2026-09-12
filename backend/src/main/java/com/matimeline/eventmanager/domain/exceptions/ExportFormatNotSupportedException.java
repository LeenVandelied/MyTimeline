package com.matimeline.eventmanager.domain.exceptions;

/**
 * Format d'export inconnu, ou format demandé sur le mauvais verbe HTTP (#58) : un format
 * synchrone (JSON/Markdown) soumis en POST, ou un format asynchrone (ZIP/CSV) demandé en
 * GET inline. Mappée en 400 par {@code GlobalExceptionHandler}. Le message n'expose aucune
 * donnée interne.
 */
public class ExportFormatNotSupportedException extends RuntimeException {

    public ExportFormatNotSupportedException(String requested) {
        super("unsupported export format: " + requested);
    }
}
