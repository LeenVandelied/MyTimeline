package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.matimeline.eventmanager.infrastructure.security.JwtService;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #358 — contrat d'intégration de {@code GET /.well-known/jwks.json}.
 *
 * <p>Ce que ce fichier prouve, et qu'un test unitaire de {@code JwtService} ne peut pas prouver :
 * <ol>
 *   <li>que la CHAÎNE SPRING SECURITY RÉELLE laisse passer l'endpoint sans authentification —
 *       {@code SecurityConfig} termine par {@code anyRequest().authenticated()}, donc l'oubli du
 *       {@code permitAll} produirait un 401 et une boucle de découverte côté middleware ;</li>
 *   <li>que la clé PUBLIÉE vérifie réellement un jeton ÉMIS par le backend — c'est le cycle
 *       « découverte -> vérification de signature réussie » du critère d'acceptation #4,
 *       joué de bout en bout côté serveur.</li>
 * </ol>
 *
 * <p>La vérification est faite avec {@code java.security.Signature} en reconstruisant la clé
 * depuis les SEULS {@code n} et {@code e} servis par HTTP — jamais depuis l'objet clé interne.
 * Une erreur d'encodage (l'octet de signe de {@link BigInteger}, typiquement) ferait donc échouer
 * ce test, alors qu'une comparaison d'objets la manquerait complètement.
 */
@SpringBootTest
@AutoConfigureMockMvc
class JwksEndpointIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    /**
     * ANONYME : aucun cookie, aucun Bearer. Doit répondre 200 JSON.
     *
     * <p>⚠ Si ce test se met à renvoyer 401, ne pas « réparer » l'assertion : c'est la
     * whitelist de {@code SecurityConfig} qui a sauté, et la découverte de clé du middleware
     * Next boucle alors sur elle-même (401 -> pas de clé -> mode dégradé).
     */
    @Test
    void jwks_isReachableAnonymously_andExposesOneRs256SigningKey() throws Exception {
        mockMvc.perform(get(JwksController.JWKS_PATH))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("max-age=300")))
                .andExpect(jsonPath("$.keys.length()").value(1))
                .andExpect(jsonPath("$.keys[0].kty").value("RSA"))
                .andExpect(jsonPath("$.keys[0].use").value("sig"))
                .andExpect(jsonPath("$.keys[0].alg").value("RS256"))
                .andExpect(jsonPath("$.keys[0].kid").isNotEmpty())
                .andExpect(jsonPath("$.keys[0].n").isNotEmpty())
                .andExpect(jsonPath("$.keys[0].e").isNotEmpty());
    }

    /**
     * Aucun matériel PRIVÉ ne doit fuir : un JWK RSA privé porterait {@code d}, {@code p},
     * {@code q}, {@code dp}, {@code dq}, {@code qi}. Assertion bon marché, et c'est exactement
     * le genre de régression qu'un ajout de champ « pratique » introduirait sans bruit.
     */
    @Test
    void jwks_neverExposesPrivateKeyParameters() throws Exception {
        JsonNode key = firstKey();

        assertThat(key.fieldNames()).toIterable()
                .containsExactlyInAnyOrder("kty", "use", "alg", "kid", "n", "e");
    }

    /**
     * LE test du cycle complet : la clé reconstruite depuis le JWKS servi par HTTP vérifie un
     * jeton que le backend vient d'émettre, et rejette le même jeton altéré d'un caractère.
     */
    @Test
    void publishedKey_verifiesATokenActuallyIssuedByTheBackend() throws Exception {
        PublicKey published = rebuildFromJwks();
        String token = jwtService.generateToken("alice-jwks");

        assertThat(rs256Verifies(published, token))
                .as("le jeton émis par JwtService doit se vérifier avec la clé PUBLIÉE")
                .isTrue();

        assertThat(rs256Verifies(published, tamperSignature(token)))
                .as("un jeton altéré ne doit PAS se vérifier — sinon le test précédent ne prouve rien")
                .isFalse();
    }

    /**
     * La clé publiée est la MÊME que celle journalisée au boot (SPKI). Ancre le fait qu'il n'y a
     * qu'une source de matériel de clé : c'est ce qui rend la classe de panne « paire
     * dépareillée » inatteignable, et non une politique de déploiement.
     */
    @Test
    void publishedKey_isTheSameMaterialAsTheSpkiExposedForDiagnostics() throws Exception {
        byte[] fromJwks = rebuildFromJwks().getEncoded();
        byte[] fromSpki = Base64.getDecoder().decode(jwtService.getPublicKeySpkiBase64());

        assertThat(fromJwks).isEqualTo(fromSpki);
    }

    /**
     * L'octet de signe de {@link BigInteger} ne doit PAS être publié : pour un modulus de
     * 2048 bits, {@code n} décodé fait exactement 256 octets. Le bit de poids fort d'un modulus
     * RSA est toujours à 1, donc ce cas est atteint à CHAQUE run — pas une fois sur deux.
     */
    @Test
    void modulus_isEncodedAsAnUnsignedBigEndianInteger() throws Exception {
        byte[] modulus = Base64.getUrlDecoder().decode(firstKey().get("n").asText());

        assertThat(modulus).hasSize(256);
        assertThat(modulus[0] & 0xFF).isGreaterThanOrEqualTo(0x80);
    }

    // ---------------------------------------------------------------- helpers

    private JsonNode firstKey() throws Exception {
        MvcResult result = mockMvc.perform(get(JwksController.JWKS_PATH))
                .andExpect(status().isOk())
                .andReturn();
        return MAPPER.readTree(result.getResponse().getContentAsString()).get("keys").get(0);
    }

    /** Reconstruit la clé publique depuis les SEULS paramètres JWK servis par HTTP. */
    private PublicKey rebuildFromJwks() throws Exception {
        JsonNode key = firstKey();
        BigInteger modulus = new BigInteger(1, Base64.getUrlDecoder().decode(key.get("n").asText()));
        BigInteger exponent = new BigInteger(1, Base64.getUrlDecoder().decode(key.get("e").asText()));
        return KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(modulus, exponent));
    }

    private static boolean rs256Verifies(PublicKey key, String token) throws Exception {
        int lastDot = token.lastIndexOf('.');
        byte[] signingInput = token.substring(0, lastDot).getBytes(StandardCharsets.UTF_8);
        byte[] signature = Base64.getUrlDecoder().decode(token.substring(lastDot + 1));

        Signature verifier = Signature.getInstance("SHA256withRSA");
        verifier.initVerify(key);
        verifier.update(signingInput);
        return verifier.verify(signature);
    }

    /** Mute le premier caractère de la signature (stable, et hors zone de bourrage Base64url). */
    private static String tamperSignature(String token) {
        int lastDot = token.lastIndexOf('.');
        String signature = token.substring(lastDot + 1);
        char replacement = signature.charAt(0) == 'A' ? 'B' : 'A';
        return token.substring(0, lastDot + 1) + replacement + signature.substring(1);
    }
}
