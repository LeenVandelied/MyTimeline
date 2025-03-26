package com.example.eventmanager.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class MessageUtil {

    private final MessageSource messageSource;

    @Autowired
    public MessageUtil(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    /**
     * Récupère un message internationalisé avec la locale courante.
     *
     * @param code Le code du message
     * @return Le message traduit
     */
    public String getMessage(String code) {
        return getMessage(code, null);
    }

    /**
     * Récupère un message internationalisé avec la locale courante et des arguments.
     *
     * @param code Le code du message
     * @param args Les arguments à insérer dans le message
     * @return Le message traduit
     */
    public String getMessage(String code, Object[] args) {
        Locale locale = LocaleContextHolder.getLocale();
        return messageSource.getMessage(code, args, code, locale);
    }

    /**
     * Récupère un message internationalisé avec une locale spécifique.
     *
     * @param code Le code du message
     * @param locale La locale à utiliser
     * @return Le message traduit
     */
    public String getMessage(String code, Locale locale) {
        return messageSource.getMessage(code, null, code, locale);
    }

    /**
     * Récupère un message internationalisé avec une locale spécifique et des arguments.
     *
     * @param code Le code du message
     * @param args Les arguments à insérer dans le message
     * @param locale La locale à utiliser
     * @return Le message traduit
     */
    public String getMessage(String code, Object[] args, Locale locale) {
        return messageSource.getMessage(code, args, code, locale);
    }
} 