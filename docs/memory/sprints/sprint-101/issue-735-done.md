# #735 — PASSWORD_POLICY ASCII vs serveur Unicode — DONE

Commit : `:bug: fix(auth): PASSWORD_POLICY suit la sémantique Unicode du serveur (#735)`

## Résumé

`PASSWORD_POLICY.uppercase` / `.digit` (`frontend/src/lib/schemas/auth.ts`) suivent désormais la sémantique du validateur serveur :
```ts
uppercase: /(?=[\0-￿])\p{Uppercase}/u,
digit: /(?=[\0-￿])\p{Nd}/u,
```
et non `/\p{Lu}/u` / `/\p{Nd}/u` comme le prescrivaient l'issue et le briefing (voir Écarts). `StrongPasswordValidator` parcourt la chaîne **`char` par `char`** (unités UTF-16) avec `Character.isUpperCase(char)`, qui vaut Lu + Other_Uppercase, et `Character.isDigit(char)`, qui vaut Nd. Vérification jshell sur JDK 21.0.6 : `Ⓐ` (U+24B6) → true, `Ⅰ` (U+2160) → true, `ǅ` (U+01C5, Lt) → false, moitié haute de `𝐀` (U+1D400) → false, moitié haute de `𝟎` (U+1D7CE) → isDigit false, `١` → true, `Ω` → true. La regex retenue reproduit exactement ces 7 verdicts (vérifié sous Node).

`passwordField()` et `rawPasswordField()` lisent `PASSWORD_POLICY`, ils suivent donc automatiquement. `meetsPolicy` et `scorePassword` (`PasswordStrength.tsx`) en dérivent aussi. Les sections ⚠ ont été retirées des JSDoc de `PASSWORD_POLICY` et de `meetsPolicy`. Le bloc `describe('divergence ASCII/Unicode avec le serveur (connue, non résolue)')` et sa JSDoc ont été **supprimés**, pas réparés.

## Fichiers

- `frontend/src/lib/schemas/auth.ts` — regex + JSDoc qui justifie `\p{Uppercase}`, le préfixe BMP et le drapeau `u`.
- `frontend/src/components/settings/PasswordStrength.tsx` — JSDoc de `meetsPolicy` sans section ⚠.
- `frontend/src/lib/schemas/password-policy.test.ts` — bloc divergence supprimé ; nouveau bloc `alignement Unicode avec le serveur (#735)`.

## Tests

