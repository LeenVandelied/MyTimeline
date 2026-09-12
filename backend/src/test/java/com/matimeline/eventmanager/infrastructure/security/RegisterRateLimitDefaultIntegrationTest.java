package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #475 — contrat du plafond PAR DÉFAUT de {@code POST /api/auth/register} : 5/min/IP,
 * en vigueur dans tout profil qui ne pose pas {@code app.rate-limit.register-per-minute}
 * (prod comprise).
 *
 * <p><b>Pourquoi ce test n'existait pas avant, et pourquoi il compte maintenant.</b> Le
 * seuil register n'était asserté NULLE PART : {@code RateLimitingAndHeadersIntegrationTest}
 * n'exerce que le slot {@code login} (10/min). La valeur 5 n'était donc garantie que par sa
 * présence dans le code — et #475 vient précisément de rendre ce slot configurable. Sans
 * cette classe, une surcouche de profil mal placée (ou un default mal recopié dans un
 * placeholder {@code @Value}) relèverait le plafond de PRODUCTION en silence, et aucun test
 * ne rougirait. C'est l'armement de la valeur par défaut, pas de la surcharge.
 *
 * <p><b>Corps volontairement invalide.</b> Le filtre s'exécute AVANT le contrôleur : le jeton
 * bucket4j est consommé quel que soit le sort applicatif de la requête. On envoie donc un
 * corps que la validation rejettera (400) plutôt que 5 inscriptions réelles — même preuve,
 * sans 5 hachages BCrypt ni 5 lignes en base. Ce qui est asserté est le STATUT 429, jamais
 * le succès métier.
 */
@SpringBootTest
@AutoConfigureMockMvc
class RegisterRateLimitDefaultIntegrationTest extends AbstractPostgresIntegrationTest {

    /** Plafond attendu hors profil e2e. Doit rester aligné sur {@code DEFAULT_REGISTER_PER_MINUTE}. */
    private static final int DEFAULT_LIMIT = 5;

    private static final String REGISTER_BODY = "{\"name\":\"x\",\"username\":\"x\",\"email\":\"x\",\"password\":\"x\"}";

    @Autowired
    private MockMvc mockMvc;

    /**
     * IP de socket distincte par méthode de test : les buckets vivent dans le bean singleton,
     * partagé par tout le contexte Spring (lui-même mis en cache entre classes de test). Une IP
     * réutilisée ferait dépendre le résultat de l'ordre d'exécution.
     */
    private int register(String socketIp) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                        .with(req -> { req.setRemoteAddr(socketIp); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andReturn().getResponse().getStatus();
    }

    @Test
    void defaultProfile_registerCeilingIsFive() throws Exception {
        String ip = "10.75.0.1";
        for (int i = 1; i <= DEFAULT_LIMIT; i++) {
            assertNotEquals(429, register(ip),
                    "register #" + i + " must pass under the default ceiling of " + DEFAULT_LIMIT);
        }
        assertEquals(429, register(ip),
                "register #" + (DEFAULT_LIMIT + 1) + " must be throttled: the default ceiling is "
                        + DEFAULT_LIMIT + "/min/IP and MUST NOT be raised outside the e2e profile");
    }
}
