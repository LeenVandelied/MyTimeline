package com.matimeline.eventmanager.application.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.AccountDeletionMismatchException;
import com.matimeline.eventmanager.domain.exceptions.InvalidCredentialsException;
import com.matimeline.eventmanager.domain.exceptions.SamePasswordException;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.SessionService;
import com.matimeline.eventmanager.domain.ports.services.UserService;

import java.util.Optional;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    // #78 : purge ordonnée du graphe FK non-cascade + révocation des sessions. Ports
    // (interfaces domaine), jamais les impls concrètes (A8/DIP).
    private final EventRepository eventRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SessionService sessionService;

    @Autowired
    public UserServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           EventRepository eventRepository,
                           ProductRepository productRepository,
                           CategoryRepository categoryRepository,
                           SessionService sessionService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventRepository = eventRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.sessionService = sessionService;
    }

    @Override
    @Transactional
    public User createUser(User user) {
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateUser(User user) {
        // A15 : @Transactional aligné sur createUser. Sans transaction, une erreur
        // au milieu d'un save multi-étapes laisserait des données partiellement mises
        // à jour (cf. risque documenté #70).
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void changePassword(User caller, String oldPassword, String newPassword) {
        // A8/DIP : logique métier (vérif ancien hash + re-hash) en couche application,
        // plus dans le contrôleur. BR-AUT-005 : échec -> InvalidCredentialsException (400).
        if (!passwordEncoder.matches(oldPassword, caller.getPassword())) {
            throw new InvalidCredentialsException();
        }
        // Le nouveau mot de passe doit différer de l'ancien (vérif APRÈS le contrôle
        // BCrypt de l'ancien, donc seul un appelant légitime peut déclencher ce 400).
        if (passwordEncoder.matches(newPassword, caller.getPassword())) {
            throw new SamePasswordException();
        }
        String newHash = passwordEncoder.encode(newPassword);
        User updated = new User(
                caller.getId(),
                caller.getName(),
                caller.getUsername(),
                newHash,
                caller.getRole(),
                caller.getEmail(),
                caller.getAvatar());
        userRepository.save(updated);
    }

    @Override
    @Transactional
    public void deleteAccount(User caller, String confirmUsername) {
        // BR-AUT-001 (variante ownership) : l'identité vient du JWT (caller). La re-saisie
        // du username est une double-sécurité UX -> doit être IDENTIQUE, sinon 400. Test
        // AVANT toute écriture DB. Mismatch OU username absent/vide (déjà filtré 400 par
        // @NotBlank en amont) -> aucune donnée touchée. Message neutre (anti-énumération).
        if (confirmUsername == null || !confirmUsername.equals(caller.getUsername())) {
            throw new AccountDeletionMismatchException();
        }

        UUID userId = caller.getId();

        // Purge ordonnée dans CETTE transaction (atomique : un échec -> rollback total,
        // pas de suppression à mi-chemin). Ordre imposé par les FK non-cascade (V1/V8) :
        //   1. events   : product_id NOT NULL -> avant products (appartenance transitive
        //                  via products.user_id, archivés inclus, SQL natif).
        //   2. products : user_id, archivés inclus (SQL natif contourne @SQLRestriction).
        //   3. categories possédées (owner_id = user) -> après products (category_id NOT
        //      NULL). Les catégories SYSTÈME (owner_id NULL) sont PRÉSERVÉES.
        //   4. user.
        // Les FK sessions (V10) / password_reset_tokens (V6) sont ON DELETE CASCADE ->
        // purgées par Postgres au DELETE users. La révocation explicite ci-dessous
        // neutralise en plus le jti courant côté serveur (JwtFilter -> 401) AVANT que la
        // ligne session disparaisse, cohérent BR-AUT-010/011.
        sessionService.revokeAllSessions(userId);
        eventRepository.deleteAllByUserId(userId);
        productRepository.deleteAllByUserId(userId);
        categoryRepository.deleteAllByOwnerId(userId);
        userRepository.deleteById(userId);

        // POLITIQUE DE RÉTENTION (RGPD art. 17) : la suppression ci-dessus est PHYSIQUE et
        // IRRÉVERSIBLE pour les données de compte (users, products, events, categories
        // possédées) et les sessions. Ce qui N'EST PAS purgé ici et relève d'une rétention
        // distincte, documentée :
        //   - Logs applicatifs / accès (stdout, reverse-proxy) : susceptibles de contenir
        //     un user_id ou un username. Rétention limitée par la politique d'infra
        //     (rotation), hors périmètre transactionnel. Ne JAMAIS journaliser de PII
        //     supplémentaire au moment de la suppression.
        //   - Analytics / métriques agrégées : ne stockent pas d'identifiant nominatif
        //     (ou pseudonymisé), donc non concernées par l'effacement individuel.
        // Aucune copie de sauvegarde n'est restaurée pour re-matérialiser le compte.
    }

    @Override
    public Optional<User> findDomainUserById(UUID id) {
        return userRepository.findDomainUserById(id);
    }

    @Override
    public Optional<User> findDomainUserByUsername(String username) {
        return userRepository.findDomainUserByUsername(username);
    }

    @Override
    public Optional<User> findDomainUserByEmail(String email) {
        return userRepository.findDomainUserByEmail(email);
    }
} 