package com.matimeline.eventmanager.application.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Implémentation de {@link StrongPassword} (BR-AUT-003, #148).
 *
 * <p>Volontairement écrit sans regex composée : les trois critères sont
 * indépendants et lisibles, et un balayage unique évite le backtracking d'une
 * regex à lookaheads sur une entrée contrôlée par le client.
 */
public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    /** Longueur minimale de la politique (BR-AUT-003, durcie de 6 -> 8 par #148). */
    public static final int MIN_LENGTH = 8;

    /** Borne haute alignée sur {@code AuthRequest} : au-delà, le login refuserait la saisie. */
    public static final int MAX_LENGTH = 100;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // null -> délégué à @NotBlank (convention Bean Validation : un validateur
        // ne se prononce pas sur l'absence de valeur).
        if (value == null) {
            return true;
        }
        if (value.length() < MIN_LENGTH || value.length() > MAX_LENGTH) {
            return false;
        }
        boolean hasUppercase = false;
        boolean hasDigit = false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isUpperCase(c)) {
                hasUppercase = true;
            } else if (Character.isDigit(c)) {
                hasDigit = true;
            }
            if (hasUppercase && hasDigit) {
                return true;
            }
        }
        return false;
    }
}
