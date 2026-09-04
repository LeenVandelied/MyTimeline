[BRIEFING ISSUE #148]

## Issue
[CHORE] Harmoniser la politique de complexité du mot de passe (form vs backend)

## Contexte
Lors de la revue de la PR #138 (Sprint 8, flux « mot de passe oublié »), une incohérence a été détectée entre les règles de validation du mot de passe appliquées côté formulaire (frontend) et côté serveur (backend). Aujourd'hui, un mot de passe peut être accepté à un endroit de l'application et refusé à un autre, ce qui est source de confusion pour l'utilisateur et affaiblit la confiance dans la robustesse du compte.

## À faire
Incohérence constatée :
- Le **formulaire d'inscription** (`frontend/src/lib/schemas/auth.ts`, `createRegisterFormSchema`) exige **majuscule + chiffre**.
- Le **backend** (`RegisterRequest` et `ResetPasswordRequest`, package `com.matimeline.eventmanager`) n'impose que `@Size(min=6)` — aucune règle de complexité.
- Le formulaire de réinitialisation a été aligné sur `min 6` (PR #147) pour matcher le backend existant — mais du coup le formulaire d'inscription reste plus strict que le backend ET que le formulaire de réinitialisation.

Décision à trancher entre deux options :
1. **Durcir le backend partout** (recommandé) : ajouter la contrainte majuscule + chiffre (voire longueur minimale ≥ 8) sur `RegisterRequest` et `ResetPasswordRequest` (validation serveur), puis aligner tous les schémas Zod (register + reset) sur cette même règle. Le backend devient la source de vérité de la politique de mot de passe.
2. **Assouplir le formulaire d'inscription** : retirer la contrainte majuscule + chiffre du formulaire register pour matcher le backend (`min 6`). Cohérent, mais politique de sécurité plus faible.

Option 1 recommandée pour des raisons de sécurité. Mettre à jour la règle métier BR-AUT-003 en conséquence, quelle que soit l'option retenue.

## BR impactées
BR-AUT-003 (politique de mot de passe) — à clarifier/mettre à jour selon l'option retenue.

## Critères d'acceptation
- [ ] Une politique de mot de passe unique est décidée et documentée (mise à jour de BR-AUT-003).
- [ ] Les contraintes de validation sont identiques entre le backend (`@Valid` sur `RegisterRequest` et `ResetPasswordRequest`) et les schémas Zod frontend (register + reset).
- [ ] Des tests couvrent le rejet d'un mot de passe non conforme, à la fois côté serveur et côté client.

## Piste technique
- `frontend/src/lib/schemas/auth.ts` (`createRegisterFormSchema`, schéma reset)
- Backend `com.matimeline.eventmanager` : `RegisterRequest`, `ResetPasswordRequest`
- Voir PR #138 (sprint 8, flux mot de passe oublié) et PR #147 (alignement form reset sur `min 6`)

## Dépendances
Aucune. À noter : lien thématique avec les issues #134 (anti-énumération username) et #141 (rate-limiting reset password), sans dépendance bloquante.

## Risques techniques
Durcir le backend rétroactivement peut invalider des mots de passe déjà existants en base pour les comptes créés avant le changement — s'assurer que la contrainte ne s'applique qu'à la création/modification, pas à la validation des mots de passe existants au login.

## Estimation
S — modification ciblée de 2 endpoints backend + 2 schémas Zod frontend + mise à jour de la doc BR + tests unitaires associés. Pas de migration de données requise.


## Plan d'implementation (arbitrage dev, /sprint start 71)
DECISION DEV — TRANCHEE, NE PAS LA REOUVRIR :
Option 1 de l'issue, poussee a 8 caracteres. Le BACKEND est la source de verite.

- `RegisterRequest` ET `ResetPasswordRequest` : `@Size(min = 8, ...)` + contrainte
  majuscule + chiffre (via `@Pattern` ou une annotation de validation dediee, au choix,
  mais IDENTIQUE sur les deux DTOs et avec un message d'erreur FR coherent).
- Schemas Zod alignes sur EXACTEMENT la meme regle : `createRegisterFormSchema` ET le
  schema de reset dans `frontend/src/lib/schemas/auth.ts` (aujourd'hui `min(6)` cote reset,
  `min(6)+regex` cote register — les deux doivent devenir min 8 + majuscule + chiffre).
  Verifier aussi les schemas non-i18n du meme fichier (lignes ~28-51) s'ils servent encore.
- Cles i18n : `validation.password.min` doit refleter 8 (et non 6) dans TOUTES les locales
  presentes sous `frontend/` — grep la cle avant de conclure.
- CONTRAINTE DURE : la regle s'applique a la CREATION/MODIFICATION uniquement. Le login
  (`LoginRequest` / verification du hash) NE DOIT PAS etre durci — sinon les comptes
  existants avec un mot de passe a 6 caracteres sont verrouilles. Verifier explicitement
  qu'aucune annotation ajoutee ne retombe sur le chemin d'authentification.
- Mettre a jour BR-AUT-003 dans `docs/memory/business-rules.md` ET dans le pack
  `.ai-env/context-packs/br-auth.md` (les deux, sinon la CI `ai-env-packs` peut rougir).
- Tests : rejet serveur d'un mot de passe non conforme sur les 2 endpoints + test des
  schemas Zod cote frontend. Un test qui prouve que le LOGIN d'un compte a mot de passe
  court fonctionne toujours est demande explicitement.

## Triage
Taille: S
Modele: opus
Effort: high
