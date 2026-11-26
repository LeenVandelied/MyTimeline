package com.matimeline.eventmanager.application.services;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.application.policy.PlanPolicy;
import com.matimeline.eventmanager.domain.exceptions.CategoryNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.EventQuotaExceededException;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.UserNotFoundException;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.ProductCreateCommand;
import com.matimeline.eventmanager.domain.models.ProductUpdateCommand;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.utils.Utils;

@Service
public class ProductServiceImpl implements ProductService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final PlanPolicy planPolicy;

    @Autowired
    public ProductServiceImpl(ProductRepository productRepository,
                          EventRepository eventRepository,
                          CategoryRepository categoryRepository,
                          UserRepository userRepository,
                          PlanPolicy planPolicy) {
        this.productRepository = productRepository;
        this.eventRepository = eventRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.planPolicy = planPolicy;
    }

    @Override
    @Transactional
    public Product createProduct(ProductCreateCommand command) {
        User user = userRepository.findDomainUserById(command.userId())
                .orElseThrow(() -> new UserNotFoundException(command.userId()));

        // #50 (faille cross-tenant) : la catégorie cible doit appartenir à l'appelant
        // OU être système (ownerId == null). Sinon -> 404 (anti-énumération).
        Category category = resolveAssignableCategory(command.categoryId(), user.getId());

        // #88 : quota vérifié avant toute persistance (après la catégorie). Le rang dans le lot s'ajoute au décompte
        // possédé, pour qu'un lot ne dépasse pas le plafond. Un refus refuse toute la création.
        int batchSize = Optional.ofNullable(command.events()).orElseGet(List::of).size();
        if (batchSize > 0) {
            long owned = eventRepository.countActiveByUserId(user.getId());
            for (int rank = 0; rank < batchSize; rank++) {
                if (!planPolicy.canCreateEvent(user, owned + rank)) {
                    throw new EventQuotaExceededException(user.getId());
                }
            }
        }

        // PIT-S10-003 / convention create : id NULL à la création. ProductEntity porte
        // @Version + @GeneratedValue(AUTO) ; un id pré-assigné route persist() vers l'état
        // « détaché » (Hibernate 6.4 : "detached entity with generated id has an
        // uninitialized version value null") et casse l'INSERT réel Postgres. En laissant
        // l'id à null, @GeneratedValue l'attribue et @Version s'initialise (aligné sur
        // CategoryServiceImpl : new Category(null, ...)).
        Product product = new Product(null, command.name(), category, user, new ArrayList<>());
        // #158 : surcharge couleur produit (null = héritage de la catégorie côté front).
        product.setColor(command.color());

        // #186 (BR-PRO-005) : un produit SANS événement est autorisé. events() peut être
        // null (la commande vient d'un DTO sans @NotNull ; Zod z.array sans .min(1)) -> null
        // traité comme liste vide pour éviter la NPE (500). Le produit est déjà construit avec 0 event (L63).
        Optional.ofNullable(command.events()).orElseGet(List::of).forEach(eventCommand -> {
            LocalDate startDate = (eventCommand.date() != null) ? eventCommand.date() : LocalDate.now();
    
            // id NULL (idem product) : l'EventEntity imbriquée est persistée en cascade,
            // @GeneratedValue attribue l'id et @Version l'initialise. Un id pré-assigné
            // reproduirait la PropertyValueException "detached entity ... uninitialized
            // version" sur l'insert de l'event. Le lien au produit passe par l'objet parent
            // (ProductMapper.toEntity), pas par ce productId (null ici, sans effet).
            Event event = new Event(
                    null,
                    eventCommand.name(),
                    eventCommand.type(),
                    eventCommand.durationValue(),
                    eventCommand.durationUnit(),
                    eventCommand.isRecurring(),
                    RecurrenceUnit.fromString(eventCommand.recurrenceUnit()),
                    startDate,
                    Utils.calculateEndDate(eventCommand.type(), eventCommand.durationValue(),
                            eventCommand.durationUnit(), startDate),
                    product.getId(),
                    eventCommand.isAllDay()
            );
            product.addEvent(event);
        });
    
        return productRepository.save(product);
    }

    /**
     * Liste des produits de l'utilisateur (endpoint principal {@code GET
     * /users/{userId}/products}).
     *
     * <p>#124 : le filtrage par {@code userId} est fait EN SQL via
     * {@link ProductRepository#findByUserId} ({@code WHERE user_id = ?}, index
     * {@code idx_products_user}) — remplace l'ancien {@code findAllProducts()} + filtre
     * Java (full scan O(N)).
     *
     * <p>#41 : le filtre {@code Product::hasEvents} est SUPPRIMÉ — un produit existe
     * indépendamment de ses événements (règle métier), donc un produit SANS événement
     * est désormais visible. Sa liste {@code events} est vide (jamais {@code null} :
     * garanti par {@code ProductMapper.toDomain} puis {@code ProductResponse.fromDomain}).
     */
    @Override
    @Transactional(readOnly = true)
    public List<Product> getProductsByUser(UUID userId) {
        return productRepository.findByUserId(userId);
    }

    @Override
    @Transactional
    public Product updateProduct(UUID id, ProductUpdateCommand command) {
        Product product = productRepository.findDomainProductById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));

        if (command.name() != null) {
            product.setName(command.name());
        }

        if (command.categoryId() != null) {
            // #50 (faille cross-tenant) : l'ownership du produit est déjà garanti au niveau
            // controller (path == JWT). On valide donc la catégorie cible contre le
            // propriétaire du produit chargé -> catégorie d'autrui traitée comme inexistante (404).
            Category category = resolveAssignableCategory(command.categoryId(), product.getUser().getId());
            product.setCategory(category);
        }

        // #158 : surcharge couleur produit. clearColor prime (reset -> null = ré-héritage
        // catégorie) ; sinon un color non-null pose la surcharge ; color null = inchangé.
        if (command.clearColor()) {
            product.setColor(null);
        } else if (command.color() != null) {
            product.setColor(command.color());
        }

        return productRepository.save(product);
    }

    /**
     * #50 (faille cross-tenant + oracle d'énumération) : une catégorie n'est assignable
     * à un produit que si elle est possédée par l'appelant OU système (ownerId == null).
     * Une catégorie possédée par un autre utilisateur est traitée comme INEXISTANTE du
     * point de vue de l'appelant -> {@link CategoryNotFoundException} (404). Le choix du
     * 404 (et non 403) ferme l'oracle : un 403 confirmerait l'existence de l'UUID.
     */
    private Category resolveAssignableCategory(UUID categoryId, UUID callerId) {
        Category category = categoryRepository.findDomainCategoryById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
        UUID owner = category.getOwnerId();
        if (owner != null && !owner.equals(callerId)) {
            throw new CategoryNotFoundException(categoryId);
        }
        return category;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Product> findDomainProductById(UUID id) {
        return productRepository.findDomainProductById(id);
    }

    @Override
    @Transactional
    public void archiveById(UUID id) {
        Product product = productRepository.findDomainProductById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
        product.setArchived(true);
        productRepository.save(product);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Product> getArchivedProducts(UUID userId) {
        return productRepository.findArchivedByUserId(userId);
    }

    /**
     * #711 — Désarchivage. L'ownership n'est PAS vérifié par une lecture préalable : un
     * produit archivé est introuvable par {@code findDomainProductById} (@SQLRestriction).
     * Il est porté par le WHERE de l'UPDATE natif (id + user_id + archived = true) ; 0 ligne
     * = 404 uniforme (BR-PRO-011).
     */
    @Override
    @Transactional
    public void restoreProduct(UUID productId, UUID userId) {
        int restored = productRepository.restoreArchivedByIdAndUserId(productId, userId);
        if (restored == 0) {
            throw new ProductNotFoundException(productId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Product getArchivedProductDetail(UUID productId, UUID userId) {
        return productRepository.findArchivedDetailByIdAndUserId(productId, userId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID id) {
        return productRepository.existsById(id);
    }
}