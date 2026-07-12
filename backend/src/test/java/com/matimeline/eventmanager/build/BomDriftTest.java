package com.matimeline.eventmanager.build;

import static org.assertj.core.api.Assertions.assertThat;

import org.apache.catalina.util.ServerInfo;
import org.flywaydb.core.internal.license.VersionPrinter;
import org.junit.jupiter.api.Test;
import org.springframework.core.SpringVersion;
import org.springframework.security.core.SpringSecurityCoreVersion;

/**
 * Garde anti-drift du BOM Spring Boot (#224).
 *
 * <p>Test unitaire PUR (aucun {@code @SpringBootTest}, aucun conteneur/Postgres) : il ne fait que
 * lire les versions EFFECTIVES des libs sécurité-critiques présentes sur le classpath et vérifier
 * qu'elles restent {@code >=} à un plancher CVE-safe. Il tourne vite et sans Docker en CI (job
 * {@code backend} → {@code mvnw verify}), donc AUCUNE modif de {@code .github/workflows/ci.yml}
 * n'est nécessaire : la garde est portée par ce test.
 *
 * <p>POURQUOI cette garde : depuis #260 (Boot 3.4.13 → 3.5.16), plus AUCUN override
 * {@code <*.version>} de sécurité ne subsiste dans le pom — ces versions sont désormais 100 %
 * managées par le BOM Boot. Un futur bump Boot (ou un {@code <*.version>} réintroduit par erreur)
 * pourrait faire REDESCENDRE une lib sous la version qui corrige une CVE connue, sans que rien ne
 * l'attrape avant le runtime. Chaque plancher ci-dessous = « ne jamais régresser sous le correctif
 * de cette CVE ».
 *
 * <p>Chaque plancher est un {@code >=} sémantique (PAS une égalité : une égalité casserait à chaque
 * bump légitime — anti-pattern). Il est fixé à la version CORRECTIVE de la CVE (pas forcément la
 * version effective courante), pour tolérer les patch/minor bumps légitimes tout en bloquant toute
 * régression sous le correctif.
 *
 * <p>COMMENT relever un plancher lors d'un prochain bump : ne le relève QUE si une nouvelle CVE
 * impose un correctif plus récent (mets alors le plancher à la version corrective + réf CVE en
 * commentaire). Un simple bump de version effective ne justifie PAS de bouger le plancher — le test
 * passe déjà tant que l'effectif reste {@code >=}.
 */
class BomDriftTest {

  /**
   * spring-security. Plancher = 6.5.9, correctif de CVE-2026-22732 / CVE-2025-41232. Effectif
   * courant (BOM Boot 3.5.16) : 6.5.11.
   */
  @Test
  void springSecurityStaysAboveCveFloor() {
    assertVersionAtLeast(
        "spring-security", SpringSecurityCoreVersion.getVersion(), "6.5.9", "CVE-2026-22732 / CVE-2025-41232");
  }

  /**
   * spring-framework. Plancher = 6.2.19, aligné sur spring-security 6.5.x (correctifs transitifs
   * spring-web/spring-core). Effectif courant : 6.2.19.
   */
  @Test
  void springFrameworkStaysAboveCveFloor() {
    assertVersionAtLeast(
        "spring-framework", SpringVersion.getVersion(), "6.2.19", "alignement correctifs spring-web/core 6.2.x");
  }

  /**
   * tomcat-embed. Plancher = 10.1.55, correctif de CVE-2026-41293 / CVE-2026-43512 /
   * CVE-2026-43515. Effectif courant : 10.1.55. Lu via {@link ServerInfo#getServerNumber()}
   * (ex : "10.1.55").
   */
  @Test
  void tomcatStaysAboveCveFloor() {
    assertVersionAtLeast(
        "tomcat-embed",
        ServerInfo.getServerNumber(),
        "10.1.55",
        "CVE-2026-41293 / CVE-2026-43512 / CVE-2026-43515");
  }

