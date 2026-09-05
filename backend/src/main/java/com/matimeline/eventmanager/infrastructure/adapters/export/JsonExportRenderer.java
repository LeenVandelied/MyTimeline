package com.matimeline.eventmanager.infrastructure.adapters.export;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;
import com.matimeline.eventmanager.domain.ports.services.ExportRenderer;

/**
 * Rendu JSON de l'export RGPD (#58). Sérialise le snapshot {@link UserDataExport} avec un
 * {@link ObjectMapper} dédié (dates ISO-8601 lisibles, indenté). Le snapshot ne contient
 * QUE des champs de portabilité (jamais le password hash), donc la sérialisation par
 * réflexion est sûre par construction.
 */
@Component
public class JsonExportRenderer implements ExportRenderer {

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);

    @Override
    public boolean supports(ExportFormat format) {
        return format == ExportFormat.JSON;
    }

    @Override
    public RenderedExport render(UserDataExport data) {
        try {
            byte[] content = objectMapper.writeValueAsBytes(data);
            return new RenderedExport(content, ExportFormat.JSON.contentType(),
                    ExportFilenames.forFormat(ExportFormat.JSON, data.generatedAt()));
        } catch (JsonProcessingException e) {
            // Ne PAS fuiter le détail au client : le use case remonte un échec technique (500)
            // ou marque le job FAILED avec un code borné. Message générique ici.
            throw new IllegalStateException("json export rendering failed", e);
        }
    }
}
