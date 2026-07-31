package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;

import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetails;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetailsService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Issue #32 — couverture sécurité :
 * - BR-AUT-008 : /me ne sérialise jamais le hash du mot de passe.
 * - BR-AUT-001 : doublon username/email à l'inscription -> 409 propre.
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerSecurityTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtService jwtService;
    @Mock
    private CustomUserDetailsService userDetailsService;
    @Mock
    private UserService userService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private com.matimeline.eventmanager.domain.ports.services.PasswordResetService passwordResetService;
    @Mock
    private com.matimeline.eventmanager.domain.ports.services.SessionService sessionService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(
                authenticationManager, jwtService, userDetailsService, userService, passwordEncoder,
                passwordResetService, sessionService);
        // #99 — les attributs cookie Secure/Domain sont désormais injectés par @Value
        // (app.cookie.*). En setup standalone, Spring ne les renseigne pas : on simule
        // le profil prod (Secure=true, Domain défini) pour vérifier la COHÉRENCE des
        // attributs entre pose (login/refresh) et suppression (logout).
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "cookieSecure", true);
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "cookieDomain", "mytimeline.example");
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    private User sampleUser() {
        return new User(
                UUID.randomUUID(),
                "Alice",
                "alice",
                "$2a$10$bcryptHashThatMustNeverLeak",
                "ROLE_USER",
                "alice@example.com");
    }

    /**
     * Issue #104 — BR-AUT-007 / anti-pattern A3 : le login ne renvoie plus le JWT
     * brut dans le body. Le token est posé UNIQUEMENT dans le cookie HttpOnly.
     */
    @Test
    void login_doesNotReturnJwtInBody_andSetsHttpOnlyCookie() throws Exception {
        String jwt = "eyJhbGciOiJIUzI1NiJ9.payload.signature";
        Authentication authentication = org.mockito.Mockito.mock(Authentication.class);
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(jwtService.generateToken(any(Authentication.class))).thenReturn(jwt);

        String body = "{\"username\":\"alice\",\"password\":\"secret6\"}";

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                // Le body ne doit PAS contenir le JWT brut.
                .andExpect(content().string(not(containsString(jwt))))
                // Réponse neutre.
                .andExpect(jsonPath("$.message").value("Authentification réussie"))
                // Le cookie HttpOnly reste présent et porte le token.
                .andExpect(cookie().exists("jwt"))
                .andExpect(cookie().value("jwt", jwt))
                .andExpect(cookie().httpOnly("jwt", true));
    }

    /**
     * Issue #116 — BR-AUT-005 : sur mauvais credentials, le login renvoie un 401
     * avec un body JSON {"error":"unauthorized"} (#288 : code ErrorCode au niveau du
     * statut, vocabulaire unifié). Le code reste neutre : il ne distingue pas username
     * inconnu vs mot de passe incorrect.
     */
    @Test
    void login_withBadCredentials_returns401WithJsonError() throws Exception {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("bad"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"wrongpass\"}"))
                .andExpect(status().isUnauthorized())
                // #288 : vocabulaire unifié ErrorCode — 401 -> code "unauthorized".
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }

    @Test
    void me_doesNotExposePasswordHash() throws Exception {
        User user = sampleUser();
        when(jwtService.extractUsername("valid-token")).thenReturn("alice");
        when(userService.findDomainUserByUsername("alice")).thenReturn(Optional.of(user));
        when(jwtService.validateToken(anyString(), any(CustomUserDetails.class))).thenReturn(true);
        // Correctif review S13 (fix #1) : /me vérifie désormais la révocation du jti.
        // Session active -> 200 (cas nominal). Cf. me_afterRevocation_* (intégration)
        // pour le cas révoqué -> 401.
        when(sessionService.isSessionActive(any())).thenReturn(true);

        mockMvc.perform(get("/api/auth/me").cookie(new Cookie("jwt", "valid-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.name").value("Alice"));
    }

    /**
     * Issue #289 — anti-énumération de compte sur /me : un token à SIGNATURE VALIDE
     * (extractUsername ne lève pas) dont le username n'existe pas (user.isEmpty())
     * renvoie le MÊME 401 générique {"error":"unauthorized"} que /refresh,
     * jamais un 404 "User not found" qui révélerait l'ABSENCE du compte. Aucune
     * distinction observable entre "compte inexistant" et "token invalide".
     */
    @Test
    void me_withUnknownUserInValidToken_returns401Generic_notFound() throws Exception {
        when(jwtService.extractUsername("ghost-token")).thenReturn("ghost");
        when(userService.findDomainUserByUsername("ghost")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/me").cookie(new Cookie("jwt", "ghost-token")))
                .andExpect(status().isUnauthorized())
                // #288 : 401 générique -> code "unauthorized" (anti-énumération inchangée).
                .andExpect(jsonPath("$.error").value("unauthorized"))
                // Aucune fuite d'existence de compte : pas de 404 ni de "User not found".
                .andExpect(content().string(not(containsString("User not found"))));
    }

    /**
     * Issue #312 — follow-up #289 : sur /me, une {@code SignatureException} (token
     * signé avec une autre clé / altéré) doit renvoyer le MÊME 401 générique
     * {"error":"unauthorized"} que /refresh (cf.
     * {@code refresh_withInvalidSignature_returns401AndDoesNotReissue}), jamais un
     * 500 (auparavant capturée par le {@code catch (Exception)} générique du
     * contrôleur — side-channel mineur révélant le type d'échec de parsing).
     */
    @Test
    void me_withInvalidSignature_returns401Generic() throws Exception {
        when(jwtService.extractUsername("tampered-token"))
                .thenThrow(new SignatureException("invalid signature"));

        mockMvc.perform(get("/api/auth/me").cookie(new Cookie("jwt", "tampered-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }

    /**
     * Issue #312 — non-régression : un token EXPIRÉ sur /me continue de renvoyer le
     * 401 générique inchangé (catch {@code ExpiredJwtException} existant, comportement
     * non touché par l'ajout du catch {@code JwtException}).
     */
    @Test
    void me_withExpiredToken_returns401Generic() throws Exception {
        when(jwtService.extractUsername("expired-token"))
                .thenThrow(new ExpiredJwtException(null, null, "expired"));

        mockMvc.perform(get("/api/auth/me").cookie(new Cookie("jwt", "expired-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }

    /**
     * Issue #312 — non-régression : un token MALFORMÉ sur /me continue de renvoyer le
     * 401 générique inchangé (catch {@code MalformedJwtException} existant,
     * comportement non touché par l'ajout du catch {@code JwtException}).
     */
    @Test
    void me_withMalformedToken_returns401Generic() throws Exception {
        when(jwtService.extractUsername("malformed-token"))
                .thenThrow(new MalformedJwtException("malformed"));

        mockMvc.perform(get("/api/auth/me").cookie(new Cookie("jwt", "malformed-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }

    /**
     * FU2 (S57) — cookie {@code jwt=} VIDE sur /me : jjwt lève nativement une
     * {@code IllegalArgumentException} sur un jeton vide/blanc, hors de la hiérarchie
     * {@code JwtException} — elle échappait donc au {@code catch (JwtException)} (#312) et
     * retombait dans le {@code catch (Exception)} générique -> 500. {@link JwtService#extractUsername}
     * lève désormais {@link MalformedJwtException} pour ce cas (cf. {@code JwtServiceRs256Test}),
     * déjà couverte par le catch existant : ce test ancre le 401 générique côté contrôleur, au
     * même titre que token expiré/malformé/signature invalide.
     */
    @Test
    void me_withEmptyToken_returns401Generic_notInternalError() throws Exception {
        when(jwtService.extractUsername(""))
                .thenThrow(new MalformedJwtException("Jeton JWT absent ou blanc."));

        mockMvc.perform(get("/api/auth/me").cookie(new Cookie("jwt", "")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }

    @Test
    void register_duplicateUsername_returns409() throws Exception {
        when(userService.findDomainUserByUsername(anyString())).thenReturn(Optional.empty());
        when(userService.createUser(any(User.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "could not execute statement; constraint [users.username]"));

        String body = "{\"name\":\"validName\",\"username\":\"validUser\","
                + "\"email\":\"valid@example.com\",\"password\":\"secret6\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                // #288 : discriminant username/email supprimé du body (front mappe par
                // statut seul) — code unique "conflict" pour tout 409 register.
                .andExpect(jsonPath("$.error").value("conflict"));
    }

    @Test
    void register_duplicateEmail_returns409() throws Exception {
        when(userService.findDomainUserByUsername(anyString())).thenReturn(Optional.empty());
        when(userService.createUser(any(User.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "could not execute statement; constraint [users.email]"));

        String body = "{\"name\":\"validName\",\"username\":\"validUser\","
                + "\"email\":\"dupe@example.com\",\"password\":\"secret6\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                // #288 : email dupliqué -> même code générique "conflict" (pas de discriminant).
                .andExpect(jsonPath("$.error").value("conflict"));
    }

    /**
     * Issue #105 — BR-AUT-009 / anti-pattern A5 : comportement nominal inchangé.
     * Un token valide est renouvelé (200) et un nouveau cookie jwt est posé.
     */
    @Test
    void refresh_withValidToken_reissuesTokenAnd200() throws Exception {
        User user = sampleUser();
        when(jwtService.extractUsername("valid-token")).thenReturn("alice");
        when(userService.findDomainUserByUsername("alice")).thenReturn(Optional.of(user));
        when(jwtService.validateToken(anyString(), any(CustomUserDetails.class))).thenReturn(true);
        // #73 : le jti courant doit être ACTIF pour autoriser le refresh (BR-AUT-009 étendue).
        when(sessionService.isSessionActive(any())).thenReturn(true);
        when(jwtService.generateToken(any(Authentication.class))).thenReturn("new-token");

        mockMvc.perform(post("/api/auth/refresh").cookie(new Cookie("jwt", "valid-token")))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("jwt"))
                .andExpect(cookie().value("jwt", "new-token"))
                .andExpect(cookie().httpOnly("jwt", true));
    }

    /**
     * Issue #105 — BR-AUT-009 : un token EXPIRÉ ne doit jamais être ré-émis.
     * extractUsername lève ExpiredJwtException -> 401 {"error":"unauthorized"},
     * aucun nouveau token généré ni cookie posé.
     */
    @Test
    void refresh_withExpiredToken_returns401AndDoesNotReissue() throws Exception {
        when(jwtService.extractUsername("expired-token"))
                .thenThrow(new ExpiredJwtException(null, null, "expired"));

        mockMvc.perform(post("/api/auth/refresh").cookie(new Cookie("jwt", "expired-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"))
                .andExpect(cookie().doesNotExist("jwt"));

        org.mockito.Mockito.verify(jwtService, org.mockito.Mockito.never())
                .generateToken(any(Authentication.class));
    }

    /**
     * Issue #105 — BR-AUT-009 : un token à signature invalide ne doit jamais être
     * ré-émis. extractUsername lève SignatureException (sous-type de JwtException)
     * -> 401, jamais de 500 ni de ré-émission.
     */
    @Test
    void refresh_withInvalidSignature_returns401AndDoesNotReissue() throws Exception {
        when(jwtService.extractUsername("tampered-token"))
                .thenThrow(new SignatureException("invalid signature"));

        mockMvc.perform(post("/api/auth/refresh").cookie(new Cookie("jwt", "tampered-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"))
                .andExpect(cookie().doesNotExist("jwt"));

        org.mockito.Mockito.verify(jwtService, org.mockito.Mockito.never())
                .generateToken(any(Authentication.class));
    }

    /**
     * Review PR #113 — anti-énumération de compte : un token SIGNÉ VALIDE dont le
     * username n'existe pas (user.isEmpty()) doit renvoyer le MÊME 401 générique
     * {"error":"unauthorized"} qu'un token invalide/expiré — jamais un
     * 404 "User not found" qui révélerait l'absence du compte. Aucune ré-émission.
     */
    @Test
    void refresh_withUnknownUserInValidToken_returns401NotFound_andDoesNotReissue() throws Exception {
        when(jwtService.extractUsername("ghost-token")).thenReturn("ghost");
        when(userService.findDomainUserByUsername("ghost")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/auth/refresh").cookie(new Cookie("jwt", "ghost-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"))
                .andExpect(cookie().doesNotExist("jwt"));

        org.mockito.Mockito.verify(jwtService, org.mockito.Mockito.never())
                .generateToken(any(Authentication.class));
    }

    /**
     * FU2 (S57) — parité avec {@code me_withEmptyToken_returns401Generic_notInternalError} :
     * cookie {@code jwt=} vide sur /refresh -> même 401 générique, jamais 500, jamais de
     * ré-émission de token.
     */
    @Test
    void refresh_withEmptyToken_returns401Generic_notInternalError() throws Exception {
        when(jwtService.extractUsername(""))
                .thenThrow(new MalformedJwtException("Jeton JWT absent ou blanc."));

        mockMvc.perform(post("/api/auth/refresh").cookie(new Cookie("jwt", "")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"))
                .andExpect(cookie().doesNotExist("jwt"));

        org.mockito.Mockito.verify(jwtService, org.mockito.Mockito.never())
                .generateToken(any(Authentication.class));
    }

    /**
     * Issue #99 — BR-AUT-007 / BR-AUT-010 / A6+A7 : les attributs Secure et Domain
     * du cookie jwt sont externalisés (@Value app.cookie.*) et IDENTIQUES entre la
     * pose (login, refresh) et la suppression (logout). Sans cette identité, le
     * navigateur ne matche pas le cookie à effacer (BR-AUT-010).
     */
    @Test
    void jwtCookieAttributes_areCoherent_acrossLoginRefreshLogout() throws Exception {
        // login
        Authentication authentication = org.mockito.Mockito.mock(Authentication.class);
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(jwtService.generateToken(any(Authentication.class))).thenReturn("login-token");
        Cookie loginCookie = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"secret6\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("jwt");

        // refresh
        User user = sampleUser();
        when(jwtService.extractUsername("valid-token")).thenReturn("alice");
        when(userService.findDomainUserByUsername("alice")).thenReturn(Optional.of(user));
        when(jwtService.validateToken(anyString(), any(CustomUserDetails.class))).thenReturn(true);
        when(sessionService.isSessionActive(any())).thenReturn(true);
        Cookie refreshCookie = mockMvc.perform(post("/api/auth/refresh").cookie(new Cookie("jwt", "valid-token")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("jwt");

        // logout (suppression : maxAge=0)
        Cookie logoutCookie = mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("jwt");

        org.junit.jupiter.api.Assertions.assertNotNull(loginCookie);
        org.junit.jupiter.api.Assertions.assertNotNull(refreshCookie);
        org.junit.jupiter.api.Assertions.assertNotNull(logoutCookie);

        // Secure cohérent (= valeur injectée true) sur les 3 points.
        org.junit.jupiter.api.Assertions.assertTrue(loginCookie.getSecure());
        org.junit.jupiter.api.Assertions.assertEquals(loginCookie.getSecure(), refreshCookie.getSecure());
        org.junit.jupiter.api.Assertions.assertEquals(loginCookie.getSecure(), logoutCookie.getSecure());

        // Domain cohérent (= valeur injectée) sur les 3 points.
        org.junit.jupiter.api.Assertions.assertEquals("mytimeline.example", loginCookie.getDomain());
        org.junit.jupiter.api.Assertions.assertEquals(loginCookie.getDomain(), refreshCookie.getDomain());
        org.junit.jupiter.api.Assertions.assertEquals(loginCookie.getDomain(), logoutCookie.getDomain());

        // HttpOnly + Path cohérents.
        org.junit.jupiter.api.Assertions.assertTrue(logoutCookie.isHttpOnly());
        org.junit.jupiter.api.Assertions.assertEquals("/", logoutCookie.getPath());
        // logout efface bien le cookie.
        org.junit.jupiter.api.Assertions.assertEquals(0, logoutCookie.getMaxAge());
    }
}
