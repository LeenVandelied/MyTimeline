package com.matimeline.archfixtures;

import com.matimeline.eventmanager.application.services.fixtures.FakeConcreteServiceImpl;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Faux gestionnaire d'erreurs rangé hors du dossier des contrôleurs, pour ArchitectureTest (#321).
 * Hors du scan de l'application (com.matimeline.eventmanager), il n'est chargé par aucun contexte
 * Spring de test.
 */
@RestControllerAdvice
public class FakeMisplacedAdvice {

    private final FakeConcreteServiceImpl service;

    public FakeMisplacedAdvice(FakeConcreteServiceImpl service) {
        this.service = service;
    }

    public String handle() {
        return service.ping();
    }
}
