package com.matimeline.eventmanager.application.policy;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.models.UserTier;

/**
 * #88 : politique de plan, sans contexte Spring. {@code canCreateEvent(user, activeCount)} :
 * activeCount = événements actifs déjà possédés AVANT la création (plafond 20 : 19 accepte,
 * 20 refuse). Constructeur : (monetizationEnabled, freeLimit, plusLimit), alimenté par
 * app.monetization.enabled / free-limit / plus-limit.
 */
class PlanPolicyTest {

    private static User userWithTier(UserTier tier) {
        return new User(UUID.randomUUID(), "Name", "username", "pwd", "ROLE_USER", "u@example.test")
                .withTier(tier);
    }

    @Test
    void canCreateEvent_alwaysTrue_whenMonetizationDisabled() {
        PlanPolicy policy = new PlanPolicy(false, 20, 200);

        assertThat(policy.canCreateEvent(userWithTier(UserTier.FREE), 1_000_000L)).isTrue();
    }

    @Test
    void limitsAreReadFromConfiguration_perTier() {
        PlanPolicy small = new PlanPolicy(true, 3, 7);

        assertThat(small.canCreateEvent(userWithTier(UserTier.FREE), 2)).isTrue();
        assertThat(small.canCreateEvent(userWithTier(UserTier.FREE), 3)).isFalse();
        assertThat(small.canCreateEvent(userWithTier(UserTier.PLUS), 6)).isTrue();
        assertThat(small.canCreateEvent(userWithTier(UserTier.PLUS), 7)).isFalse();

        // Autre configuration : les plafonds suivent la configuration, pas une valeur figée.
        PlanPolicy large = new PlanPolicy(true, 50, 60);

        assertThat(large.canCreateEvent(userWithTier(UserTier.FREE), 49)).isTrue();
        assertThat(large.canCreateEvent(userWithTier(UserTier.FREE), 50)).isFalse();
        assertThat(large.canCreateEvent(userWithTier(UserTier.PLUS), 59)).isTrue();
        assertThat(large.canCreateEvent(userWithTier(UserTier.PLUS), 60)).isFalse();
    }

    @Test
    void freeTier_acceptsTwentiethEvent_refusesTwentyFirst() {
        PlanPolicy policy = new PlanPolicy(true, 20, 200);
        User free = userWithTier(UserTier.FREE);

        // 19 déjà possédés : la création du 20e est acceptée.
        assertThat(policy.canCreateEvent(free, 19)).isTrue();
        // 20 déjà possédés : la création du 21e est refusée.
        assertThat(policy.canCreateEvent(free, 20)).isFalse();
    }

    @Test
    void proTier_isNeverLimited() {
        PlanPolicy policy = new PlanPolicy(true, 20, 200);
        User pro = userWithTier(UserTier.PRO);

        assertThat(policy.canCreateEvent(pro, 5_000)).isTrue();
        assertThat(policy.canCreateEvent(pro, 1_000_000L)).isTrue();
    }
}
