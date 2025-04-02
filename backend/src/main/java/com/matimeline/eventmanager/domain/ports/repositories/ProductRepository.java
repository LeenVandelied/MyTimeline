package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.domain.models.Product;

@Repository
public interface ProductRepository {
    Optional<Product> findDomainProductById(UUID id);
    List<Product> findAllProducts();
    Product save(Product product);
    void deleteById(UUID id);
    boolean existsById(UUID id);
}