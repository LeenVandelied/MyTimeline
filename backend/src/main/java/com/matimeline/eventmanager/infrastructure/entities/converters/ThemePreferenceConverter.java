package com.matimeline.eventmanager.infrastructure.entities.converters;

import com.matimeline.eventmanager.domain.models.ThemePreference;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Traduit {@link ThemePreference} (domaine) &lt;-&gt; {@code users.theme_preference} (#653, ADR-010).
 *
 * <p>La colonne stocke la valeur EXTERNE en minuscules ({@code light}/{@code dark}/{@code system}),
 * seule acceptée par le CHECK {@code ck_users_theme_preference} (V16). {@code @Enumerated(STRING)}
 * écrirait le nom de constante ({@code LIGHT}) et violerait ce CHECK : d'où ce convertisseur.
 * {@code null} &lt;-&gt; {@code NULL} (aucun choix explicite du compte). Pas d'{@code autoApply} :
 * posé explicitement sur le seul champ concerné.
 */
@Converter
public class ThemePreferenceConverter implements AttributeConverter<ThemePreference, String> {

    @Override
    public String convertToDatabaseColumn(ThemePreference attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public ThemePreference convertToEntityAttribute(String dbData) {
        // Le CHECK V16 garantit qu'aucune autre valeur n'est lisible : fromValue ne lève
        // qu'en cas de dérive de schéma, ce qui DOIT se voir (pas de repli silencieux).
        return dbData == null ? null : ThemePreference.fromValue(dbData);
    }
}
