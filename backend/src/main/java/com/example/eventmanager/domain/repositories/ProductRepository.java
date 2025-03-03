package com.example.eventmanager.domain.repositories;

import com.example.eventmanager.domain.models.Product;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository {
    Optional<Product> findDomainProductById(UUID id);
    Optional<Product> findDomainProductByQrCode(String qrCode);
    List<Product> findAllProducts();
    Product save(Product product);
    void deleteById(UUID id);
    boolean existsById(UUID id);
}