  /**
   * jackson-databind/core. Plancher = 2.18.8, correctif de CVE-2026-54512 / CVE-2026-54513.
   * Effectif courant : 2.21.4. Constante {@code static final} → lue par réflexion pour refléter le
   * jar RÉELLEMENT chargé (une lecture directe serait inlinée à la compilation).
   */
  @Test
  void jacksonStaysAboveCveFloor() {
    String jackson = readStaticStringField("com.fasterxml.jackson.core.json.PackageVersion", "VERSION");
    assertVersionAtLeast("jackson", jackson, "2.18.8", "CVE-2026-54512 / CVE-2026-54513");
  }

  /**
   * postgresql JDBC. Plancher = 42.7.11, correctif de CVE-2026-42198. Effectif courant : 42.7.11.
   * Constante {@code static final} → lue par réflexion (voir jackson ci-dessus).
   */
  @Test
  void postgresqlStaysAboveCveFloor() {
    String pg = readStaticStringField("org.postgresql.util.DriverInfo", "DRIVER_VERSION");
    assertVersionAtLeast("postgresql", pg, "42.7.11", "CVE-2026-42198");
  }

  /**
   * flyway. Plancher = 11.7.2 (pas de CVE ciblée : plancher d'alignement — le module
   * {@code flyway-database-postgresql} requis en Flyway 10+/11+ doit rester présent, DEC-S3-001).
   * Effectif courant : 11.7.2. Lu via {@link VersionPrinter#getVersion()} (API interne mais stable
   * et statique).
   */
  @Test
  void flywayStaysAboveFloor() {
    assertVersionAtLeast(
        "flyway", VersionPrinter.getVersion(), "11.7.2", "alignement module flyway-database-postgresql");
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private static void assertVersionAtLeast(String lib, String actual, String floor, String reason) {
    assertThat(actual)
        .as("Version effective de %s introuvable sur le classpath", lib)
        .isNotBlank();
    assertThat(compareSemver(actual, floor))
        .as(
            "DRIFT BOM détecté : %s effectif=%s < plancher CVE-safe=%s (%s). "
                + "Un bump Boot a fait régresser cette lib sous son correctif. "
                + "Corrige le BOM/override AVANT merge, ne relâche PAS le plancher.",
            lib, actual, floor, reason)
        .isGreaterThanOrEqualTo(0);
  }

  /**
   * Compare deux versions par composants NUMÉRIQUES (sémantique, pas lexicographique : évite le
   * piège "6.2.19" &lt; "6.2.9" en comparaison de chaînes). Les suffixes non numériques
   * (-RELEASE, .RELEASE, snapshots) sont ignorés. Retourne &lt;0, 0 ou &gt;0.
   */
  static int compareSemver(String a, String b) {
    int[] pa = parse(a);
    int[] pb = parse(b);
    int n = Math.max(pa.length, pb.length);
    for (int i = 0; i < n; i++) {
      int va = i < pa.length ? pa[i] : 0;
      int vb = i < pb.length ? pb[i] : 0;
      if (va != vb) {
        return Integer.compare(va, vb);
      }
    }
    return 0;
  }

  private static int[] parse(String version) {
    String[] tokens = version.split("[^0-9]+");
    java.util.List<Integer> parts = new java.util.ArrayList<>();
    for (String t : tokens) {
      if (!t.isEmpty()) {
        parts.add(Integer.parseInt(t));
      }
    }
    return parts.stream().mapToInt(Integer::intValue).toArray();
  }

  private static String readStaticStringField(String className, String fieldName) {
    try {
      Class<?> clazz = Class.forName(className);
      Object value = clazz.getField(fieldName).get(null);
      return value == null ? null : value.toString();
    } catch (ReflectiveOperationException e) {
      throw new AssertionError(
          "Impossible de lire " + className + "." + fieldName + " (lib absente du classpath ?)", e);
    }
  }
}
