package com.matimeline.eventmanager.infrastructure.adapters.testsupport;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;

/**
 * Canal de capture du token de réinitialisation pour les tests E2E (issue #283).
 *
 * <p>POURQUOI CET ENDPOINT EXISTE — le flux « mot de passe oublié » n'expose le token NULLE
 * PART hors de l'email : {@code POST /api/auth/forgot-password} répond 200 neutre
 * (BR-AUT-005/BR-AUT-012, anti-énumération) et {@code BrevoEmailService} est un NO-OP en
 * environnement de test (aucune {@code BREVO_API_KEY}). L'E2E Playwright lisait donc le token
 * DIRECTEMENT dans la table {@code password_reset_tokens} (migration V6), couplant la suite de
 * tests au schéma de la base. Cet endpoint remplace ce couplage par un contrat HTTP stable.
 *
 * <p>PROFIL — {@code @Profile("e2e")} et RIEN D'AUTRE. Le bean n'existe ni en {@code prod},
 * ni en {@code dev}, ni en {@code test} : le profil {@code e2e} doit être demandé
 * EXPLICITEMENT (le job CI e2e pose {@code SPRING_PROFILES_ACTIVE=dev,e2e} — liste additive
 * Spring : la config {@code dev} reste active, {@code e2e} n'AJOUTE que ce canal).
 * Garde-fous : {@code E2eTestSupportProfileTest} (absence de bean hors {@code e2e}) et
 * {@code E2eTestSupportPackageGuardTest} (toute classe de ce package porte {@code @Profile("e2e")}).
 * Défense en profondeur : hors profil {@code e2e} le chemin n'est servi par aucun controller ET
 * retombe sur la chaîne de sécurité principale ({@code anyRequest().authenticated()} → 401).
 *
 * <p>PÉRIMÈTRE — canal de SETUP de test en LECTURE SEULE. Il ne modifie rien, ne consomme pas
 * le token, et ne change RIEN au comportement de {@code POST /api/auth/forgot-password}
 * (toujours 200 systématique, traitement {@code @Async}) : l'anti-énumération du flux réel est
 * intacte. La réponse 404 ne distingue pas « compte inconnu » de « aucun token exploitable »
 * (même corps vide), pour ne pas faire de cet endpoint un oracle d'existence de compte.
 */
@RestController
@Profile("e2e")
@RequestMapping("/api/test-support")
public class E2eResetTokenController {

    private final UserRepository userRepository;
    private final E2eResetTokenFinder resetTokenFinder;
    private final Clock clock;

    public E2eResetTokenController(UserRepository userRepository,
                                   E2eResetTokenFinder resetTokenFinder,
                                   Clock clock) {
        this.userRepository = userRepository;
        this.resetTokenFinder = resetTokenFinder;
        this.clock = clock;
    }

    /**
     * Retourne le dernier token de réinitialisation exploitable du compte {@code email}.
     *
     * <p>L'INSERT du token étant {@code @Async} (le 200 de forgot-password est rendu AVANT
     * l'écriture, anti side-channel de timing), l'appelant POLL cet endpoint : 404 tant que le
     * token n'est pas écrit, 200 dès qu'il l'est. Aucune attente serveur (pas de long-poll) —
     * le budget d'attente reste côté test.
     *
     * @param email email du compte (unique, {@code uq_users_email}).
     * @return 200 {@code {"token": "<uuid>"}}, ou 404 sans corps si aucun token exploitable.
     */
    @GetMapping("/password-reset-token")
    public ResponseEntity<E2eResetTokenResponse> latestUsableResetToken(@RequestParam("email") String email) {
        Optional<UUID> token = userRepository.findDomainUserByEmail(email)
                .map(User::getId)
                .flatMap(userId -> resetTokenFinder.findLatestUsableToken(userId, LocalDateTime.now(clock)));

        return token
                .map(value -> ResponseEntity.ok(new E2eResetTokenResponse(value.toString())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Corps de réponse du canal de capture. Aucun autre champ du token (expiration, version,
     * {@code usedAt}, {@code userId}) n'est exposé — le test n'a besoin que de la valeur à
     * injecter dans {@code /reset-password?token=...}.
     */
    public record E2eResetTokenResponse(String token) {
    }
}
