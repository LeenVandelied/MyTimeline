package com.matimeline.eventmanager.infrastructure.adapters.controllers.fixtures;

import com.matimeline.eventmanager.application.services.fixtures.FakeConcreteServiceImpl;

/**
 * Faux contrôleur qui réinjecte un service concret, pour ControllerRuleStrictnessTest. Sans
 * stéréotype Spring : annoté, il serait scanné par les tests SpringBootTest et casserait leur contexte.
 */
public class FakeControllerUsingServiceImpl {

    private final FakeConcreteServiceImpl service;

    public FakeControllerUsingServiceImpl(FakeConcreteServiceImpl service) {
        this.service = service;
    }

    public String ping() {
        return service.ping();
    }
}
