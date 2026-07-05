package com.matimeline.eventmanager.application.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.mockito.ArgumentCaptor;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.matimeline.eventmanager.application.dtos.ProductCreationRequest;
import com.matimeline.eventmanager.application.dtos.ProductUpdateRequest;
import com.matimeline.eventmanager.domain.exceptions.CategoryNotFoundException;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;

/**
 * #50 (faille cross-tenant category linkage + oracle d'énumération).
 * Une catégorie n'est assignable à un produit (create/update) QUE si elle est possédée
 * par l'appelant OU système (ownerId == null). Une catégorie d'autrui est traitée comme
 * INEXISTANTE -> CategoryNotFoundException (404, anti-énumération : pas de 403 qui
 * confirmerait l'ID).
 */
@ExtendWith(MockitoExtension.class)
class ProductServiceImplTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private EventRepository eventRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private UserRepository userRepository;

    private ProductServiceImpl service;

    private UUID callerId;
    private UUID otherUserId;
    private UUID categoryId;
    private UUID productId;
    private User caller;

    @BeforeEach
    void setUp() {
        service = new ProductServiceImpl(productRepository, eventRepository, categoryRepository, userRepository);
        callerId = UUID.randomUUID();
        otherUserId = UUID.randomUUID();
        categoryId = UUID.randomUUID();
        productId = UUID.randomUUID();
        caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
    }

    private ProductCreationRequest creationRequest() {
        ProductCreationRequest request = new ProductCreationRequest();
        request.setName("Produit");
        request.setUserId(callerId);
        request.setCategory(categoryId);
        request.setEvents(new ArrayList<>());
        return request;
    }

    // -------------------------------------------------------------------------
    // createProduct
    // -------------------------------------------------------------------------

    /** Catégorie appartenant à un AUTRE user -> 404 (CategoryNotFoundException), aucun save. */
    @Test
    void createProduct_categoryOwnedByAnotherUser_throwsCategoryNotFound_andDoesNotSave() {
        Category foreignCategory = new Category(categoryId, "Autrui", "#000", "desc", otherUserId);

        when(userRepository.findDomainUserById(callerId)).thenReturn(Optional.of(caller));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(foreignCategory));

        assertThatThrownBy(() -> service.createProduct(creationRequest()))
                .isInstanceOf(CategoryNotFoundException.class);

        verify(productRepository, never()).save(any());
    }

    /** Catégorie système (ownerId == null) -> OK. */
    @Test
    void createProduct_systemCategory_succeeds() {
        Category systemCategory = new Category(categoryId, "Système", "#000", "desc", null);
        Product saved = new Product(productId, "Produit", systemCategory, caller, new ArrayList<>());

        when(userRepository.findDomainUserById(callerId)).thenReturn(Optional.of(caller));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(systemCategory));
        when(productRepository.save(any(Product.class))).thenReturn(saved);

        Product result = service.createProduct(creationRequest());

        assertThat(result).isNotNull();
        verify(productRepository).save(any(Product.class));
    }

    /** Sa propre catégorie -> OK. */
    @Test
    void createProduct_ownCategory_succeeds() {
        Category ownCategory = new Category(categoryId, "Mienne", "#000", "desc", callerId);
        Product saved = new Product(productId, "Produit", ownCategory, caller, new ArrayList<>());

        when(userRepository.findDomainUserById(callerId)).thenReturn(Optional.of(caller));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(ownCategory));
        when(productRepository.save(any(Product.class))).thenReturn(saved);

        Product result = service.createProduct(creationRequest());

        assertThat(result).isNotNull();
        verify(productRepository).save(any(Product.class));
    }

    /**
     * #186 (BR-PRO-005) : produit SANS événement autorisé. events == null ne doit PAS
     * lever de NPE -> null traité comme liste vide, produit persisté avec 0 event.
     */
    @Test
    void createProduct_nullEvents_doesNotThrow_savesProductWithNoEvents() {
        Category ownCategory = new Category(categoryId, "Mienne", "#abcdef", "desc", callerId);

        when(userRepository.findDomainUserById(callerId)).thenReturn(Optional.of(caller));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(ownCategory));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        ProductCreationRequest request = creationRequest();
        request.setEvents(null); // BR-PRO-005 : liste nulle tolérée (0 event)

        Product result = service.createProduct(request);

        assertThat(result).isNotNull();
        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(captor.capture());
        assertThat(captor.getValue().hasEvents()).isFalse();
    }

    // -------------------------------------------------------------------------
    // updateProduct (PATCH categoryId)
    // -------------------------------------------------------------------------

    /** categoryId d'un AUTRE user -> 404, catégorie du produit inchangée, aucun save. */
    @Test
    void updateProduct_categoryOwnedByAnotherUser_throwsCategoryNotFound_andLeavesProductUnchanged() {
        Category currentCategory = new Category(UUID.randomUUID(), "Actuelle", "#000", "desc", callerId);
        Product product = new Product(productId, "Produit", currentCategory, caller, new ArrayList<>());
        Category foreignCategory = new Category(categoryId, "Autrui", "#000", "desc", otherUserId);

        when(productRepository.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(foreignCategory));

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setCategoryId(categoryId);

        assertThatThrownBy(() -> service.updateProduct(productId, request))
                .isInstanceOf(CategoryNotFoundException.class);

        assertThat(product.getCategory()).isSameAs(currentCategory);
        verify(productRepository, never()).save(any());
    }

    /** categoryId vers catégorie système -> OK, catégorie réassignée. */
    @Test
    void updateProduct_toSystemCategory_succeeds() {
        Category currentCategory = new Category(UUID.randomUUID(), "Actuelle", "#000", "desc", callerId);
        Product product = new Product(productId, "Produit", currentCategory, caller, new ArrayList<>());
        Category systemCategory = new Category(categoryId, "Système", "#000", "desc", null);

        when(productRepository.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(systemCategory));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setCategoryId(categoryId);

        service.updateProduct(productId, request);

        assertThat(product.getCategory()).isSameAs(systemCategory);
        verify(productRepository).save(product);
    }

    /** categoryId vers sa propre catégorie -> OK, catégorie réassignée. */
    @Test
    void updateProduct_toOwnCategory_succeeds() {
        Category currentCategory = new Category(UUID.randomUUID(), "Actuelle", "#000", "desc", callerId);
        Product product = new Product(productId, "Produit", currentCategory, caller, new ArrayList<>());
        Category ownCategory = new Category(categoryId, "Mienne", "#000", "desc", callerId);

        when(productRepository.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(ownCategory));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setCategoryId(categoryId);

        service.updateProduct(productId, request);

        assertThat(product.getCategory()).isSameAs(ownCategory);
        verify(productRepository).save(product);
    }

    // -------------------------------------------------------------------------
    // #158 — couleur produit (BR-PRO-001/002/009/010, follow-up S11 #61)
    // -------------------------------------------------------------------------

    /** color null à la création -> produit persisté avec color=null (héritage catégorie côté front). */
    @Test
    void createProduct_nullColor_persistsNullColor_inheritsCategory() {
        Category ownCategory = new Category(categoryId, "Mienne", "#abcdef", "desc", callerId);

        when(userRepository.findDomainUserById(callerId)).thenReturn(Optional.of(caller));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(ownCategory));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createProduct(creationRequest()); // creationRequest() ne pose pas de color

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(captor.capture());
        assertThat(captor.getValue().getColor()).isNull();
    }

    /** color fournie à la création -> surcharge persistée telle quelle. */
    @Test
    void createProduct_withColor_persistsOverride() {
        Category ownCategory = new Category(categoryId, "Mienne", "#abcdef", "desc", callerId);

        when(userRepository.findDomainUserById(callerId)).thenReturn(Optional.of(caller));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(ownCategory));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        ProductCreationRequest request = creationRequest();
        request.setColor("#123456");

        service.createProduct(request);

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(captor.capture());
        assertThat(captor.getValue().getColor()).isEqualTo("#123456");
    }

    /** PATCH color non-null -> pose la surcharge sur l'entité chargée. */
    @Test
    void updateProduct_withColor_setsOverride() {
        Category currentCategory = new Category(UUID.randomUUID(), "Actuelle", "#000000", "desc", callerId);
        Product product = new Product(productId, "Produit", currentCategory, caller, new ArrayList<>());

        when(productRepository.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setColor("#ff8800");

        service.updateProduct(productId, request);

        assertThat(product.getColor()).isEqualTo("#ff8800");
        verify(productRepository).save(product);
    }

    /** PATCH clearColor=true -> réinitialise la surcharge (color -> null, ré-héritage). */
    @Test
    void updateProduct_clearColor_resetsToInherit() {
        Category currentCategory = new Category(UUID.randomUUID(), "Actuelle", "#000000", "desc", callerId);
        Product product = new Product(productId, "Produit", currentCategory, caller, new ArrayList<>());
        product.setColor("#ff8800"); // surcharge existante

        when(productRepository.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setClearColor(true);

        service.updateProduct(productId, request);

        assertThat(product.getColor()).isNull();
        verify(productRepository).save(product);
    }

    /** PATCH sans color ni clearColor -> couleur inchangée. */
    @Test
    void updateProduct_colorAbsent_leavesColorUnchanged() {
        Category currentCategory = new Category(UUID.randomUUID(), "Actuelle", "#000000", "desc", callerId);
        Product product = new Product(productId, "Produit", currentCategory, caller, new ArrayList<>());
        product.setColor("#ff8800");

        when(productRepository.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setName("Renommé");

        service.updateProduct(productId, request);

        assertThat(product.getColor()).isEqualTo("#ff8800");
        verify(productRepository).save(product);
    }

    /** clearColor=true prime sur un color fourni simultanément (reset). */
    @Test
    void updateProduct_clearColorWinsOverProvidedColor() {
        Category currentCategory = new Category(UUID.randomUUID(), "Actuelle", "#000000", "desc", callerId);
        Product product = new Product(productId, "Produit", currentCategory, caller, new ArrayList<>());
        product.setColor("#ff8800");

        when(productRepository.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setColor("#123456");
        request.setClearColor(true);

        service.updateProduct(productId, request);

        assertThat(product.getColor()).isNull();
        verify(productRepository).save(product);
    }
}
