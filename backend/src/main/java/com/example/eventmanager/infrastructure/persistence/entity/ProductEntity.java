package com.example.eventmanager.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.util.UUID;

import com.example.eventmanager.domain.models.Product;

@Entity
@Table(name = "products")
public class ProductEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String name;
    private String qrCode;

    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private CategoryEntity category;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    public Product toDomainModel() {
        return new Product(id, name, qrCode, category.toDomainModel(), user.toDomainModel());
    }

    public static ProductEntity fromDomainModel(Product product) {
        ProductEntity entity = new ProductEntity();
        entity.id = product.getId();
        entity.name = product.getName();
        entity.qrCode = product.getQrCode();
        entity.category = CategoryEntity.fromDomainModel(product.getCategory());
        entity.user = UserEntity.fromDomainModel(product.getUser());
        return entity;
    }
}