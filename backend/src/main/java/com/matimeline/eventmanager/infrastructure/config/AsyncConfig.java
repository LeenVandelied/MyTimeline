package com.matimeline.eventmanager.infrastructure.config;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Configuration de l'exécution asynchrone (review S8, fix BR-AUT-005 timing).
 *
 * <p>Active {@code @Async} et fournit l'executor dédié au flux "mot de passe oublié".
 * Objectif anti-énumération par timing : le endpoint {@code forgot-password} doit
 * répondre 200 en temps quasi constant que l'email existe ou non. Sans async, la
 * branche "email connu" exécute lookup + INSERT + appel HTTP Brevo (centaines de ms)
 * sur le thread de requête, tandis que la branche "email inconnu" retourne
 * immédiatement : ce différentiel de latence est un side-channel mesurable.
 *
 * <p>En déportant tout le traitement sur cet executor, le contrôleur rend la main
 * tout de suite dans les deux cas (latence indistinguable côté client).
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Executor du flux de réinitialisation de mot de passe. Pool borné : le travail
     * est court (1 INSERT + 1 POST HTTP) et le volume faible. La queue absorbe les
     * pics sans saturer ; le rejet par défaut (CallerRunsPolicy à saturation) ne
     * compromet pas l'anti-énumération car il s'appliquerait uniformément.
     */
    @Bean(name = "passwordResetExecutor")
    public Executor passwordResetExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("pwd-reset-");
        executor.initialize();
        return executor;
    }

    /**
     * Executor des jobs d'export RGPD asynchrones (#58, ADR-003 — ZIP/CSV). Pool borné : la
     * génération (agrégation + rendu + écriture disque) est modérément coûteuse et le volume
     * faible (action manuelle utilisateur). La queue absorbe les pics ; à saturation, la
     * {@link ThreadPoolExecutor.CallerRunsPolicy} configurée explicitement applique un
     * backpressure (la tâche s'exécute sur le thread appelant) sans perdre de job — le défaut
     * Spring ({@code AbortPolicy}) rejetterait la tâche et laisserait le job PENDING orphelin.
     */
    @Bean(name = "exportExecutor")
    public Executor exportExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("export-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
