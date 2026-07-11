package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #58 (RGPD export) — parcourt la VRAIE chaîne Spring Security + Postgres (Testcontainers) +
 * migrations V1..V13. Couvre les critères d'acceptation :
 * <ul>
 *   <li>GET export?format=json|markdown -> 200 avec toutes les données du user ;</li>
 *   <li>POST export?format=zip|csv -> 202 + jobId ; job -> COMPLETED + URL signée 24h ;
 *       download -> 200 fichier ;</li>
 *   <li>ownership : un user n'accède pas au job/fichier d'un autre (404) ;</li>
 *   <li>validation verbe/format (sync en POST / async en GET / format inconnu -> 400).</li>
 * </ul>
 *
 * <p>L'executor {@code exportExecutor} est remplacé par un {@link SyncTaskExecutor}
 * ({@link SyncExportExecutorConfig}) : la génération async s'exécute en ligne, rendant le
 * polling déterministe (job COMPLETED dès la soumission committée). L'expiration réelle à 24h
 * est couverte par {@code ExportTokenServiceTest} (Clock fixe).
 */
@SpringBootTest(properties = {
        "jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
        "spring.main.allow-bean-definition-overriding=true"
})
@AutoConfigureMockMvc
@Import(ExportEndpointsIntegrationTest.SyncExportExecutorConfig.class)
class ExportEndpointsIntegrationTest extends AbstractPostgresIntegrationTest {

    /** Remplace l'executor async par une exécution synchrone (polling déterministe). */
    @TestConfiguration
    static class SyncExportExecutorConfig {
        @Bean(name = "exportExecutor")
        SyncTaskExecutor exportExecutor() {
            return new SyncTaskExecutor();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager em;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager txManager;

    private final ObjectMapper json = new ObjectMapper();
    private static final AtomicInteger IP_SEQ = new AtomicInteger(0);

    private static String nextIp() {
        int n = IP_SEQ.incrementAndGet();
        return "10.79." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    @BeforeEach
    void clearBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearAfter() {
        SecurityContextHolder.clearContext();
    }

    private record Seed(UUID userId, String username, UUID categoryId, UUID productId) {}

    private Seed seedGraph() {
        String username = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("ExportTest");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("secret6"));
            user.setRole("ROLE_USER");
            em.persist(user);

            CategoryEntity category = new CategoryEntity();
            category.setName("cat-" + username);
            category.setOwner(user);
            em.persist(category);

            ProductEntity product = new ProductEntity();
            product.setName("produit-" + username);
            product.setArchived(false);
            product.setCategory(category);
            product.setUser(user);
            em.persist(product);

            EventEntity event = new EventEntity();
            event.setTitle("evt-" + username);
            event.setType("single");
            event.setIsRecurring(false);
            event.setIsAllDay(true);
            event.setStartDate(LocalDate.now());
            event.setEndDate(LocalDate.now());
            event.setArchived(false);
            event.setProduct(product);
            em.persist(event);

            em.flush();
            return new Seed(user.getId(), username, category.getId(), product.getId());
        });
    }

    private Cookie login(String username) throws Exception {
        String body = "{\"username\":\"" + username + "\",\"password\":\"secret6\"}";
        String ip = nextIp();
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(ip); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        Cookie jwt = res.getResponse().getCookie("jwt");
        assertNotNull(jwt, "login doit poser le cookie jwt");
        return jwt;
    }

    // ---------- SYNC (JSON / Markdown) ----------

