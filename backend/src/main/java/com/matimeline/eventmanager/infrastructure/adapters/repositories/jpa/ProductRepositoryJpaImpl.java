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
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;

import jakarta.persistence.EntityManager;

@Repository
public class ProductRepositoryJpaImpl 
    extends SimpleJpaRepository<ProductEntity, UUID> 
    implements ProductRepository {

    private final ProductMapper productMapper;

    @Autowired
    public ProductRepositoryJpaImpl(
        EntityManager em,
        ProductMapper productMapper
    ) {
        super(ProductEntity.class, em);
        this.productMapper = productMapper;
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
        ProductEntity entity = productMapper.toEntity(domainProduct);
        ProductEntity savedEntity = super.save(entity);

        return productMapper.toDomain(savedEntity);
    }

}
