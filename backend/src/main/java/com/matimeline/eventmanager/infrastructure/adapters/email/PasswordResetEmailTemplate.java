package com.matimeline.eventmanager.infrastructure.adapters.email;

import java.util.Locale;

/**
 * Catalogue des templates de l'email "mot de passe oublié" (issue #142).
 *
 * <p>Le sujet et le corps HTML sont sortis de {@code BrevoEmailService} et déclinés
 * dans les 4 langues supportées par le produit ({@code frontend/src/i18n/locales.ts} :
 * fr, en, es, de). Le ton et le vocabulaire reprennent les traductions frontend
 * ({@code frontend/public/locales/&lt;locale&gt;/common.json}, clé {@code forgotPassword}).
 *
 * <p>Rendu HTML : {@link #htmlContent(String, String)} attend des valeurs DÉJÀ échappées
 * (voir {@code HtmlUtils.htmlEscape} côté appelant). L'échappement du nom est une
 * protection XSS existante — le nom est saisi par l'utilisateur à l'inscription et
 * s'exécuterait sinon dans le client mail du destinataire.
 *
 * <p>BR-AUT-012 : la résolution est TOTALE et purement locale (aucune I/O, aucune
 * exception). Une locale nulle, vide ou inconnue retombe sur {@link #FR}. Aucun
 * chemin ne peut donc modifier le code de réponse de {@code POST /api/auth/forgot-password}
 * ni introduire d'écart de timing observable.
 */
public enum PasswordResetEmailTemplate {

    FR("fr",
            "Réinitialisation de votre mot de passe MyTimeline",
            "<p>Bonjour %1$s,</p>"
                    + "<p>Vous avez demandé la réinitialisation de votre mot de passe MyTimeline. "
                    + "Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>"
                    + "<p><a href=\"%2$s\">Réinitialiser mon mot de passe</a></p>"
                    + "<p>Ce lien est valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, "
                    + "ignorez simplement cet email.</p>"
                    + "<p>L'équipe MyTimeline</p>"),

    EN("en",
            "Reset your MyTimeline password",
            "<p>Hello %1$s,</p>"
                    + "<p>You asked to reset your MyTimeline password. "
                    + "Click the link below to choose a new password:</p>"
                    + "<p><a href=\"%2$s\">Reset my password</a></p>"
                    + "<p>This link is valid for 15 minutes. If you did not make this request, "
                    + "simply ignore this email.</p>"
                    + "<p>The MyTimeline team</p>"),

    ES("es",
            "Restablecimiento de tu contraseña de MyTimeline",
            "<p>Hola %1$s:</p>"
                    + "<p>Has solicitado restablecer tu contraseña de MyTimeline. "
                    + "Haz clic en el enlace de abajo para elegir una nueva contraseña:</p>"
                    + "<p><a href=\"%2$s\">Restablecer mi contraseña</a></p>"
                    + "<p>Este enlace es válido durante 15 minutos. Si no has hecho esta solicitud, "
                    + "simplemente ignora este correo.</p>"
                    + "<p>El equipo de MyTimeline</p>"),

    DE("de",
            "Zurücksetzen Ihres MyTimeline-Passworts",
            "<p>Hallo %1$s,</p>"
                    + "<p>Sie haben das Zurücksetzen Ihres MyTimeline-Passworts angefordert. "
                    + "Klicken Sie auf den Link unten, um ein neues Passwort zu wählen:</p>"
                    + "<p><a href=\"%2$s\">Mein Passwort zurücksetzen</a></p>"
                    + "<p>Dieser Link ist 15 Minuten gültig. Falls die Anfrage nicht von Ihnen stammt, "
                    + "ignorieren Sie diese E-Mail einfach.</p>"
                    + "<p>Ihr MyTimeline-Team</p>");

    /** Template de repli : locale absente, vide ou non supportée. */
    public static final PasswordResetEmailTemplate DEFAULT = FR;

    private final String languageTag;
    private final String subject;
    private final String htmlTemplate;

    PasswordResetEmailTemplate(String languageTag, String subject, String htmlTemplate) {
        this.languageTag = languageTag;
        this.subject = subject;
        this.htmlTemplate = htmlTemplate;
    }

    /**
     * Sélectionne le template correspondant à {@code locale}, avec repli sur {@link #FR}.
     *
     * <p>Résolution défensive : {@code null}, chaîne vide/blanche, casse arbitraire
     * ({@code "DE"}), sous-étiquette régionale ({@code "es-ES"}, {@code "de_AT"}) et
     * locale inconnue ({@code "zz"}) sont tous acceptés sans exception.
     */
    public static PasswordResetEmailTemplate resolve(String locale) {
        if (locale == null || locale.isBlank()) {
            return DEFAULT;
        }
        String tag = language(locale.trim().toLowerCase(Locale.ROOT));
        for (PasswordResetEmailTemplate template : values()) {
            if (template.languageTag.equals(tag)) {
                return template;
            }
        }
        return DEFAULT;
    }

    /** Réduit {@code fr-FR} / {@code fr_FR} à sa sous-étiquette de langue {@code fr}. */
    private static String language(String tag) {
        int separator = tag.indexOf('-');
        if (separator < 0) {
            separator = tag.indexOf('_');
        }
        return separator < 0 ? tag : tag.substring(0, separator);
    }

    /** Étiquette de langue ISO 639-1 de ce template ({@code fr}, {@code en}, ...). */
    public String languageTag() {
        return languageTag;
    }

    /** Sujet de l'email dans la langue du template. */
    public String subject() {
        return subject;
    }

    /**
     * Corps HTML de l'email.
     *
     * @param escapedName      nom du destinataire, DÉJÀ échappé HTML par l'appelant
     * @param escapedResetLink lien de réinitialisation, DÉJÀ échappé HTML par l'appelant
     */
    public String htmlContent(String escapedName, String escapedResetLink) {
        return String.format(htmlTemplate, escapedName, escapedResetLink);
    }
}
