[BRIEFING ISSUE #134]

## Issue
[FEATURE] Politique anti-énumération username (409) + rate-limit sur /api/me

## Contexte
Follow-up détecté pendant Sprint 7 (PR #132, mergée dans dev). Voir docs/memory/audits/sprint-7-test-coverage.md et l'historique de review.

Quand une personne malveillante essaie de deviner si un nom d'utilisateur existe déjà sur la plateforme, le message d'erreur actuel ("nom d'utilisateur déjà pris") le lui confirme directement. C'est une fuite d'information appelée "énumération d'utilisateurs", qui peut servir de première étape à une attaque ciblée (phishing, brute-force) contre un compte précis. Par ailleurs, le changement de mot de passe n'est protégé par aucune limite de tentatives, ce qui permettrait à un attaquant ayant volé une session active d'essayer de deviner l'ancien mot de passe sans contrainte.

## À faire
Le code HTTP 409 "username already taken" (renvoyé à la fois sur `PATCH /api/me` et sur l'inscription) confirme l'existence d'un compte tiers → énumération de username. De plus, `/api/me/change-password` n'est pas couvert par le rate-limiting actuel (seul `/api/auth/*` l'est aujourd'hui) → un brute-force de l'ancien mot de passe est possible sur une session volée.

À décider puis implémenter :
- Politique anti-énumération username : soit un message neutre ne révélant pas l'existence du compte, soit un statut générique (ex. 422) sans détail exploitable, appliquée de façon cohérente sur `register` ET `PATCH /api/me`
- Ajout de `/api/me` (en particulier `/api/me/change-password`) à la map de rate-limiting existante

Ce pattern est hérité de l'implémentation de `register` — ce n'est pas une régression introduite au Sprint 7, mais une dette de sécurité à trancher.

## BR impactées
Aucune

## Critères d'acceptation
- [ ] Décision documentée sur la politique anti-énumération (message neutre vs statut générique) et appliquée uniformément sur `register` et `PATCH /api/me`
- [ ] `/api/me/change-password` (et plus largement `/api/me`) est intégré à la map de rate-limiting existante
- [ ] Tests couvrant : tentative de changement de username déjà pris (réponse non révélatrice) et dépassement du rate-limit sur change-password
- [ ] Aucune régression sur les messages d'erreur déjà attendus par le frontend (vérifier `UserController` et les forms associés)

## Piste technique
- Backend : `UserController` (endpoints `/api/me`, `/api/me/change-password`)
- Backend : configuration du rate-limiting existant (filtre/intercepteur appliqué à `/api/auth/*`)
- Logique de vérification d'unicité username (service d'inscription + service de mise à jour profil)

## Dépendances
Aucune

## Risques techniques
Changer le contrat d'erreur (409 → message neutre/422) peut impacter le frontend qui affiche potentiellement ce message tel quel — à vérifier avant de livrer. Le choix de la politique anti-énumération doit être tranché en amont (produit + sécurité) avant l'implémentation.

## Estimation
S (< 1 jour) — décision à trancher rapidement, modification ciblée sur deux endpoints et la config de rate-limiting, pas de nouvelle infrastructure.


## Plan d'implementation (arbitrage dev, /sprint start 71)
DECISION DEV — TRANCHEE, NE PAS LA REOUVRIR :
On GARDE le statut HTTP 409. C'est le MESSAGE qui devient neutre.

- Le corps d'erreur ne doit plus confirmer l'existence d'un compte tiers. Meme message
  generique, strictement identique, sur `register` et sur `PATCH /api/me`.
- Ne PAS basculer sur 422 : le contrat HTTP reste inchange pour ne pas casser les forms
  frontend qui discriminent sur le 409. Verifier `UserController` et les forms associes,
  et adapter les libelles frontend/i18n si l'ancien message y etait duplique.
- Ajouter `/api/me/**` (au minimum `/api/me/change-password`) a la map de rate-limiting
  existante. Le rate-limiting vit dans
  `backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java`
  (+ `RateLimitConfig.java`, `SecurityConfig.java`) et ne couvre aujourd'hui que `/api/auth/*`.
  `RateLimitConfig` expose un `TimeMeter` surchargeable en test — s'en servir pour tester
  le depassement de quota sans `sleep`.
- Tests demandes : (a) changement de username deja pris -> reponse non revelatrice,
  (b) depassement du rate-limit sur change-password, (c) aucune regression sur les
  messages d'erreur deja attendus par le frontend.

## Triage
Taille: S
Modele: opus
Effort: high
