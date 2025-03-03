package com.example.eventmanager.infrastructure.persistence.jpa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.eventmanager.domain.models.Product;
import com.example.eventmanager.domain.repositories.ProductRepository;
import com.example.eventmanager.infrastructure.persistence.entity.ProductEntity;

@Repository
public interface ProductRepositoryJpa extends JpaRepository<ProductEntity, UUID>, ProductRepository {
    Optional<ProductEntity> findByQrCode(String qrCode);

    @Override
    default Optional<Product> findDomainProductById(UUID id) {
        return findById(id).map(ProductEntity::toDomainModel);
    }

    @Override
    default Optional<Product> findDomainProductByQrCode(String qrCode) {
        return findByQrCode(qrCode).map(ProductEntity::toDomainModel);
    }

    @Override
    default List<Product> findAllProducts() {
        return findAll().stream().map(ProductEntity::toDomainModel).toList();
    }

    @Override
    default Product save(Product product) {
        return save(ProductEntity.fromDomainModel(product)).toDomainModel();
    }

}
