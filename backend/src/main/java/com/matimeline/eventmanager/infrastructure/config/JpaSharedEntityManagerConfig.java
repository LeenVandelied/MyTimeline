package com.matimeline.eventmanager.infrastructure.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Fallback;
import org.springframework.orm.jpa.SharedEntityManagerCreator;

/**
 * EntityManager partagé de repli (#886, Spring Boot 4 / Spring Framework 7).
 *
 * <p>Depuis Spring 7, le bean {@code jpaSharedEM_entityManagerFactory} de Spring Data n'est plus
 * candidat à l'injection : c'est le FactoryBean {@code entityManagerFactory} lui-même qui fournit
 * l'{@link EntityManager} injecté. Or un FactoryBean pas encore instancié n'est reconnu que par son
 * type principal ({@link EntityManagerFactory}). Au démarrage de Tomcat, les filtres de sécurité
 * ({@code JwtFilter} → {@code UserDetailsService} → adaptateurs JPA) sont créés AVANT la fabrique :
 * l'injection d'{@code EntityManager} échouait alors (« No qualifying bean »), au boot réel comme
 * dans les tests {@code RANDOM_PORT}, mais pas sous MockMvc.
 *
 * <p>Ce bean comble ce créneau. {@link Fallback} : une fois la fabrique instanciée, son
 * EntityManager (primaire) reste prioritaire ; les deux sont des proxys partagés de la même
 * fabrique, donc transactionnellement équivalents.
 */
@Configuration
public class JpaSharedEntityManagerConfig {

    @Bean
    @Fallback
    public EntityManager sharedEntityManager(EntityManagerFactory entityManagerFactory) {
        return SharedEntityManagerCreator.createSharedEntityManager(entityManagerFactory);
    }
}
