package com.matimeline.eventmanager.application.services;

import java.util.List;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.exceptions.ExportFormatNotSupportedException;
import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;
import com.matimeline.eventmanager.domain.ports.services.ExportRenderer;

/**
 * Sélectionne le {@link ExportRenderer} adapté à un {@link ExportFormat} (#58). Spring
 * injecte toutes les implémentations du port ; la résolution se fait via
 * {@link ExportRenderer#supports(ExportFormat)}. Ajouter un format = ajouter un renderer,
 * sans toucher au use case (OCP).
 */
@Component
public class ExportRendererRegistry {

    private final List<ExportRenderer> renderers;

    public ExportRendererRegistry(List<ExportRenderer> renderers) {
        this.renderers = renderers;
    }

    /**
     * @throws ExportFormatNotSupportedException si aucun renderer ne gère {@code format}
     *         (garde-fou : ne devrait pas arriver, les 4 formats ayant un renderer).
     */
    public RenderedExport render(ExportFormat format, UserDataExport data) {
        return renderers.stream()
                .filter(renderer -> renderer.supports(format))
                .findFirst()
                .orElseThrow(() -> new ExportFormatNotSupportedException(format.name()))
                .render(data);
    }
}
