package com.matimeline.eventmanager.domain.models;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.GenericArrayType;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.lang.reflect.WildcardType;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.assertj.core.api.SoftAssertions;
import org.junit.jupiter.api.Test;

class ProductCommandsTest {

    private static final List<String> HTTP_PREFIXES = List.of(
            "com.matimeline.eventmanager.application.",
            "jakarta.servlet.",
            "org.springframework.web.",
            "org.springframework.http.");

    @Test
    void productCommandsExposeOnlyDomainFields() {
        UUID categoryId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        EventCreateCommand event = new EventCreateCommand(
                "Sortie", "single", null, null, false, null, null, null, null, null);

        ProductCreateCommand create = new ProductCreateCommand(
                "Voyage", categoryId, userId, "#112233", List.of(event));
        ProductUpdateCommand update = new ProductUpdateCommand(
                "Renommé", categoryId, "#445566", true);

        SoftAssertions softly = new SoftAssertions();

        // Liste fermée des champs, dans l'ordre : ni champ en trop, ni champ mal nommé.
        softly.assertThat(componentNames(ProductCreateCommand.class))
                .containsExactly("name", "categoryId", "userId", "color", "events");
        softly.assertThat(componentNames(ProductUpdateCommand.class))
                .containsExactly("name", "categoryId", "color", "clearColor");

        // Aucun type de composant, générique compris, ne vient de la couche HTTP ou application.
        softly.assertThat(httpTypes(ProductCreateCommand.class)).isEmpty();
        softly.assertThat(httpTypes(ProductUpdateCommand.class)).isEmpty();

        softly.assertThat(create.name()).isEqualTo("Voyage");
        softly.assertThat(create.categoryId()).isEqualTo(categoryId);
        softly.assertThat(create.userId()).isEqualTo(userId);
        softly.assertThat(create.color()).isEqualTo("#112233");
        softly.assertThat(create.events()).containsExactly(event);

        softly.assertThat(update.name()).isEqualTo("Renommé");
        softly.assertThat(update.categoryId()).isEqualTo(categoryId);
        softly.assertThat(update.color()).isEqualTo("#445566");
        softly.assertThat(update.clearColor()).isTrue();

        softly.assertAll();
    }

    private static List<String> componentNames(Class<? extends Record> type) {
        return Arrays.stream(type.getRecordComponents()).map(RecordComponent::getName).toList();
    }

    private static List<String> httpTypes(Class<? extends Record> type) {
        List<String> found = new ArrayList<>();
        for (RecordComponent component : type.getRecordComponents()) {
            collect(component.getGenericType(), found);
        }
        return found;
    }

    private static void collect(Type type, List<String> found) {
        if (type instanceof Class<?> c) {
            if (c.isArray()) {
                collect(c.getComponentType(), found);
            } else if (HTTP_PREFIXES.stream().anyMatch(c.getName()::startsWith)) {
                found.add(c.getName());
            }
        } else if (type instanceof ParameterizedType p) {
            collect(p.getRawType(), found);
            for (Type arg : p.getActualTypeArguments()) {
                collect(arg, found);
            }
        } else if (type instanceof GenericArrayType g) {
            collect(g.getGenericComponentType(), found);
        } else if (type instanceof WildcardType w) {
            for (Type bound : w.getUpperBounds()) {
                collect(bound, found);
            }
            for (Type bound : w.getLowerBounds()) {
                collect(bound, found);
            }
        }
    }
}
