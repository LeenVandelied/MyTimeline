package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.application.mappers.ProductMapper;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;

import jakarta.persistence.EntityManager;

@Repository
public class ProductRepositoryJpaImpl 
    extends SimpleJpaRepository<ProductEntity, UUID> 
    implements ProductRepository {

    private final ProductMapper productMapper;
    private final EntityManager entityManager;

    @Autowired
    public ProductRepositoryJpaImpl(
        EntityManager em,
        ProductMapper productMapper
    ) {
        super(ProductEntity.class, em);
        this.productMapper = productMapper;
        this.entityManager = em;
    }

    @Override
    public Optional<Product> findDomainProductById(UUID id) {
        return findById(id).map(productMapper::toDomain);
    }

    @Override
    public List<Product> findAllProducts() {
        return findAll().stream().map(productMapper::toDomain).toList();
    }

    @Override
    public Product save(Product domainProduct) {
        // Le domaine ne porte PAS @Version : une entité reconstruite par le mapper est
        // détachée avec version=null. La router vers persist() (SimpleJpaRepository.save,
        // isNew=true) casse un UPDATE ("uninitialized version value") ; un merge() de ce
        // graphe détaché déclenche un OptimisticLock (version null vs ligne v0).
        //
        // Pour une MISE À JOUR (id existant en base), on charge donc l'entité GÉRÉE et on
        // recopie les seuls champs mutables (name, category, archived, color). L'audit
        // (@Version/updatedAt) reste piloté par Hibernate ; les events (cascade) intacts.
        if (domainProduct.getId() != null) {
            ProductEntity managed = super.findById(domainProduct.getId()).orElse(null);
            if (managed != null) {
                managed.setName(domainProduct.getName());
                managed.setArchived(domainProduct.isArchived());
                managed.setColor(domainProduct.getColor());
                if (domainProduct.getCategory() != null && domainProduct.getCategory().getId() != null) {
                    // Référence gérée (proxy) sur la catégorie cible : évite d'attacher une
                    // CategoryEntity détachée reconstruite par le mapper.
                    managed.setCategory(entityManager.getReference(
                            CategoryEntity.class, domainProduct.getCategory().getId()));
                }
                ProductEntity flushed = super.save(managed);
                return productMapper.toDomain(flushed);
            }
        }

        // CRÉATION : entité neuve, persist géré par SimpleJpaRepository.
        ProductEntity entity = productMapper.toEntity(domainProduct);
        ProductEntity savedEntity = super.save(entity);
        return productMapper.toDomain(savedEntity);
    }

    // #52 — Requêtes NATIVES volontaires : ProductEntity porte @SQLRestriction
    // ("archived = false"), qui masque les lignes archivées des lectures et des bulk
    // ops HQL générés par Hibernate. Or pour l'intégrité FK on doit compter ET
    // réassigner AUSSI les produits archivés (sinon suppression de la catégorie =
    // violation FK sur une ligne archivée invisible). Le SQL natif contourne le
    // @SQLRestriction et opère sur TOUTES les lignes.

    @Override
    public long countByCategoryId(UUID categoryId) {
        Number count = (Number) entityManager
                .createNativeQuery("SELECT count(*) FROM products WHERE category_id = :cat")
                .setParameter("cat", categoryId)
                .getSingleResult();
        return count.longValue();
    }

    @Override
    public int updateCategoryForProducts(UUID fromCategoryId, UUID toCategoryId) {
        return entityManager
                .createNativeQuery("UPDATE products SET category_id = :to WHERE category_id = :from")
                .setParameter("to", toCategoryId)
                .setParameter("from", fromCategoryId)
                .executeUpdate();
    }

    // #78 — SQL NATIF volontaire (même raison que countByCategoryId) : @SQLRestriction
    // ("archived = false") masque les produits archivés d'un bulk DELETE HQL. Pour purger
    // TOUS les produits du user (archivés inclus) et libérer leur FK user_id avant le
    // DELETE users, on contourne le filtre en natif.
    @Override
    public int deleteAllByUserId(UUID userId) {
        return entityManager
                .createNativeQuery("DELETE FROM products WHERE user_id = :uid")
                .setParameter("uid", userId)
                .executeUpdate();
    }

}
