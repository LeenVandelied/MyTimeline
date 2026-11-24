package com.matimeline.eventmanager.build;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/**
 * Hygiène du pom.xml du backend (#36).
 *
 * <p>Test unitaire pur : le pom est lu comme du XML avec le parseur du JDK, sans contexte Spring.
 */
class PomHygieneTest {

  private static final Path POM = Path.of("pom.xml");

  /** spring-security-crypto est déjà apporté par spring-boot-starter-security : pas de redéclaration. */
  @Test
  void doesNotDeclareSpringSecurityCryptoExplicitly() throws Exception {
    List<String> declared = new ArrayList<>();
    NodeList dependencies = parsePom().getElementsByTagName("dependency");
    for (int i = 0; i < dependencies.getLength(); i++) {
      Element dependency = (Element) dependencies.item(i);
      if ("org.springframework.security".equals(childText(dependency, "groupId"))
          && "spring-security-crypto".equals(childText(dependency, "artifactId"))) {
        declared.add("dependency #" + (i + 1));
      }
    }
    assertThat(declared)
        .as(
            "pom.xml déclare directement org.springframework.security:spring-security-crypto, "
                + "déjà apporté par la sécurité Spring (%d déclaration(s))",
            declared.size())
        .isEmpty();
  }

  /** Une version stable de Spring Boot n'a pas besoin du dépôt des versions intermédiaires. */
  @Test
  void declaresNoSpringMilestonesRepository() throws Exception {
    List<String> milestones = new ArrayList<>();
    Document pom = parsePom();
    for (String tag : List.of("repository", "pluginRepository")) {
      NodeList repositories = pom.getElementsByTagName(tag);
      for (int i = 0; i < repositories.getLength(); i++) {
        Element repository = (Element) repositories.item(i);
        String id = childText(repository, "id");
        String name = childText(repository, "name");
        String url = childText(repository, "url");
        if (containsMilestone(id) || containsMilestone(name) || containsMilestone(url)) {
          milestones.add(tag + " id=" + id + " url=" + url);
        }
      }
    }
    assertThat(milestones)
        .as(
            "pom.xml déclare un dépôt Spring Milestones (dépendances ou plugins) alors que "
                + "Spring Boot est en version stable : %s",
            milestones)
        .isEmpty();
  }

  private static Document parsePom() throws Exception {
    return DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(POM.toFile());
  }

  /** Texte du premier enfant DIRECT portant ce nom, ou null. */
  private static String childText(Element parent, String name) {
    NodeList children = parent.getChildNodes();
    for (int i = 0; i < children.getLength(); i++) {
      if (children.item(i) instanceof Element child && child.getTagName().equals(name)) {
        return child.getTextContent().trim();
      }
    }
    return null;
  }

  private static boolean containsMilestone(String value) {
    return value != null && value.toLowerCase().contains("milestone");
  }
}
