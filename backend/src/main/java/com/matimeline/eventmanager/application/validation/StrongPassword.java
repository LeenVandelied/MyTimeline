package com.matimeline.eventmanager.application.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * Politique de mot de passe unique de l'application (BR-AUT-003, #148).
 *
 * <p>Le backend est la SOURCE DE VÉRITÉ : au moins 8 caractères, au moins une
 * majuscule et au moins un chiffre, au plus 100 caractères (borne alignée sur
 * {@code AuthRequest} pour qu'un mot de passe acceptable à la création reste
 * saisissable au login). Les schémas Zod frontend
 * ({@code frontend/src/lib/schemas/auth.ts}, {@code settings.ts}) répliquent
 * exactement cette règle — toute modification ici doit y être reportée.
 *
 * <p><strong>Périmètre : CRÉATION / MODIFICATION uniquement</strong>
 * ({@code RegisterRequest}, {@code ResetPasswordRequest},
 * {@code ChangePasswordRequest}). Cette annotation NE DOIT JAMAIS être posée sur
 * le chemin d'authentification ({@code AuthRequest#password}) : les comptes
 * créés avant #148 ont des mots de passe à 6 caractères et doivent continuer à
 * se connecter. Le durcissement s'applique au prochain changement de mot de passe.
 *
 * <p>La valeur {@code null} est acceptée : la combiner avec {@code @NotBlank}
 * pour couvrir l'absence de champ (convention Bean Validation).
 */
@Documented
@Constraint(validatedBy = StrongPasswordValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {

    String message() default
            "Le mot de passe doit contenir au moins 8 caractères, dont une majuscule et un chiffre";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
