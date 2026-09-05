package com.matimeline.eventmanager.application.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Requête "mot de passe oublié" (POST /api/auth/forgot-password).
 *
 * <p>Contrat frontend #53 : champ {@code email}. Réponse TOUJOURS 200
 * (BR-AUT-012, anti-énumération) — la validation @Email/@NotBlank renvoie 400
 * uniquement sur un corps malformé, pas sur un email inconnu.
 *
 * <p>#142 : champ {@code locale} OPTIONNEL (étiquette de langue de l'email de
 * réinitialisation, cf. {@code frontend/src/i18n/locales.ts}). Volontairement SANS
 * {@code @NotBlank} : l'endpoint est non authentifié et aucune locale — absente,
 * vide ou fantaisiste — ne doit changer le code de réponse (BR-AUT-012). Le repli
 * sur {@code fr} est fait à la sélection du template, pas par la validation — y
 * compris pour une chaîne arbitrairement longue : la contrainte BR-AUT-012 interdit
 * qu'une locale absurde produise autre chose qu'un 200. La valeur n'est jamais
 * loggée ni concaténée, elle sert uniquement de clé de lookup sur 4 tags connus.
 */
public class ForgotPasswordRequest {

    @NotBlank
    @Email
    private String email;

    private String locale;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }
}
