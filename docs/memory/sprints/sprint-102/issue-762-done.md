# Issue #762 — l'indicateur de force compte les lettres non-ASCII comme symboles

## Résumé
`scorePassword` (`frontend/src/components/settings/PasswordStrength.tsx`) aligné sur la sémantique Unicode de #735 :
- minuscule : `LOWERCASE = /(?=[\0-￿])\p{Lowercase}/u` — même définition (Ll + Other_Lowercase) et même borne BMP que `PASSWORD_POLICY.uppercase` ;
- symbole : `SYMBOL = /[^\p{L}\p{M}\p{N}]/u` — ni lettre, ni marque, ni nombre, itération par point de code.
`Ωabcdefg١` : 4 (`strong`) → 3 (`medium`). `meetsPolicy` / `levelFromPassword` (porte #508) inchangées. `PASSWORD_POLICY` non modifiée (la minuscule n'est pas une règle serveur, elle reste locale à l'heuristique).

Traitements décidés et documentés dans la JSDoc :
- (a) diacritique combinant NFD (`e` + U+0301) = `\p{M}` → pas un symbole (sinon un `é` décomposé noterait plus fort qu'un `é` précomposé) ;
- (b) lettre hors BMP (`𝐀`, `𝐚`) = lettre, pas un symbole ; ne compte pas non plus pour la casse (borne BMP de la politique) → n'apporte aucun point, sous-estimation assumée ;
- emoji, ponctuation, espace → symbole.

## Fichiers
- `frontend/src/components/settings/PasswordStrength.tsx`
- `frontend/src/components/settings/PasswordStrength.test.tsx`

Commit : `cd8f5e63`.

## Tests
- `cd frontend && npx vitest run src/components/settings/PasswordStrength.test.tsx` → 20 tests verts (14 → 20).
- Nouveau `describe('scorePassword — sémantique Unicode (#762)')`, 6 tests : `Ωabcdefg١` → 3 / `medium` ; minuscule non-ASCII (`ABCDEFGé!`, `ABCDEFGß!` → 3, ancien calcul 2) ; NFD `Abcdéfg1` → 3 / `medium` (ancien 4 / `strong`) ; emoji `abcdef😀` → 2 ; hors BMP `abcdef𝐀`, `ABCDEF𝐚` → 1 ; invariant #508 sur saisies non-ASCII (refusés `ωabcdefg١!`, `𝐀bcdefgh1!`, `Ωabcdefgh` → `weak` ; acceptés `Ωabcdefg١`, `ÉCOLEété1`, NFD → jamais `weak`).
- Mutation (retour aux regex ASCII) : 4 des 6 nouveaux tests rouges ; emoji et invariant #508 restent verts par construction (non-régression, pas discriminants). Restauré.
- `npx tsc --noEmit` 0 ; `npx eslint` 0 ; `rtk proxy npx prettier --check` EXIT=0.
- Vitest complet (`npx vitest run`, avant commit) : 156 fichiers / 1994 tests verts ; 7 lignes `stderr`, aucune issue des fichiers touchés.

## Écarts d'énoncé
- L'énoncé propose `\p{Lowercase}` « ou équivalent » : retenu, avec la borne BMP `(?=[\0-￿])` pour rester symétrique de la majuscule (PIT-S101-002, DEC-S101-002).
- Symbole : l'énoncé dit « ni lettre ni chiffre Unicode » ; ajout de `\p{M}` (marques) et élargissement à `\p{N}` entier (et non seulement `\p{Nd}`) : `²`, `½`, `Ⅰ` ne sont pas des symboles.
- Compteur de tests de `br-auth.md` : `PasswordStrength.test.tsx` n'y est pas cité (grep `PasswordStrength.test` dans `.ai-env/context-packs/*.md` → 0) ; rien à mettre à jour.

fichiers de contexte lus:
- `.ai-env/context-packs/pit-frontend.md` — PIT-S101-002 l.1679 (catégorie + itération + définition ; borne BMP)
- `.ai-env/context-packs/br-auth.md` — BR-AUT-003 l.55-60 (compteur `password-policy.test.ts` 58, pas de compteur `PasswordStrength`)
- `docs/memory/sprints/sprint-101/issue-735-done.md` — l.56 RECOMMAND_FOLLOWUP d'origine (`Ωabcdefg١` → 4)
- `docs/memory/decisions.md` — DEC-S101-002 (regex bornées au BMP)
- `frontend/src/lib/schemas/auth.ts` — `PASSWORD_POLICY` l.50-55

## Signaux mémoire
- [MEMORY:decision] Context: heuristique de force sans contrepartie serveur pour « minuscule » et « symbole ». Decision: minuscule = `/(?=[\0-￿])\p{Lowercase}/u` (symétrique de la majuscule de `PASSWORD_POLICY`) ; symbole = `/[^\p{L}\p{M}\p{N}]/u` ; marque combinante non-symbole, lettre hors BMP sans point. Why: ne jamais surévaluer ; un `é` NFD ne doit pas noter plus fort qu'un `é` NFC.
- [MEMORY:pitfall] Context: remplacer une classe ASCII par une classe Unicode dans un score additif. Solution: une lettre non-ASCII passait de « symbole » à « casse » : le total reste souvent identique, un test sur le seul score global ne discrimine rien. Prevention: construire des cas qui isolent une classe (ex. `ABCDEFGé!`, où le symbole est fourni par `!`) et vérifier par mutation qu'ils rougissent sur l'ancien code.

## Recommandations suite
- Pas de RECOMMAND_FOLLOWUP.
- Pas de RECOMMAND_DB_EXPERT : aucune donnée ni schéma.
- Pas de RECOMMAND_SECURITY : heuristique d'affichage ; la porte `meetsPolicy` (#508) et la validation serveur sont inchangées.
- Pas de RECOMMAND_TEST_RUNNER : Vitest complet exécuté en direct ; aucun E2E ne vérifie le niveau de force d'une saisie non-ASCII.
- Pas de RECOMMAND_UI_DESIGN : aucun rendu modifié, seul le niveau calculé change.

STATUS: COMPLETED
