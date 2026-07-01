package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.application.mappers.CategoryMapper;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;

import jakarta.persistence.EntityManager;

@Repository
public class CategoryRepositoryJpaImpl
    extends SimpleJpaRepository<CategoryEntity, UUID>
    implements CategoryRepository {

    private final EntityManager entityManager;
    private final CategoryMapper categoryMapper;

    @Autowired
    public CategoryRepositoryJpaImpl(EntityManager em, CategoryMapper categoryMapper) {
        super(CategoryEntity.class, em);
        this.entityManager = em;
        this.categoryMapper = categoryMapper;
    }

    @Override
    public Optional<Category> findDomainCategoryById(UUID id) {
        return super.findById(id)
            .map(categoryMapper::toDomain);
    }

    @Override
    public Optional<Category> findDomainCategoryByName(String name) {
        // Legacy (non scopé owner) — conservé pour compatibilité. L'unicité effective
        // passe par findByOwnerAndName (BR-CAT-004). AP-CAT-08 : on borne le résultat
        // pour ne plus dépendre d'un get(0) implicite sur une liste.
        List<CategoryEntity> results = entityManager
            .createQuery("SELECT c FROM CategoryEntity c WHERE c.name = :catName", CategoryEntity.class)
            .setParameter("catName", name)
            .setMaxResults(1)
            .getResultList();

        return results.isEmpty()
            ? Optional.empty()
            : Optional.of(categoryMapper.toDomain(results.get(0)));
    }

    @Override
    public Optional<Category> findByOwnerAndName(UUID ownerId, String name) {
        // #52 (BR-CAT-004) : unicité PAR UTILISATEUR. owner NULL == catégorie système :
        // aucun utilisateur n'en crée via l'API après V8, donc ce chemin ne cible que
        // les catégories possédées (ownerId non null attendu ici).
        List<CategoryEntity> results = entityManager
            .createQuery(
                "SELECT c FROM CategoryEntity c WHERE c.owner.id = :ownerId AND c.name = :catName",
                CategoryEntity.class)
            .setParameter("ownerId", ownerId)
            .setParameter("catName", name)
            .setMaxResults(1)
            .getResultList();

        return results.isEmpty()
            ? Optional.empty()
            : Optional.of(categoryMapper.toDomain(results.get(0)));
    }

    @Override
    public List<Category> findAllCategories() {
        return super.findAll().stream()
            .map(categoryMapper::toDomain)
            .toList();
    }

    @Override
    public Category save(Category domainCategory) {
        // Pitfall hérité de #50 : le domaine Category ne porte pas @Version. Reconstruire
        // une CategoryEntity détachée (version=null) et la router vers save()/merge()
        // casse un UPDATE (uninitialized version / OptimisticLock). Pour une MISE À JOUR
        // (id existant en base) on charge donc l'entité GÉRÉE et on recopie les seuls
        // champs mutables ; l'audit (@Version/updatedAt) reste piloté par Hibernate.
        if (domainCategory.getId() != null) {
            CategoryEntity managed = super.findById(domainCategory.getId()).orElse(null);
            if (managed != null) {
                managed.setName(domainCategory.getName());
                managed.setColor(domainCategory.getColor());
                managed.setDescription(domainCategory.getDescription());
                applyOwner(managed, domainCategory.getOwnerId());
                CategoryEntity flushed = super.save(managed);
                return categoryMapper.toDomain(flushed);
            }
        }

        // CRÉATION : entité neuve. L'owner est rattaché via une référence GÉRÉE
        // (getReference) pour ne pas attacher un UserEntity détaché.
        CategoryEntity entity = categoryMapper.toEntity(domainCategory);
        applyOwner(entity, domainCategory.getOwnerId());
        CategoryEntity saved = super.save(entity);
        return categoryMapper.toDomain(saved);
    }

    /**
     * Rattache (ou détache) le propriétaire à partir de son id, via une référence
     * gérée. ownerId NULL -> catégorie système (owner NULL).
     */
    private void applyOwner(CategoryEntity entity, UUID ownerId) {
        if (ownerId == null) {
            entity.setOwner(null);
        } else {
            entity.setOwner(entityManager.getReference(UserEntity.class, ownerId));
        }
    }
}
