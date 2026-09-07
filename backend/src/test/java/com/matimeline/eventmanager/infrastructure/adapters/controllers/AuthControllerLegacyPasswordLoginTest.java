package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.concurrent.atomic.AtomicInteger;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #148 — GARDE-FOU DE NON-RÉGRESSION : durcir la politique de mot de passe
 * (BR-AUT-003 : >= 8, une majuscule, un chiffre) NE DOIT PAS verrouiller les
 * comptes créés avant le durcissement.
 *
 * <p>C'est le risque nommé dans l'issue. Le compte est semé DIRECTEMENT en base
 * avec un hash BCrypt d'un mot de passe à 6 caractères — impossible de passer
 * par {@code POST /api/auth/register}, qui le refuse désormais (c'est justement
 * ce que ce test rend visible : le seul moyen d'obtenir un tel compte est qu'il
 * préexiste, ce qui est exactement la situation en production).
 *
 * <p>Un test qui se contenterait de vérifier l'absence d'annotation sur
 * {@code AuthRequest} ne prouverait rien : la chaîne d'authentification complète
 * (filtre de validation, {@code AuthenticationManager}, comparaison BCrypt) est
 * ici traversée pour de vrai contre Postgres.
 *
 * <p><b>#500 — INSTRUMENTATION DE L'ÉCHEC.</b> Cette classe a été observée rouge
 * au premier boot de conteneur Testcontainers, sans que la cause ait pu être
 * établie : les messages d'échec ne disaient RIEN du statut HTTP reçu. Toute
 * assertion portant sur une réponse HTTP passe désormais par
 * {@link #diagnostic(MvcResult, String)}, qui rapporte statut + corps +
 * en-têtes + une sonde DB committée, et joint la grille de lecture qui permet
 * d'imputer l'échec sans le reproduire. Le message n'est construit QU'EN CAS
 * D'ÉCHEC (messages fournis par {@code Supplier}) : la sonde DB ne s'exécute
 * pas sur le chemin vert et ne peut donc pas en changer le comportement.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerLegacyPasswordLoginTest extends AbstractPostgresIntegrationTest {

    /** Mot de passe conforme à l'ANCIENNE politique (min 6) et rejeté par la nouvelle. */
    private static final String LEGACY_PASSWORD = "abcdef";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager em;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager txManager;

    private static final AtomicInteger IP_SEQ = new AtomicInteger(0);

    /** Sous-réseau 10.83.x.y DÉDIÉ : évite la collision de bucket rate-limit avec
     * les autres classes @SpringBootTest partageant le contexte. */
    private static String nextIp() {
        int n = IP_SEQ.incrementAndGet();
        return "10.83." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    @BeforeEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /**
     * Sème un compte legacy dans UNE transaction COMMITTÉE (pattern
     * {@code AccountDeletionIntegrationTest}). Le hash BCrypt est celui d'un mot de
     * passe à 6 caractères : la ligne est donc littéralement celle qu'aurait laissée
     * une inscription antérieure à #148. L'id n'est pas pré-assigné —
     * {@code @GeneratedValue} + {@code @Version} rejettent un id fourni au persist.
     */
    private String seedLegacyAccount() {
        String username = "legacy" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("Legacy Account");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode(LEGACY_PASSWORD));
            user.setRole("ROLE_USER");
            em.persist(user);
            em.flush();
            return user.getId();
        });
        return username;
    }

    private MvcResult login(String username, String password) throws Exception {
        String body = "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
        return mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
    }

    // ------------------------------------------------------------------
    // #500 — capture du diagnostic au moment de l'échec
    // ------------------------------------------------------------------

    /**
     * #500 — LA MESURE QUI MANQUAIT. Rend, pour une réponse quelconque, tout ce qui
     * permet d'imputer l'échec sans avoir à le reproduire :
     * <ul>
     *   <li><b>statut</b> — 429 (rate-limit) vs 401 (auth) vs 500 (exception avalée)
     *       étaient jusqu'ici indiscernables : le message d'échec ne portait que
     *       « cookie jwt absent » ;</li>
     *   <li><b>corps</b> — chaque cause a le sien et ils ne se confondent pas :
     *       {@code too_many_requests} (RateLimitingFilter), {@code unauthorized}
     *       (AuthController), {@code internal_error} (catch générique) ;</li>
     *   <li><b>en-têtes</b> — énumérés SANS liste blanche : le filtre n'émet
     *       aujourd'hui ni {@code Retry-After} ni {@code X-RateLimit-*}, mais si
     *       #499 en ajoute, la capture les remontera sans nouvelle modification ;</li>
     *   <li><b>sonde DB</b> — nombre de lignes {@code users} COMMITTÉES pour ce
     *       username, lu dans une transaction à part. C'est ce qui départage les deux
     *       familles de 401 : seed invisible vs credentials refusés.</li>
     * </ul>
     * Aucune exception ne s'échappe d'ici : un diagnostic qui plante masquerait
     * l'échec qu'il est censé documenter.
     */
    private String diagnostic(MvcResult res, String username) {
        MockHttpServletResponse response = res.getResponse();
        return "statut=" + response.getStatus()
                + " | corps=" + bodyOf(response)
                + " | en-têtes=" + headersOf(response)
                + " | lignes users committées pour '" + username + "'=" + committedRowCount(username)
                + " || GRILLE DE LECTURE — "
                + "429 {\"error\":\"too_many_requests\"} => RateLimitingFilter, bucket "
                + "«IP|POST /api/auth/login» (10/min) ou «IP|POST /api/me/change-password» (5/min) : "
                + "le sous-réseau dédié 10.83.x.y aurait donc été partagé ou rejoué ; "
                + "401 {\"error\":\"unauthorized\"} avec 0 ligne => le seed n'est pas visible du thread "
                + "de requête (commit, rollback, ou visibilité transactionnelle) ; "
                + "401 avec 1 ligne => la ligne existe mais les credentials sont refusés "
                + "(hash BCrypt / PasswordEncoder / username tronqué) ; "
                + "500 {\"error\":\"internal_error\"} => AuthController a avalé une exception ET loggué "
                + "sa stacktrace (registerSession, JwtService…) : la chercher dans la sortie surefire.";
    }

    private String bodyOf(MockHttpServletResponse response) {
        try {
            String body = response.getContentAsString();
            return body == null || body.isEmpty() ? "<vide>" : body;
        } catch (Exception e) {
            return "<illisible: " + e + ">";
        }
    }

    /**
     * En-têtes porteurs d'un secret : leur VALEUR ne doit jamais atteindre un log.
     * {@code Set-Cookie} transporte le JWT RS256 réel émis par un login réussi, et
     * {@code Authorization} un éventuel Bearer.
     */
    private static final Set<String> REDACTED_HEADERS =
            Set.of("set-cookie", "authorization", "proxy-authorization", "cookie");

    /**
     * Dump des en-têtes de réponse pour le diagnostic de #500, AVEC MASQUAGE DES SECRETS.
     *
     * <p><b>Pourquoi le masquage (review sécurité S81).</b> Ce message part dans la sortie
     * JUnit, donc dans les logs CI — et <b>ce dépôt est PUBLIC</b>. Or
     * {@link #assertLoginSucceeded} échoue aussi sur le cas « statut 200 mais cookie {@code jwt}
     * absent ou vide » : une réponse peut donc être dumpée ALORS QU'ELLE PORTE un
     * {@code Set-Cookie} avec un JWT signé exploitable. Le compte est éphémère et la base
     * jetable, mais publier un token valide reste une fuite — et elle ne coûte rien à éviter.
     *
     * <p><b>Ce que le masquage préserve.</b> Le nom de l'en-tête, le nom du cookie et la
     * longueur de la valeur restent visibles : « un {@code Set-Cookie jwt} de 412 caractères
     * était présent » suffit à distinguer les hypothèses que #500 cherche à départager
     * (cookie absent / cookie vide / cookie présent mais rejeté). Masquer la valeur n'enlève
     * donc rien au pouvoir diagnostique.
     */
    private String headersOf(MockHttpServletResponse response) {
        StringBuilder sb = new StringBuilder("[");
        for (String name : response.getHeaderNames()) {
            if (sb.length() > 1) {
                sb.append(", ");
            }
            sb.append(name).append('=');
            if (REDACTED_HEADERS.contains(name.toLowerCase(Locale.ROOT))) {
                sb.append(redact(response.getHeaderValues(name)));
            } else {
                sb.append(response.getHeaderValues(name));
            }
        }
        return sb.append(']').toString();
    }

    /**
     * Remplace chaque valeur d'en-tête sensible par {@code <nom-du-cookie: N caractères
     * masqués>} — assez pour le diagnostic, rien d'exploitable.
     */
    private String redact(List<Object> values) {
        return values.stream()
                .map(String::valueOf)
                .map(v -> {
                    int eq = v.indexOf('=');
                    String cookieName = eq > 0 ? v.substring(0, eq) : "<sans nom>";
                    return "<" + cookieName + ": " + v.length() + " caractères masqués>";
                })
                .collect(Collectors.joining(", ", "[", "]"));
    }

    /**
     * Lit en base, dans une transaction DISTINCTE de celle du seed, le nombre de
     * lignes committées portant ce username. Une transaction à part est le seul
     * moyen de distinguer « la ligne n'a jamais été committée » de « la ligne est
     * là mais l'authentification l'a refusée ».
     */
    private String committedRowCount(String username) {
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setReadOnly(true);
            Long count = tx.execute(status -> em.createQuery(
                            "select count(u) from UserEntity u where u.username = :username", Long.class)
                    .setParameter("username", username)
                    .getSingleResult());
            return String.valueOf(count);
        } catch (Exception e) {
            return "<sonde KO: " + e + ">";
        }
    }

    /**
     * Exige un login réussi ET rapporte le diagnostic complet quand il ne l'est pas.
     * Remplace les {@code assertNotNull(cookie, "…")} dont le message ne disait rien
     * du statut reçu — le point aveugle nommé par #500.
     */
    private Cookie assertLoginSucceeded(MvcResult res, String username, String why) {
        Cookie jwt = res.getResponse().getCookie("jwt");
        boolean succeeded = res.getResponse().getStatus() == 200
                && jwt != null && jwt.getValue() != null && !jwt.getValue().isBlank();
        assertTrue(succeeded, () -> why + " — " + diagnostic(res, username));
        return jwt;
    }

    @Test
    void login_withPreExistingSixCharPassword_stillSucceeds_andIssuesJwtCookie() throws Exception {
        String username = seedLegacyAccount();

        MvcResult res = login(username, LEGACY_PASSWORD);

        assertLoginSucceeded(res, username,
                "un compte antérieur à #148 doit toujours pouvoir se connecter et recevoir un cookie jwt non vide");
    }

    /**
     * Contre-épreuve : le compte legacy se connecte, mais son mot de passe est bien
     * refusé À LA CRÉATION. Sans cette moitié, le test ci-dessus passerait aussi si
     * la politique n'avait jamais été appliquée.
     */
    @Test
    void register_withTheSameSixCharPassword_isRejected() throws Exception {
        String username = "newacc" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String body = "{"
                + "\"name\":\"New Account\","
                + "\"username\":\"" + username + "\","
                + "\"email\":\"" + username + "@example.test\","
                + "\"password\":\"" + LEGACY_PASSWORD + "\"}";

        MvcResult res = mockMvc.perform(post("/api/auth/register")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();

        // #500 : un 429 ici se lirait comme « la politique ne rejette plus » alors que la
        // requête n'a même pas atteint la validation. Le diagnostic tranche.
        assertEquals(400, res.getResponse().getStatus(),
                () -> "un mot de passe à 6 caractères doit être refusé à l'inscription — "
                        + diagnostic(res, username));
    }

    /** Le compte legacy peut se mettre en conformité : son ancien mot de passe hors
     * politique est accepté comme `oldPassword`, le nouveau doit la respecter. */
    @Test
    void legacyAccount_canChangeToACompliantPassword_thenLogInWithIt() throws Exception {
        String username = seedLegacyAccount();
        Cookie jwt = assertLoginSucceeded(login(username, LEGACY_PASSWORD), username,
                "pré-requis : le login legacy doit réussir");

        String newPassword = "Legacy2026";
        // review S71 — `POST /api/me/change-password` est un slot RATE-LIMITÉ (5/min/IP,
        // `RateLimitingFilter.LIMITS`, ajouté par #134). Sans `setRemoteAddr` cet appel
        // retombait sur le 127.0.0.1 par défaut de MockMvc, donc sur un bucket PARTAGÉ
        // avec toute autre classe @SpringBootTest appelant ce endpoint sans IP dédiée
        // (aujourd'hui `RegisterLoginIntegrationTest` : 2 jetons consommés sur 5 — sous
        // le seuil, mais la marge dépend d'un décompte qu'aucun test ne garde).
        // On applique donc à CE troisième appel la convention que la classe s'était
        // déjà donnée pour `login`/`register` (sous-réseau 10.83.x.y dédié, cf. `nextIp`) :
        // le verdict ne dépend plus du nombre d'appels des autres classes.
        // ⚠ Ce n'est PAS une déflakisation prouvée : le flaky signalé par l'audit n'a pas
        // pu être reproduit (3 conteneurs neufs, verts). C'est la suppression d'un couplage
        // réel, pas la correction d'une cause établie.
        MvcResult changed = mockMvc.perform(post("/api/me/change-password")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"oldPassword\":\"" + LEGACY_PASSWORD
                                + "\",\"newPassword\":\"" + newPassword + "\"}"))
                .andReturn();

        assertEquals(204, changed.getResponse().getStatus(),
                () -> "la mise en conformité du mot de passe doit renvoyer 204 — "
                        + diagnostic(changed, username));

        assertLoginSucceeded(login(username, newPassword), username,
                "le compte doit se reconnecter avec son nouveau mot de passe conforme");
    }
}
