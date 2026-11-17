---
pack: authorization
kind: transversal
name: Autorisation et limitation de débit
generated_at: 2026-11-17T10:36:11Z
generator: synth/1
base_sha256: b0689fdc650044d360bda0eb4bd182beb6d99f1045d97ca6b77e47c60be448c3
facts_in_base: 271
facts_in_pool: 270
facts_cited: 52
sections: authorization.sections.json
details: [authorization.details.md]
lang: fr
curated_at: 2026-11-17T10:45:42Z
curation: authorization.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `(Security|Jwt|RateLimit|RateLimiting|CustomUserDetails|ExportToken|CallerResolver|AuthController)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

- Le contexte de sécurité n'est renseigné que si le jeton est valide et son jti non révoqué, sinon la requête continue en anonyme [#197122bdd1e5948a-1] [#197122bdd1e5948a-2].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:220-236` (pointeur, détail en annexe) [#b4abadd3d950429f-1] [#c9ffe973525260e3-2] [#c9ffe973525260e3-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:300-303` (pointeur, détail en annexe) [#71768ef1221dd0c4-1] [#71768ef1221dd0c4-2] [#10efe7ec9942ce01-1] [#edc7dcbdf92af882-1] [#451be34991dcd0e9-1] [#ed68a63fc2b66b67-1] [#1fb3c624845adfd4-1].
- Le jeton vaut deux jours [#43cd43636bd862bb-1], une clé privée vide donne une paire éphémère [#77f20da63fc7487d-1] et un modulus sous 2048 bits est refusé au chargement [#ad94765637b5f497-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:105-108` (pointeur, détail en annexe) [#46ef396b46b51aa9-1] [#f6e75e0a5e5133b6-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:431` (pointeur, détail en annexe) [#ef1ceb9ef6e0e2d9-2] [#454cce6a9210f047-2] [#c110fb621d545244-1] [#d3225cdbefff589a-1] [#e19475c1bbc12f34-1].
- Un plafond configuré inférieur à 1 est refusé par IllegalArgumentException [#426f7fd182552932-1] [#c616bd2d8e37f561-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:445-448` (pointeur, détail en annexe) [#4984030ad4075ec2-1] [#6c4a9b97036ab115-1] [#fea6a7ed68a4df50-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:92-93` (pointeur, détail en annexe) [#485955adb2298a8b-1] [#0833c211a9b3191d-1] [#ef91d216c638ddd0-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:154` (pointeur, détail en annexe) [#20c936dfaa725a62-1] [#20c936dfaa725a62-2].

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController.logout | Le logout révoque le jti du token courant via sessionService.revokeCurrentSession, puis efface le cookie jwt. (partiel) | L250-260 | [#ed68a63fc2b66b67-1] |
| AuthController.refreshToken | Le refresh génère un nouveau token à partir de token, révoque le jti de l'ancien token avec revokeSessionSilently, puis enregistre le jti du nouveau token avec registerSession. | L319-324 | [#10efe7ec9942ce01-1] |
| AuthController.forgotPassword | La route forgot-password renvoie toujours un 200 avec le même message, après appel de passwordResetService.requestReset, quel que soit le résultat de la recherche. | L354-360 | [#ebe5ee4325e1c2af-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RateLimitingFilter.doFilterInternal | Lorsque le bucket n'a plus de jeton, la requête est interrompue et writeTooManyRequests renvoie un statut 429 avec le corps too_many_requests. (partiel) | L434-437 | [#c110fb621d545244-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | Le chemin /actuator/health est accessible sans authentification. | L159 | [#8bc3a1ce71fe4ba9-1] |
| SecurityConfig.securityFilterChain | Les chemins /error et JwksController.JWKS_PATH sont accessibles sans authentification, la javadoc de la section JWKS indiquant que la clé publique n'est pas un secret. | L164-170 | [#8bc3a1ce71fe4ba9-2] |
| SecurityConfig.securityFilterChain | Le préfixe /api/auth/** est accessible sans authentification. | L171 | [#8bc3a1ce71fe4ba9-3] |

## 5. Mise en œuvre par domaine {#surface}

### Authentification et accès public
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:159` (pointeur, détail en annexe) [#8bc3a1ce71fe4ba9-1] [#ebe5ee4325e1c2af-1] [#8bc3a1ce71fe4ba9-3].
- La route forgot-password renvoie toujours un 200 avec le même message après appel de requestReset, quel que soit le résultat de la recherche, donc le client ne peut pas savoir si le compte existe [#ebe5ee4325e1c2af-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:159` (pointeur, détail en annexe) [#8bc3a1ce71fe4ba9-1] [#8bc3a1ce71fe4ba9-2].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (10 sur 30), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 23 | convention 6, validation 6, other 5 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 26 | convention 10, other 7, config 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 12 | convention 5, config 2, validation 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 14 | config 4, convention 4, endpoint 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 14 | test_case 8, config 2, convention 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 21 | test_case 17, config 3, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitTunableCeilingTest.java` | 12 | test_case 5, validation 3, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 19 | test_case 15, convention 3, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 12 | test_case 5, config 2, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java` | 8 | convention 3, config 2, test_case 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 0 | 55 | oui |

- Faits du pool par pack d'origine : timeline 155, authorization 115

## 8. Tests attendus {#tests}

- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitTunableCeilingTest.java:160-170` (pointeur, détail en annexe) [#3c3ee02e4eae24a0-1] [#079e56229b15e285-1].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:125-152` (pointeur, détail en annexe) [#bb4775b4fb472a5b-1].
- Les tests fixent que reset-password est limité par token et non par IP [#3a1d4eba463adcd8-1] [#516b7267da36b73e-1].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:97-117` (pointeur, détail en annexe) [#947ec0951545e427-1] [#5fd40af78c2a4f52-1].
- Les tests fixent que les tokens d'export et d'authentification se rejettent mutuellement [#59e0bbca86f288c7-1] [#eab3e61c44fe8201-1].
- Pour les tests de fenêtre, un nouveau test avance le TimeMeter contrôlable de 61 secondes [#2d913739f7a4d843-1], et pour /me il stubbe isSessionActive à true [#9409bb43c491ee9c-1].

## 9. Questions ouvertes {#questions}

- La map des seaux par IP et par chemin sans éviction est-elle acceptable à long terme ? La javadoc signale l'absence d'éviction comme un point à revoir si l'espace des clés grandit, et aucun fait de code ne montre de purge [#41dd62aea9e27bf0-1] [#948cf8b91f5231d8-4].
- Un garde-fou interdit-il bien la clé éphémère en production ? Le test fixe qu'un matériel de clé blanc donne une paire éphémère, et le commentaire cite ProfileSafetyGuard, mais aucun fait de code du lot ne le confirme [#061c497304451694-1] [#061c497304451694-2].

## 10. Alertes {#alerts}

- Une exception inattendue (hors JwtException) dans le filtre JWT est journalisée, puis la requête continue en anonyme, sans réponse d'erreur propre au filtre. Qui modifie ce filtre doit savoir qu'une panne technique se voit comme un refus d'authentification, donc vérifier les journaux avant de chercher une erreur de droits, et ne pas compter sur une erreur 500 ici [#af86537e34083429-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:97-102`.

## 11. Couverture {#coverage}

- Fichiers du pack : 37 ; cités par au moins un fait : 30 ; non cités définitifs : 0.
- Faits en base : 271 ; dans le pool après déduplication : 270 (dont 0 repris d'autres packs) ; cités dans ce pack : 52 ; en annexe : 130 ; ni cités ni en annexe : 81 ; écartés (sorte `other`) : 41.
- Fichiers dont au moins un fait est cité ici : 13 sur 37.
- Passe transversale : scope 37 fichiers, lus 37 (100 %), non lus 0 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 b0689fdc6500…, générée le 2026-11-17.
