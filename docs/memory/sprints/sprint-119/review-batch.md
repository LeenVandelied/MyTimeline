# Review batch — Sprint 119

Reviewer `ai-env:reviewer` sur le diff `5d740f26` (+ propriété health alors non commitée). 0 CRITIQUE / 2 MAJEUR / 6 MINEURS.

| Sévérité | Constat | Suite |
|---|---|---|
| MAJEUR | `JpaSharedEntityManagerConfig` : cause racine non vérifiée par le reviewer | Vérifiée par le lead (sonde : `jpaSharedEM_*` autowireCandidate=false, EMF primaire) ; garde = tests RANDOM_PORT rouges sans le bean. Conservé |
| MAJEUR | E2E / CI / boot réel non vérifiés au moment de la review | Boot réel + parcours navigateur faits ; CI : voir audit |
| MINEUR | `ProductUpdateRequest.clearColor` : `null` → 400 sous Jackson 3 (mesuré) | Assumé : le front n'envoie jamais `null` (`z.literal(true).optional()`) |
| MINEUR | Commentaires de versions périmés (POM, BomDriftTest) | Corrigé `c2ab5f42` |
| MINEUR | `HHH90000025` (dialecte explicite) | Follow-up |
| MINEUR | `/actuator/health/` (slash final) → 401 sous PathPattern | Assumé : probes et healthchecks appellent le chemin exact |
| MINEUR | `RateLimitingFilter` : `{"token":{…}}` → null (Jackson 3) au lieu de "" | Assumé : corps rejeté en 400 par le contrôleur, pas de contournement |
| MINEUR | Pas de test d'or de l'export JSON | Follow-up |

OK relevés : contrat API Jackson 3 (Boot réapplique FAIL_ON_UNKNOWN_PROPERTIES=false et dates ISO ; clés Lombok inchangées ; aucune entité sérialisée), Hibernate 7 couvert par 688 tests, POM cohérent, Security 7, propriétés, hexagonal.
