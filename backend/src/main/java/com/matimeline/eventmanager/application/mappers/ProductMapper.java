package com.matimeline.eventmanager.application.mappers;

import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;

@Component
public class ProductMapper {

  private final EventMapper eventMapper;
  private final UserMapper userMapper;
  private final CategoryMapper categoryMapper;

    @Autowired
  public ProductMapper(EventMapper eventMapper, UserMapper userMapper, CategoryMapper categoryMapper) {
      this.categoryMapper = categoryMapper;
      this.userMapper = userMapper;
      this.eventMapper = eventMapper;
  }

  public Product toDomain(ProductEntity productEntity) {
    return new Product(productEntity.getId(), productEntity.getName(), categoryMapper.toDomain(productEntity.getCategory()), userMapper.toDomain(productEntity.getUser()), 
        productEntity.getEvents().stream().map(eventMapper::toDomain).collect(Collectors.toList()));
  }

  public ProductEntity toEntity(Product product) {
    ProductEntity entity = new ProductEntity();
    if (product.getId() != null) {
        entity.setId(product.getId());
    }
    entity.setName(product.getName());
    entity.setCategory(categoryMapper.toEntity(product.getCategory()));
    entity.setUser(userMapper.toEntity(product.getUser()));
    entity.setEvents(product.getEvents().stream()
        .map(ev -> {
            EventEntity evEntity = eventMapper.toEntity(ev, entity);
            return evEntity;
        })
        .collect(Collectors.toList()));

    return entity;
  }
}
