## Objectif

Ce que l'application affiche en retour à l'utilisateur : messages d'erreur réseau traduits, message d'agenda vide juste, indicateur de force de mot de passe cohérent avec le serveur, et arbitrage du recouvrement résiduel du toast.

Sprint **100 % frontend** : aucun commit `backend/`, aucune migration Flyway.

## Issues traitées

| # | Titre | Taille |
|---|---|---|
| #713 | Messages réseau en français codé en dur + double signalement d'un 400 | S |
| #714 | Le toast recouvre la croix du drawer produit sur mobile | S |
| #701 | Agenda mobile : « Aucun événement aujourd'hui ni demain » affiché à tort | XS |
| #508 | `PasswordStrength.tsx` encore calé sur l'ancienne politique à 6 caractères | XS |

## Changements clés

**#713 — i18n hors React.** `apiClient` est un module, pas un composant : `useTranslations` y est inaccessible, et `loadMessages` est serveur-only. Un registre de module (`apiErrorMessages.ts`) est alimenté par un pont client monté sous le `NextIntlClientProvider`. Le motif est déjà sanctionné par le dépôt (`networkStatus.ts:1-13`, même problème pour #76). `errors.json` reste source unique — le repli FR est asserté valeur par valeur contre le JSON.

**#713 — règle du 400 : opt-out ciblé, pas suppression globale.** Retirer le toast 400 global aurait rendu muets tous les formulaires sans gestion inline (régression silencieuse). `/me/change-password` sort via une liste dédiée, testée **uniquement dans la branche 400** : un 401 sur cette route redirige toujours.

**#508 — relever le seuil n'aurait pas suffi.** `Abc123!` (7 caractères, refusé par le serveur) s'affichait `strong` ; avec le seul seuil à 8 il serait resté `medium`, toujours faux. Le correctif sépare la **porte** (`meetsPolicy`, réplique du prédicat serveur) du **degré** (`scorePassword`) : invariant `weak ⇔ refusé serveur`, testable en une assertion.

**#701 — clé renommée, pas ajoutée.** `empty` → `emptyToday` : l'unique appelant étant celui qu'on corrige, un ajout aurait laissé une clé morte. Les 4 locales sont réellement traduites.

**#714 — décision B (acceptation documentée), rendue deux fois.** La première version du Designer s'appuyait sur une sortie « swipe-down natif » qui **n'existe pas** (`ProductDrawer.tsx:255` est un commentaire ; aucun handler tactile, `vaul` absent, Radix Dialog sans swipe). Après réfutation, B a été ré-émise sur la vraie sortie — le tap sur la bande d'overlay Radix, disjointe du toast — et la durée du toast d'erreur sourcée dans la lib plutôt que dans un commentaire. Le commentaire mensonger est corrigé ; `TOASTER_TOP_OFFSET` est **inchangé**.

## ⚠ Prémisses d'énoncé infirmées par la mesure

**À 390×844, le recouvrement décrit par #714 est NUL.** Le contenu du drawer (672px) n'atteint jamais 92vh (776px) : le cas n'existe qu'en dessous de ≈730px de viewport. Le S92 situait la croix « à ≈84–100px à 844px » — c'est faux. Mesurer au seul viewport prescrit aurait conclu « pas de bug ». La spec couvre donc **trois régimes** (844 / 740 / 667).

Deux autres cotes du S92 sont démenties : carte de toast à **65px** (et non ≈46px), haut de sheet à **171px** (et non ≈68px).

## Revue

0 CRITIQUE, 0 MAJEUR de code, 2 MINEURS. Le mineur Unicode a été traité en cycle 2 (`32272373`) : `PASSWORD_POLICY` (ASCII) n'est pas la réplique « EXACTE » du serveur (`Character.isUpperCase`/`isDigit`, Unicode) qu'affirmait sa JSDoc. Écart **pré-existant** (#148) touchant register/reset/change-password — `Ωabcdefg١` est accepté serveur, refusé par le formulaire. Sens prudent (sur-contrainte), figé par 3 tests dont la garde a été **mutation-testée**. Alignement réel renvoyé à une issue dédiée.

## Tests

- **Backend** : 632 / 632
- **Frontend** : build + unitaires + typecheck + lint OK ; `format:check` propre
- **E2E** : 422 passed / 8 skipped / 0 failed (430, 2,7 min), suite **complète**, pile montée et démontée localement

### ⚠ 10 de ces « passed » sont vides

`sprint-77-theme-visual` n'a de références que `-linux`. Sur macOS, Playwright applique `updateSnapshots: 'missing'` **par défaut** : il a créé 10 références `-darwin` et fait passer les tests au lieu d'échouer. Ces 10 tests n'ont rien vérifié — portée réelle **412 tests porteurs**. Les PNG générés ont été supprimés et ne sont pas dans cette PR. **Seule la CI Linux vérifie réellement ces captures.**

Coverage-E2E : OK (0 nouveau `data-testid`).

## Suivis proposés (triage en `/sprint end`)

- **Croix du `ProductDrawer` hors viewport à 390×600** (`y = -12`) : `absolute top-4` dans un conteneur `overflow-y-auto`, elle défile au lieu d'être `sticky`. Perte réelle du contrôle de fermeture sur écran court, indépendante du toast.
- Aligner `PASSWORD_POLICY` sur `\p{Lu}` / `\p{Nd}`.
- 403 sémantiquement faux (« session expirée » sur un accès refusé) — traduit tel quel, comportement inchangé.
- Spec E2E pour le 400 inline de `change-password` ; symétrie « Rien demain » dans l'agenda.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
