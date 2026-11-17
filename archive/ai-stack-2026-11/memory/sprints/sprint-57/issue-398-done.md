# Issue #398 — [TEST] Options de settings-preferences.spec.ts ciblées par libellé traduit

**Sprint :** 57 | **Vague :** 2 (parallèle avec #318) | **Taille :** XS | **Domaine :** settings
**Commit :** `af33171` — `:white_check_mark: test(settings): cible les options Préférences par data-testid dérivé de la valeur (#398)`

> **Rendu initialement en `STATUS: PARTIAL`** (spec E2E non jouée). **`PARTIAL` levé par l'audit
> Phase 6** : `settings-preferences.spec.ts` est **verte** (3/3). Détail du diagnostic plus bas.

## Objectif

Cinq sélections de `settings-preferences.spec.ts` ciblaient les options par leur **libellé traduit**
(`'Sombre'`, `'Clair'`, `'Compact'`, `'Confortable'`, `'English'`) : fragiles au moindre changement
de texte, et cassantes dans une autre locale.

## Périmètre réel — plus large que l'estimation de l'issue

L'issue annonçait « XS — remplacement de sélecteurs sur un fichier de test déjà existant ».
**Faux** : les `SelectItem` de `PreferencesSection.tsx` n'avaient **aucun `data-testid`** (seuls les
trois `SelectTrigger` en avaient). Il n'y avait donc rien sur quoi basculer — il a fallu d'abord
instrumenter le composant. **Deux fichiers, pas un.**

## Ce qui a été fait

5 `data-testid` ajoutés sur les `SelectItem`, dérivés de la **valeur technique** :
`pref-language-option-{fr|en|es|de}`, `pref-theme-option-{light|dark|system}`,
`pref-density-option-{compact|normal|comfortable}`. Les 5 sélections de la spec basculées dessus.

**Convention #331 respectée** — retrouvée dans le code (commit `9791d61`,
`test(e2e): expose des data-testid sur les options de <Select> (#331)`) : `<champ>-option-<valeur>`,
valeur brute et non libellé i18n. Préfixe aligné sur les testids de trigger existants.

**Vérifié par le lead** : plus **aucun** `getByRole('option', { name: … })` dans la spec.
Les 3 `SelectTrigger` n'ont pas été touchés. Commit isolé à 2 fichiers.

**Propagation Radix** (confirmée par la review, `select.tsx:131-138`) : `SelectItem` fait `{...props}`
sur `SelectPrimitive.Item`, qui rend l'élément `[role=option]` du portail → le testid atterrit bien
dessus. Établi par lecture de code, **puis confirmé à l'exécution** par l'audit Phase 6.

## Le `PARTIAL` et sa résolution

Le subagent n'a pas pu jouer sa spec et a conclu à un problème de **CORS** doublé d'un
« backend register injoignable ». **Ce diagnostic était faux.**

Chaîne réelle, établie par le lead :
1. Le serveur de dev Next avait été **arrêté** par l'agent de #299 en fin de vague 1 — rien
   n'écoutait sur `:3000`.
2. L'audit Phase 6 a relancé un frontend sur **`:3100`** (option B du runbook S47). Le proxy et le
   backend répondaient (`curl` register → **201**), mais les specs échouaient toujours.
3. Le message instrumenté du fixture a tranché : **`statuts HTTP observés : [403, 403, 403]`**.
   Le proxy Next transmet `Origin: http://localhost:3100`, que le backend refuse — le profil `dev`
   fige `app.cors.allowed-origins=http://localhost:3000`. C'est le **piège n°2 du runbook S47**.
   `curl` passait précisément parce qu'il n'envoie pas d'en-tête `Origin`.
4. Frontend redémarré sur **`:3000`** avec `NEXT_PUBLIC_API_URL=/api` +
   `E2E_API_PROXY_TARGET=http://localhost:8080` → tout passe.

Deux pistes ont été écartées **avant** d'accuser le CORS, et méritent d'être notées :
- Identités périmées dans `e2e/.auth/accounts.json` → écartée : `globalSetup` appelle bien
  `clearPersistedAccounts()`, les identités du run étaient fraîches.
- Arithmétique de la fixture (username borné 3..20, BR-AUT-003) → écartée : 15 caractères, conforme.

## Tests (audit Phase 6, chiffres réels)

- **`settings-preferences.spec.ts` : 3/3 VERTE** (thème, densité, langue)
- Suite settings complète + `auth-guard.spec.ts` : **37 passed / 1 skipped**
- Suite E2E complète : 127 passed / 3 failed / 8 skipped — les 3 échecs sont
  `forgot-password` + `reset-password-failures`, **d'environnement** : l'endpoint
  `/api/test-support/password-reset-token` renvoie 401 car le backend docker ne tourne pas avec le
  profil `e2e`. Le fixture le diagnostique lui-même. **Sans rapport avec ce sprint** (aucun commit
  ne touche au parcours de réinitialisation).
- Unitaires frontend : 855/855 · `tsc` : 0 erreur

## Indépendance de la locale

**Prouvée par construction** : tous les sélecteurs dérivent de la valeur technique, zéro libellé
traduit ne subsiste dans la spec. Le test « langue » traverse la bascule `/fr/` → `/en/` et passe.
**Non prouvé** : un run complet de la spec dans une seconde locale de départ.

## Pitfalls

`[MEMORY:pitfall]` — **Un échec de provisioning E2E accuse toujours la mauvaise cause.** Dans ce
seul sprint, le même symptôme (« suite entièrement rouge dès le setup ») a reçu trois diagnostics
successifs — CORS supposé, backend injoignable, identités périmées — pour une **cause initiale
banale** : aucun serveur de dev sur le port. Puis, une fois relancé sur un autre port, une **cause
réellement CORS** mais pour une raison différente de celle supposée (l'`Origin` transmis par le
proxy, pas un appel cross-origin du navigateur). Réflexe à retenir : **lire les statuts HTTP
instrumentés par le fixture** (`watchRegisterResponses`) avant toute hypothèse, et se méfier d'un
`curl` qui réussit — il n'envoie pas d'`Origin` et ne prouve donc rien sur le CORS.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — **couverture E2E de `settings-header`** : ce testid (ajouté par #299) n'est
  référencé par **aucune spec**. Le palier 768 px, où ce header est la seule sortie, reste vérifié
  **uniquement à la main**. Candidat naturel à `/create-e2e`.
- `RECOMMAND_FOLLOWUP` — **le backend E2E local doit tourner avec le profil `e2e`**, sinon 3 specs
  de réinitialisation de mot de passe rougissent en permanence en local.
- Aucun `RECOMMAND_SECURITY`, `RECOMMAND_DB_EXPERT`, `RECOMMAND_UI_DESIGN`.

STATUS: COMPLETED
