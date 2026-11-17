# Issue #508 — PasswordStrength aligné sur la politique réelle

## Commits

- commit unique — `:bug: fix(settings): aligner PasswordStrength sur PASSWORD_POLICY (#508)`
  (SHA non noté ici : ce fichier EST dans le commit, donc tout SHA écrit avant coup est
  périmé par l'amend. Résoudre par
  `git log --oneline -1 -- frontend/src/components/settings/PasswordStrength.tsx`)

## Résumé

Objectif : l'indicateur de force ne doit plus contredire `@StrongPassword` (8..100 + majuscule + chiffre).

Fichiers modifiés :

- `frontend/src/components/settings/PasswordStrength.tsx` — import `PASSWORD_POLICY` depuis `@/lib/schemas/auth` (pas de `8` en dur) ; seuil bas `>= PASSWORD_POLICY.minLength` ; littéraux `/[A-Z]/` et `/[0-9]/` remplacés par `PASSWORD_POLICY.uppercase` / `.digit` ; JSDoc réécrite (disait « la contrainte réelle (>= 6) est portée par le schéma Zod » — faux depuis #148).
- `frontend/src/components/settings/PasswordStrength.test.tsx` — 14 tests (était 6).

Décisions :

- Le seul relèvement 6 → 8 NE SUFFIT PAS au critère 3. `Abc123!` (7 car., refusé serveur) scorait 4 → `strong` ; avec le seuil à 8 il score 3 → `medium`, toujours un mensonge. Ajout d'une **porte** `meetsPolicy(password)` + `levelFromPassword(password)` : si le serveur refuserait, le niveau est `weak`, point. `levelFromScore` reste exporté, inchangé, appelé derrière la porte.
- Invariant obtenu (asserté dans les tests) : `weak` ⇔ refusé serveur. Un mot de passe conforme score toujours ≥ 2 (longueur + chiffre) donc jamais `weak`.
- Pas de cycle d'import (`auth.ts` n'importe que `zod`), `tsc --noEmit` rc=0.
- `frontend/e2e/settings-security.spec.ts` NON MODIFIÉ : lu, il n'asserte aucun libellé de niveau (seulement `toBeVisible` / `toHaveCount(0)` sur `password-strength`). `NewStrong123!` reste `strong`. Aucun risque CI.
- `SecuritySection.tsx` lu seulement (importe uniquement le composant, pas les fonctions de scoring).

## Table des niveaux AVANT/APRÈS

| mot de passe    | serveur | AVANT              | APRÈS      |
| --------------- | ------- | ------------------ | ---------- |
| `abcdefg` (7)   | refusé  | score 1 → `weak`   | `weak`     |
| `Abcdefg1` (8)  | accepté | score 3 → `medium` | `medium`   |
| `abcdefgh` (8)  | refusé  | score 1 → `weak`   | `weak`     |
| `Abcdefghij1`   | accepté | score 4 → `strong` | `strong`   |
| `Abc123!` (7) † | refusé  | score 4 → `strong` | **`weak`** |

† cas hors liste demandée, mais c'est LE cas qui prouve le bug : seul lui change de niveau.

## Prémisses d'énoncé infirmées

- L'énoncé (et le briefing) supposent que remonter le seuil 6 → 8 suffit. FAUX : `Abc123!` restait affiché `medium`, alors que le serveur le refuse. Le critère 3 exigeait la porte `meetsPolicy`.
- Le briefing annonçait `frontend/e2e/settings-security.spec.ts` comme potentiellement à adapter — vérifié l.33-49 : aucune assertion de libellé de niveau, donc aucune adaptation nécessaire.
- Les 4 cas limites imposés ne changent AUCUN de niveau entre AVANT et APRÈS (cf. table) — ils ne démontrent pas le bug à eux seuls.

## Tests

- `npx vitest run src/components/settings/PasswordStrength.test.tsx` → 14 passed / 0 failed
- `./scripts/test-quiet.sh frontend-unit` → 1849 passed / 0 failed (145 fichiers, 35s)
- `./scripts/test-quiet.sh unit` (backend) → 632 passed / 0 failed
- `tsc --noEmit` → rc=0
- `npm run format:check` (dépôt entier) → clean

## [MEMORY:\*] signaux

[MEMORY:pitfall] Contexte: #508, indicateur de force de mot de passe désynchronisé de la politique serveur. Un seuil numérique dupliqué dérive en silence (6 vs 8 pendant 24 sprints) parce que rien ne le relie à sa source. Solution: importer la constante partagée (`PASSWORD_POLICY`) plutôt que recoder la valeur. Prévention: dans un composant de feedback UI, toute valeur qui reflète une règle serveur doit être IMPORTÉE, jamais retapée.

[MEMORY:pattern] Problème: un indicateur heuristique (score 0..4) peut afficher « fort » pour une saisie que le serveur refuse — corriger le seuil ne le corrige pas, car le score agrège plusieurs critères indépendants. Solution: séparer la PORTE (`meetsPolicy` = réplique booléenne exacte de la validation serveur) du DEGRÉ (score heuristique) ; le degré n'est calculé que si la porte passe, sinon niveau plancher. Anti-pattern: régler les pondérations du score en espérant que le cas refusé retombe sous le seuil d'affichage.

[MEMORY:decision] Contexte: #508 critère « un mot de passe refusé ne doit jamais s'afficher strong ni idéalement medium ». Décision: `levelFromPassword` plafonne à `weak` TOUT mot de passe non conforme, sans gradation intermédiaire. Pourquoi: la gradation d'un mot de passe refusé n'a aucune valeur pour l'utilisateur et rouvre la porte à la contradiction ; l'invariant `weak ⇔ refusé serveur` est testable en une assertion et ne peut plus dériver.

## Recommandations suite

RECOMMAND_FOLLOWUP: aucun autre consommateur de `PASSWORD_POLICY` n'a été audité. Un balayage des composants de feedback UI liés à des règles backend (compteurs de caractères, hints de formulaire) pourrait révéler la même dérive de constante dupliquée. Priorité basse, hors périmètre #508.

## Fichiers de contexte lus

- `frontend/src/components/settings/PasswordStrength.tsx`
- `frontend/src/components/settings/PasswordStrength.test.tsx`
- `frontend/src/lib/schemas/auth.ts`
- `frontend/src/components/settings/SecuritySection.tsx` (l.23, l.135 — lecture seule)
- `frontend/e2e/settings-security.spec.ts` (l.25-50 — lecture seule)
- `scripts/test-quiet.sh` (scopes disponibles)
- Context-packs `br-auth` (BR-AUT-003) et `cp-frontend`, inlinés dans le briefing

STATUS: COMPLETED
