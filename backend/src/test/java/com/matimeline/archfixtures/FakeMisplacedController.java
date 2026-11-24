package com.matimeline.archfixtures;

import com.matimeline.eventmanager.application.services.fixtures.FakeConcreteServiceImpl;
import org.springframework.web.bind.annotation.RestController;

/**
 * Faux contrôleur rangé hors du dossier des contrôleurs, pour ControllerRuleStrictnessTest (#321).
 * Le package com.matimeline.archfixtures est hors du scan de l'application
 * (com.matimeline.eventmanager) : l'annotation ne charge donc rien dans les contextes Spring de test.
 */
@RestController
public class FakeMisplacedController {

    private final FakeConcreteServiceImpl service;

    public FakeMisplacedController(FakeConcreteServiceImpl service) {
        this.service = service;
    }

    public String ping() {
        return service.ping();
    }
}
