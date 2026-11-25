package com.matimeline.eventmanager.application.policy;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.User;

/**
 * Politique de plan (issue #88) : décide si un utilisateur peut créer un événement de plus.
 * BR-EVE-011 couvre « actif = non archivé » et le quota.
 *
 * <p>Limites connues :
 * <ul>
 *   <li>Le mode hors-ligne (#76) n'existe pas encore. Quand il arrivera, ses créations devront
 *   passer par cette politique.</li>
 *   <li>Concurrence : le décompte est une lecture sans verrou, donc N créations simultanées
 *   peuvent dépasser le plafond de N-1. Accepté tant que la monétisation est désactivée, à
 *   traiter avant son activation.</li>
 *   <li>Désarchiver un événement ou restaurer un produit ne passe pas par la politique
 *   (hors périmètre de #88).</li>
 * </ul>
 */
@Component
public class PlanPolicy {

    private final boolean enabled;
    private final long freeLimit;
    private final long plusLimit;

    public PlanPolicy(@Value("${app.monetization.enabled:false}") boolean enabled,
                      @Value("${app.monetization.free-limit:20}") long freeLimit,
                      @Value("${app.monetization.plus-limit:200}") long plusLimit) {
        this.enabled = enabled;
        this.freeLimit = freeLimit;
        this.plusLimit = plusLimit;
    }

    /**
     * @param activeCount nombre d'événements actifs déjà possédés AVANT la création.
     */
    public boolean canCreateEvent(User user, long activeCount) {
        if (!enabled || user == null) {
            return true;
        }
        return switch (user.getTier()) {
            case FREE -> activeCount < freeLimit;
            case PLUS -> activeCount < plusLimit;
            case PRO -> true;
        };
    }
}
