package com.matimeline.eventmanager.application.services;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.UserNotFoundException;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;

/**
 * Agrège le snapshot RGPD d'un utilisateur (#58) depuis les repositories existants, partagé
 * par le chemin synchrone ({@code ExportServiceImpl}) et le worker async
 * ({@code AsyncExportRunner}) — assemblage unique, pas de duplication.
 *
 * <p>Périmètre (ADR-003) : profil + produits (actifs, événements pré-chargés) + catégories
 * POSSÉDÉES. Les catégories SYSTÈME ({@code ownerId == null}) sont exclues ici (partagées,
 * pas des données personnelles). L'assemblage champ-par-champ vers {@link UserDataExport}
 * garantit qu'aucun secret (password hash) ne fuit.
 */
@Component
public class UserDataExportAssembler {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final Clock clock;

    public UserDataExportAssembler(UserRepository userRepository,
                                   ProductRepository productRepository,
                                   CategoryRepository categoryRepository,
                                   Clock clock) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.clock = clock;
    }

    /**
     * @throws UserNotFoundException si {@code ownerId} ne correspond à aucun utilisateur.
     */
    @Transactional(readOnly = true)
    public UserDataExport assemble(UUID ownerId) {
        User user = userRepository.findDomainUserById(ownerId)
                .orElseThrow(() -> new UserNotFoundException(ownerId));

        List<Product> products = productRepository.findByUserId(ownerId);

        // findByOwnerIdOrSystem remonte owned + système : on ne garde QUE les possédées.
        List<Category> ownedCategories = categoryRepository.findByOwnerIdOrSystem(ownerId).stream()
                .filter(category -> ownerId.equals(category.getOwnerId()))
                .toList();

        return UserDataExport.assemble(user, products, ownedCategories, LocalDateTime.now(clock));
    }
}