- Avant suppression : après alignement, le bloc divergence rougit sur **2 tests**, pas 3 : « les regex ASCII… ne le reconnaissent PAS » et « le schéma brut le REFUSE… ». Le 3e, « a bien la longueur requise », ne dépend pas des regex et ne pouvait pas rougir. Cela confirme l'énoncé de l'issue (« en rend 2 rouges ») ; le briefing en annonçait 3.
- `password-policy.test.ts` : 52 → **58 tests** (49 conservés, 3 supprimés, 9 ajoutés) :
  - `Ωabcdefg١` accepté par les formulaires register / reset / change-password ;
  - `Ωabcdefg١` accepté par les schémas bruts `RegisterSchema` / `ResetPasswordSchema` ;
  - `meetsPolicy(Ωabcdefg١)` vrai et niveau ≠ `weak` ;
  - `Ⓐ` et `Ⅰ` comptent comme majuscule (×2) ;
  - `𝐀`, `𝟎`, `ǅ` et `²` sont refusés partout et affichés `weak` (×4 ; invariant #508 dans le sens « refusé serveur ⇒ refusé ici »).
- **Mutation** : avec la prescription littérale `/\p{Lu}/u` + `/\p{Nd}/u`, **4 tests rouges** : Ⓐ, Ⅰ, puis 𝐀 et 𝟎. Dans ces deux derniers cas, le formulaire accepterait et l'indicateur afficherait conforme un mot de passe que le serveur refuse.
- Ciblé `src/lib/schemas/` + `src/components/settings/` : 12 fichiers, **137/137 verts**.
- Suite complète (lue via `rtk proxy`) : **1961 passés, 1 échoué, 7 ignorés (1969) ; 2 fichiers rouges sur 153**. Ce sont les deux mêmes échecs d'environnement que pour #733 (`console-error-guard`, `palette-color-picker` : vitest 2.1.9 installé contre `^3.2.7` demandé, `eslint-plugin-storybook` absent). Aucun rapport avec #735.
- `tsc --noEmit` : 0 erreur sur les fichiers modifiés. `\p{…}` + `u` ne pose pas de problème malgré `target: ES2017` (TS 5.8.2). Erreurs résiduelles : stories et palette uniquement (environnement).
- Prettier (binaire direct) : conforme. Lint : non exécutable (`eslint-plugin-storybook` absent), non vérifié.
- Backend `PasswordPolicyTest` : non exécuté (aucun fichier backend touché).

## Écarts d'énoncé

- **Regex : `\p{Uppercase}` restreint au BMP au lieu de `\p{Lu}`, et `\p{Nd}` restreint au BMP.** La prescription littérale rompait le critère d'acceptation « l'invariant de #508 tient toujours ». `𝐀bcdefg1` ou `Abcdefg𝟎` passaient le formulaire et `meetsPolicy`, alors que le serveur les refuse. Elle laissait aussi `Ⓐbcdefg1` refusé côté client alors que le serveur l'accepte. Écart prouvé par la mutation ci-dessus. Le drapeau `u` est bien présent.
- 2 tests rouges et non 3 (voir Tests).
- La JSDoc dit « à la version Unicode près entre le JDK et le moteur JS » : les tables Unicode du JDK 21 et du navigateur peuvent différer sur des caractères récents. Ce résidu est inévitable et n'est pas testé.
- `br-auth.md` (BR-AUT-003, ligne **Tests**) annonce toujours `password-policy.test.ts (49)` ; le fichier en compte maintenant 58. Je n'ai pas modifié le pack (consolidation de fin de sprint).

## Signaux mémoire

- [MEMORY:pitfall] Contexte : #735, la prescription « aligner sur `/\p{Lu}/u` » répliquait la *catégorie* Java mais pas l'*itération* (`value.charAt(i)` = unités UTF-16) ni la définition de `isUpperCase` (Lu + Other_Uppercase). Solution : `/(?=[\0-￿])\p{Uppercase}/u`, vérifié contre jshell. Prévention : pour répliquer un validateur Java côté JS, vérifier le verdict dans les DEUX sens sur des cas limites (hors BMP, Other_Uppercase, Lt, No) avec jshell, pas seulement le cas qui a motivé l'issue.
- [MEMORY:decision] Contexte : #735 / DEC-S95-005 levée. Décision : `PASSWORD_POLICY` = `\p{Uppercase}` et `\p{Nd}` restreints au BMP ; DEC-S95-005 (divergence figée) est caduque. Pourquoi : réplique exacte de `Character.isUpperCase(char)`/`isDigit(char)`, sans laxisme possible (invariant #508).

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucune donnée ni schéma DB touché, la politique ne s'applique qu'à la saisie.
- Pas de RECOMMAND_SECURITY : le client ne peut pas être plus laxiste que le serveur, vérifié par les tests des cas hors BMP ; le serveur reste la source de vérité.
- Pas de RECOMMAND_TEST_RUNNER : Vitest exécuté en direct ; le backend n'est pas modifié.
- Pas de RECOMMAND_UI_DESIGN : aucun rendu modifié.
- RECOMMAND_FOLLOWUP: `scorePassword` (`PasswordStrength.tsx`) compte toute lettre ou chiffre non-ASCII comme « symbole » (`/[^A-Za-z0-9]/`) et `/[a-z]/` est ASCII. Mesuré : `Ωabcdefg١` → score 4 `strong`, alors que `Abcdefg1` → 3 `medium`. L'invariant #508 n'est pas touché, mais l'heuristique de force surévalue. Piste : `/[^\p{L}\p{N}]/u` et `\p{Ll}`. [XS | auth]
- RECOMMAND_FOLLOWUP: mettre à jour `br-auth.md` BR-AUT-003 (compteur `password-policy.test.ts` 49 → 58) et marquer DEC-S95-005 comme levée par #735 en fin de sprint. [XS | docs]

fichiers de contexte lus: backend StrongPasswordValidator.java → l.35 `if (Character.isUpperCase(c))` dans une boucle `value.charAt(i)` ; docs/memory/decisions.md → DEC-S95-005 « FIGÉE par des tests, pas corrigée » ; .ai-env/context-packs/br-auth.md → BR-AUT-003 « `password-policy.test.ts` (49) » ; docs/memory/sprints/sprint-101/briefing-A-733-735.md → « #735 — rappel crucial »

STATUS: COMPLETED
