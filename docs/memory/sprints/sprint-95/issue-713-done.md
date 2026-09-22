# Issue #713 — Messages réseau i18n + 400 signalé une seule fois

## Commits

- `130da4a6` :globe_with_meridians: fix(i18n): messages reseau traduits et 400 signale une seule fois (#713)

## Résumé

4 chaînes FR en dur de `apiClient.ts` (400/401/403/500) → clés i18n, 4 locales.
400 sur `/me/change-password` signalé 1 seule fois (inline, plus de toast).

Fichiers :

- `frontend/src/services/apiErrorMessages.ts` (NOUV) — registre i18n hors React
- `frontend/src/services/ApiErrorTranslatorBridge.tsx` (NOUV) — pont client, rend `null`
- `frontend/src/services/apiClient.ts` — `translateApiError()` + `INLINE_VALIDATION_ENDPOINTS`
- `frontend/app/[locale]/layout.tsx` — montage du pont sous `NextIntlClientProvider`
- `frontend/public/locales/{fr,en,es,de}/errors.json` — 2 clés × 4 locales
- `frontend/src/components/settings/SecuritySection.tsx` — commentaire de couplage seul
- 3 fichiers de tests (1 modifié, 2 nouveaux)

Pièges rencontrés :

- `loadMessages` (`frontend/i18n.ts`) utilise `node:fs` → SERVEUR, inutilisable depuis
  un module du bundle client. Le pont était obligatoire, pas un raffinement.
- `apiClient.test.ts:64` assertait `/session expirée/i` ; la clé `auth.sessionExpired`
  dit « session **a** expiré » → l'assertion existante devenait fausse, corrigée.
- `layout.tsx` HORS liste de fichiers attribués mais nécessaire (1 import + 1 balise) :
  aucun autre point de montage n'existe sous le provider i18n (`toaster.tsx`, seul
  candidat alternatif, est rendu HORS provider l.86 ET attribué à un autre agent).

## Décisions prises

- **Mécanisme i18n hors React** : registre de module `setApiErrorTranslator()` /
  `translateApiError()`, alimenté par un composant client monté sous le provider.
  Le code le permet et le sanctionne déjà : `src/services/networkStatus.ts:1-13`
  documente EXACTEMENT ce motif pour la même raison (« apiClient n'est pas un
  composant React »), consommé par `NetworkStatusContext.tsx:13`. Provider localisé
  à `frontend/app/[locale]/layout.tsx:71`. Pont monté l.77 (avant
  `NetworkStatusProvider` : effets des frères commis dans l'ordre de l'arbre).
  `errors.json` reste source unique — le repli FR du module est comparé au JSON `fr`
  valeur par valeur (`apiErrorMessages.test.ts`, « repli désynchronisé »).
- **Règle du 400** : opt-out CIBLÉ. Défaut inchangé = toast global. Liste
  `INLINE_VALIDATION_ENDPOINTS = ['/me/change-password']` (`apiClient.ts`), testée
  UNIQUEMENT dans la branche 400 — distincte de `isInlineAuthRequest`, qui
  court-circuite tous les statuts. Portée exacte : sur `/me/change-password`, le 400
  est muet côté global (rendu par `form.setError('oldPassword')`), le 401 redirige
  toujours vers `/[locale]/login`, 403 et 500 inchangés.
- **Clés créées** (fr, en, es, de) :
  - `errors.validation.error` — 400
  - `errors.auth.forbiddenRedirect` — 403, clé DÉDIÉE (pas `auth.sessionExpired`) pour
    ne pas graver l'erreur sémantique dans les 4 locales
  - réutilisées : `errors.auth.sessionExpired` (401), `errors.server.error` (500)

## Prémisses d'énoncé infirmées

- « Ajouter des tests couvrant … la non-duplication du 400 » supposait une
  correction dans `SecuritySection.tsx`. FAUX : avec l'opt-out côté transport, le
  composant est déjà correct — il ne reçoit qu'un commentaire de couplage. Retirer
  son `setError` aurait rendu l'échec totalement muet.
- Le 401 change de libellé : `auth.sessionExpired` (« Votre session a expiré.
  Veuillez vous reconnecter ») ne mentionne plus la redirection à venir, contrairement
  à la chaîne en dur. Comportement (redirection 1,5 s) inchangé. Réutilisation de la
  clé existante préférée à une quasi-duplication, conformément au cadrage.

## Tests

- `./scripts/test-quiet.sh frontend-unit` → **1873 passed / 0 failed**, 147 fichiers, 25,6 s
- `npx tsc --noEmit` → 0 erreur
- `prettier --check .` (binaire réel, `frontend/`) → « All matched files use Prettier code style! »
- `src/__tests__/i18n-namespaces.test.ts` → inclus, vert (namespace `errors` résout, 4 locales alignées)
- **Mutation-test des 2 gardes neuves** (les gardes sont ARMÉES, pas décoratives) :
  - `INLINE_VALIDATION_ENDPOINTS` vidé → rouge à `apiClient.test.ts:167`
  - retour à la chaîne FR en dur sur le 500 → rouge à `apiClient.test.ts:215`
