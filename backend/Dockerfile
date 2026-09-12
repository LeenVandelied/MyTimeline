# =============================================================
# Backend Spring Boot (Java 21) — build multi-stage (#37)
# Stage 1 : build Maven (cache des deps), Stage 2 : image JRE légère.
# =============================================================

# ---- Stage build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Cache des dépendances : on copie d'abord le pom seul, puis go-offline.
# Toute modif de code SANS changement de deps réutilise ce layer.
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

# Code source puis packaging (tests SKIP : le smoke build vise l'image, pas la
# suite qui exige Docker/Testcontainers/Postgres — jouée séparément en CI).
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---- Stage runtime ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# curl pour le HEALTHCHECK (image temurin-jre = base Ubuntu sans curl).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Utilisateur non-root.
RUN groupadd --system spring && useradd --system --gid spring spring

# Répertoire de stockage des avatars (STORAGE_AVATAR_PATH) — monté en volume
# par docker-compose pour la persistance. Propriété à l'utilisateur applicatif.
RUN mkdir -p /app/var/avatars && chown -R spring:spring /app
USER spring

COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080

# Healthcheck aligné sur celui de docker-compose (fonctionne aussi hors compose).
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
