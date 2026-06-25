[BRIEFING ISSUE #116]

## Issue
[REFACTOR] Uniformiser le body 401 BadCredentials du login en JSON

## Contexte

Le Sprint 4 (PR #113) a harmonisé les messages d'erreur renvoyés par le backend lors de l'authentification : tous les corps de réponse d'erreur sont désormais au format JSON `{"error": "..."}`. Une exception subsiste : lorsqu'un utilisateur saisit un mauvais mot de passe, l'endpoint `/login` renvoie encore une chaîne de texte brute `"Invalid username or password"` au lieu du format JSON attendu.

Ce manque de cohérence peut provoquer des erreurs d'affichage côté frontend si celui-ci parse systématiquement la réponse en JSON.

**Source :** `docs/memory/sprints/sprint-4/` — triage de clôture PR #113.

## À faire

Dans `AuthController`, bloc `catch(BadCredentialsException)` de la méthode `login` : remplacer le retour `ResponseEntity.status(401).body("Invalid username or password")` par `ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"))`.

**Attention BR-AUT-005 :** le message d'erreur ne doit pas indiquer si c'est l'identifiant ou le mot de passe qui est incorrect (ne pas divulguer l'existence d'un compte).

## BR impactées

- BR-AUT-005 : ne pas révéler si l'identifiant existe

## Critères d'acceptation

- [ ] Une requête `POST /login` avec des identifiants incorrects renvoie un HTTP 401 avec un corps JSON `{"error": "Invalid username or password"}`
- [ ] Le message ne distingue pas identifiant inconnu vs mot de passe incorrect (BR-AUT-005 respectée)
- [ ] Le test existant couvrant le 401 de login est mis à jour pour valider le format JSON

## Piste technique

- Fichier : `src/main/java/.../controller/AuthController.java`
- Méthode `login`, bloc `catch(BadCredentialsException)`
- Test à mettre à jour : `AuthControllerSecurityTest`

## Dépendances

- #113 (mergée — point de départ)

## Risques techniques

- Vérifier que le frontend ne compare pas en dur la chaîne texte `"Invalid username or password"` — si c'est le cas, adapter l'affichage côté client également.

## Estimation

XS — modification d'une ligne dans le contrôleur + mise à jour d'une assertion de test.


## Plan d'implementation
Follow-up S4 (triage PR #113). Le body de l'issue ci-dessus EST le plan (voir 'Piste technique').
Resume : dans AuthController.login(), bloc catch(BadCredentialsException), remplacer
`ResponseEntity.status(401).body("Invalid username or password")` par
`ResponseEntity.status(401).body(Map.of("error","Invalid username or password"))`.
BR-AUT-005 : message neutre (ne pas distinguer username inconnu vs mot de passe faux).
Mettre a jour l'assertion correspondante dans AuthControllerSecurityTest (attendre body JSON).
Verifie d'abord le contrat exact deja utilise par les autres reponses d'erreur de AuthController (coherence {"error": ...}).

## Triage
Taille: XS
Modele: sonnet
Effort: medium
