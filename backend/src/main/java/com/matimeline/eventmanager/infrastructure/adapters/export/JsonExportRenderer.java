package com.matimeline.eventmanager.infrastructure.adapters.export;

import org.springframework.stereotype.Component;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

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

    // Jackson 3 (#886) : java.time est pris en charge nativement (plus de JavaTimeModule) et les
    // dates sont ISO-8601 par défaut ; WRITE_DATES_AS_TIMESTAMPS reste désactivé explicitement
    // pour que le format du fichier ne dépende pas d'un défaut de bibliothèque.
    private final ObjectMapper objectMapper = JsonMapper.builder()
            .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT)
            .build();

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
        } catch (JacksonException e) {
            // Ne PAS fuiter le détail au client : le use case remonte un échec technique (500)
            // ou marque le job FAILED avec un code borné. Message générique ici.
            throw new IllegalStateException("json export rendering failed", e);
        }
    }
}