- Scope E2E : **non lancé** (exclusivité Playwright attribuée à un autre agent).

## [MEMORY:\*] signaux

[MEMORY:pattern] Problème : traduire un message depuis un module hors React
(intercepteur axios) alors que `useTranslations` est un hook et que `loadMessages`
(`frontend/i18n.ts`) est du code SERVEUR (`node:fs`). Solution : registre de module
(`setX(t)` / `translateX(key)`) alimenté par un composant `null` monté sous
`NextIntlClientProvider`, repli FR + garde anti-clé-brute. Même motif que
`networkStatus.ts` (#76) — le dépôt a donc DEUX ponts transport→React de même forme.
Anti-pattern : recopier les libellés dans un fichier TS (2e source de vérité) ; le
neutraliser par un test qui compare le repli au JSON `fr` valeur par valeur.

[MEMORY:decision] Contexte : un 400 signalé deux fois (toast global + inline).
Décision : opt-out CIBLÉ par liste d'endpoints, pas suppression du toast global.
Pourquoi : la majorité des formulaires n'ont AUCUNE gestion inline du 400 — un
retrait global les rendrait muets (régression silencieuse, pire que la redondance).
Corollaire : la liste d'opt-out 400 doit rester DISTINCTE de `INLINE_AUTH_ENDPOINTS`,
qui court-circuite tous les statuts ; la réutiliser aurait désarmé la redirection sur
un vrai 401 de `/me/change-password`.

[MEMORY:pitfall] Contexte : changer un libellé servi par un toast casse des
assertions de regex ailleurs. `apiClient.test.ts:64` assertait `/session expirée/i` ;
la clé i18n réutilisée dit « session **a** expiré » — accord grammatical différent,
échec non évident à la lecture du diff. Prévention : après tout remplacement de
chaîne en dur par une clé i18n, grepper les regex de test qui citent l'ancienne
chaîne, ne pas se fier au seul run ciblé du fichier modifié.

## Recommandations suite

RECOMMAND_FOLLOWUP: **403 sémantiquement faux** — `apiClient.ts` branche 403 affiche
`errors.auth.forbiddenRedirect` (« Votre session a expiré, redirection vers la page de
connexion… ») ET redirige vers `/login`. Un 403 = accès refusé, pas session expirée :
l'utilisateur authentifié à qui l'on refuse une ressource est déconnecté de fait. Hors
périmètre de #713 (traduit tel quel, comportement inchangé). Le correctif est
localisé : changer le libellé de la clé dédiée dans les 4 locales + décider si la
redirection doit disparaître au profit de la page `errors.forbidden` (qui existe déjà
dans `errors.json`, groupe `forbidden`, inutilisée par l'intercepteur).

RECOMMAND_FOLLOWUP: **couverture E2E non écrite** (Playwright exclusif à un autre
agent). Spec attendue, `frontend/e2e/settings-security.spec.ts` : se connecter, ouvrir
`/[locale]/settings` onglet Sécurité, soumettre le formulaire avec un mauvais
`oldPassword` → attendre `[data-testid="password-old"]` porteur d'un message d'erreur
ET asserter qu'AUCUN toast n'apparaît (`expect(page.locator('[data-testid="toast"]'))
.toHaveCount(0)`, sélecteur à confirmer dans `ui/toaster.tsx`). Second cas, locale
`en` : forcer une 500 via `page.route` sur un appel de données et asserter que le toast
sort en anglais (« Server error… »), ce qui prouve le pont i18n en navigateur réel —
les tests unitaires ne montent pas le vrai `layout.tsx`.

RECOMMAND_TEST_RUNNER: suite frontend à 1873 tests (> seuil 500 du briefing). Elle
tient en 25,6 s ici, donc rien d'urgent — mais le seuil est franchi, je le signale
plutôt que de le trancher seul.

## Fichiers de contexte lus

- Briefing #713 (pré-injecté : extraits `br-auth`, `cp-frontend`)
- `frontend/src/services/apiClient.ts`
- `frontend/src/services/apiClient.test.ts`
- `frontend/src/services/networkStatus.ts`
- `frontend/src/services/userService.ts` (extrait — URL réelle `/me/change-password`)
- `frontend/src/contexts/NetworkStatusContext.tsx` (extrait)
- `frontend/src/components/settings/SecuritySection.tsx`
- `frontend/app/[locale]/layout.tsx`
- `frontend/src/__tests__/i18n-namespaces.test.ts`
- `frontend/src/i18n/locales.ts`
- `frontend/public/locales/{fr,en,es,de}/errors.json`
- `frontend/package.json` (scripts)
- `scripts/test-quiet.sh` (en-tête des scopes)

STATUS: COMPLETED
