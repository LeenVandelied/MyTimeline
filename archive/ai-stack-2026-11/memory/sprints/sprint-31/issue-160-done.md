# Issue #160 — done

## Sites corrigés
- `frontend/src/services/authService.ts:61` — `console.error('Erreur lors du rafraîchissement du token:', error)`
  → `console.error(..., safeErrorMessage(error))` + import `safeErrorMessage` depuis `@/lib/safe-error`.
- Autres sites listés dans le briefing (dashboard/page.tsx, EventContent.tsx, AddProducts.tsx) : déjà migrés avant ce run (confirmé). Aucun changement nécessaire.
- `apiClient.ts:151` (log objet 403) : déjà sûr — ne garde que `url`/`method`/`response.data`, pas de `headers`/`config.data`.

## Garde ESLint anti-récidive (PIT-S7-003, 4e récurrence)
Fichier : `frontend/eslint.config.mjs`.
Règle : `no-restricted-syntax` sur tous les `**/*.{ts,tsx}` (hors `*.test.*`/`*.spec.*`) :
```
selector: 'CallExpression[callee.object.name="console"][callee.property.name="error"][arguments.length=2][arguments.1.type="Identifier"]'
```
Détecte `console.error('msg', error)` (2e argument = identifiant brut, ni `CallExpression` type `safeErrorMessage(error)`, ni objet littéral assaini).

Limite documentée dans le commentaire du rule : un identifiant intermédiaire réassigné avant l'appel (`const e = error; console.error('msg', e)`) contourne la règle — accepté comme trade-off simplicité/robustesse (cf. consigne briefing : "règle simple documentée" plutôt que regex fragile).

Vérification manuelle (snippet démo temporaire `src/services/__eslint-demo-160.ts`, supprimé après test) :
```
console.error('demo raw leak', error)
```
→ `npx eslint` : 1 erreur `no-restricted-syntax` (règle déclenchée). Snippet retiré ensuite.

`npx eslint src/ app/` sur le code réel : `ESLint: No issues found` (aucun faux positif sur les usages `safeErrorMessage(error)` ni sur `console.error(error)` mono-argument des error boundaries `app/error.tsx` / `app/[locale]/error.tsx`, hors scope — pattern Next.js standard sur `Error`, pas un objet axios).

## Grep final (critère d'acceptation)
```
grep -rn "console.error" frontend/app frontend/src | grep -vE "safeErrorMessage |apiClient"
```
Restant : uniquement `console.error(error)` mono-argument dans `app/error.tsx:76` et `app/[locale]/error.tsx:40` (Next.js error boundary standard, hors scope de l'issue — pas un objet erreur axios/HTTP porteur de credentials) + lignes de commentaires/tests mentionnant `console.error` en texte.

## Tests
`./scripts/test-quiet.sh frontend` → 54 fichiers, 383 tests, tous verts.

## [MEMORY:pitfall]
Contexte : 4e récurrence de la fuite `console.error(msg, <axios error brut>)` (PIT §85 / PIT-S7-003) malgré le helper `safeErrorMessage` disponible depuis plusieurs sprints.
Solution : garde ESLint `no-restricted-syntax` ajoutée (`frontend/eslint.config.mjs`) qui échoue au lint sur tout `console.error('msg', <identifiant brut>)` à 2 arguments.
Prévention : la récidive était purement humaine (nouveaux sites ajoutés sans relire le pitfall) — un lint automatique bloque désormais la classe d'erreur en CI/pre-commit au lieu de compter sur la revue manuelle.

## Recommandations suite
Pas de RECOMMAND_TEST_RUNNER : suite frontend déjà verte, exécutée directement (383 tests, rapide).
Pas de RECOMMAND_DB_EXPERT / RECOMMAND_SECURITY_EXPERT : scope purement frontend logging, aucun changement backend/DB.

STATUS: COMPLETED