    @Test
    void exportJson_returnsAllUserData_withoutPassword() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());

        MvcResult res = mockMvc.perform(get("/api/export").param("format", "json").cookie(jwt))
                .andExpect(status().isOk())
                .andReturn();

        String contentType = res.getResponse().getContentType();
        assertTrue(contentType != null && contentType.contains("application/json"));
        String body = res.getResponse().getContentAsString();
        assertTrue(body.contains(s.username() + "@example.test"), "email exporté");
        assertTrue(body.contains("produit-" + s.username()), "produit exporté");
        assertTrue(body.contains("cat-" + s.username()), "catégorie exportée");
        assertTrue(body.contains("evt-" + s.username()), "événement exporté");
        assertTrue(body.toLowerCase().contains("password") == false, "aucun password sérialisé");
    }

    @Test
    void exportMarkdown_returns200() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());

        MvcResult res = mockMvc.perform(get("/api/export").param("format", "markdown").cookie(jwt))
                .andExpect(status().isOk())
                .andReturn();

        assertTrue(res.getResponse().getContentType().contains("text/markdown"));
        assertTrue(res.getResponse().getContentAsString().startsWith("# Export MyTimeline"));
    }

    // ---------- ASYNC (ZIP / CSV) ----------

    @Test
    void exportZip_asyncFlow_submitPollDownload() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());

        // Soumission -> 202 + jobId.
        MvcResult submit = mockMvc.perform(post("/api/export").param("format", "zip").cookie(jwt))
                .andExpect(status().isAccepted())
                .andReturn();
        JsonNode submitBody = json.readTree(submit.getResponse().getContentAsString());
        String jobId = submitBody.get("jobId").asText();
        assertEquals("ZIP", submitBody.get("format").asText());

        // Polling -> COMPLETED (executor synchrone) + URL signée + expiration 24h.
        MvcResult jobRes = mockMvc.perform(get("/api/export/job/" + jobId).cookie(jwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode jobBody = json.readTree(jobRes.getResponse().getContentAsString());
        assertEquals("COMPLETED", jobBody.get("status").asText());
        String downloadUrl = jobBody.get("downloadUrl").asText();
        assertTrue(downloadUrl.startsWith("/api/export/download/" + jobId + "?token="));

        // Expiration ~ +24h.
        LocalDateTime expiresAt = LocalDateTime.parse(jobBody.get("expiresAt").asText());
        LocalDateTime now = LocalDateTime.now();
        assertTrue(expiresAt.isAfter(now.plusHours(23)) && expiresAt.isBefore(now.plusHours(25)),
                "expiresAt doit être ~ maintenant + 24h");

        // Download -> 200 zip.
        MvcResult download = mockMvc.perform(get(downloadUrl).cookie(jwt))
                .andExpect(status().isOk())
                .andReturn();
        assertTrue(download.getResponse().getContentType().contains("application/zip"));
        assertTrue(download.getResponse().getContentAsByteArray().length > 0, "archive non vide");
    }

    @Test
    void exportCsv_asyncFlow_analogousToZip() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());

        MvcResult submit = mockMvc.perform(post("/api/export").param("format", "csv").cookie(jwt))
                .andExpect(status().isAccepted())
                .andReturn();
        String jobId = json.readTree(submit.getResponse().getContentAsString()).get("jobId").asText();

        MvcResult jobRes = mockMvc.perform(get("/api/export/job/" + jobId).cookie(jwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode jobBody = json.readTree(jobRes.getResponse().getContentAsString());
        assertEquals("COMPLETED", jobBody.get("status").asText());

        MvcResult download = mockMvc.perform(get(jobBody.get("downloadUrl").asText()).cookie(jwt))
                .andExpect(status().isOk())
                .andReturn();
        assertTrue(download.getResponse().getContentType().contains("text/csv"));
    }

    // ---------- OWNERSHIP ----------

    @Test
    void jobOfAnotherUser_returns404() throws Exception {
        Seed a = seedGraph();
        Seed b = seedGraph();
        Cookie jwtA = login(a.username());
        Cookie jwtB = login(b.username());

        String jobIdA = json.readTree(
                mockMvc.perform(post("/api/export").param("format", "zip").cookie(jwtA))
                        .andExpect(status().isAccepted())
                        .andReturn().getResponse().getContentAsString())
                .get("jobId").asText();

        // B tente d'accéder au job de A -> 404 (anti-énumération).
        mockMvc.perform(get("/api/export/job/" + jobIdA).cookie(jwtB))
                .andExpect(status().isNotFound());
    }

    @Test
    void downloadOfAnotherUser_returns404() throws Exception {
        Seed a = seedGraph();
        Seed b = seedGraph();
        Cookie jwtA = login(a.username());
        Cookie jwtB = login(b.username());

        String jobIdA = json.readTree(
                mockMvc.perform(post("/api/export").param("format", "zip").cookie(jwtA))
                        .andExpect(status().isAccepted())
                        .andReturn().getResponse().getContentAsString())
                .get("jobId").asText();
        String downloadUrlA = json.readTree(
                mockMvc.perform(get("/api/export/job/" + jobIdA).cookie(jwtA))
                        .andReturn().getResponse().getContentAsString())
                .get("downloadUrl").asText();

        // B utilise l'URL signée de A (token lié à A) -> 404 (ownership token != caller).
        mockMvc.perform(get(downloadUrlA).cookie(jwtB))
                .andExpect(status().isNotFound());
        // A y accède bien.
        mockMvc.perform(get(downloadUrlA).cookie(jwtA))
                .andExpect(status().isOk());
    }

    @Test
    void download_withoutOrInvalidToken_returns404() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());
        String jobId = json.readTree(
                mockMvc.perform(post("/api/export").param("format", "zip").cookie(jwt))
                        .andReturn().getResponse().getContentAsString())
                .get("jobId").asText();

        mockMvc.perform(get("/api/export/download/" + jobId).param("token", "forged").cookie(jwt))
                .andExpect(status().isNotFound());
    }

    // ---------- VALIDATION VERBE / FORMAT ----------

    @Test
    void asyncFormatInGet_returns400() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());
        mockMvc.perform(get("/api/export").param("format", "zip").cookie(jwt))
                .andExpect(status().isBadRequest());
    }

    @Test
    void syncFormatInPost_returns400() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());
        mockMvc.perform(post("/api/export").param("format", "json").cookie(jwt))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownFormat_returns400() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());
        mockMvc.perform(get("/api/export").param("format", "bogus").cookie(jwt))
                .andExpect(status().isBadRequest());
    }

    @Test
    void export_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/export").param("format", "json"))
                .andExpect(status().isUnauthorized());
    }
}
