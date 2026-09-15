# Issue #447 — garde-fou source contre un focus invisible réintroduit

**Vague :** 1 (parallèle avec #446 et #442) | **Taille :** S | **Commit :** `c2e027b`
*(SHA rendu par le `git commit` du subagent ; HEAD a pu bouger — worktree partagé, cf. reconstitution par `git show --stat`)*

## Objectif

Poser au niveau **source** la garantie que `PIT-S58-004` disait acquise sans l'être : empêcher
qu'un `box-shadow` seul redevienne l'unique indicateur de focus des 3 contrôles du DS à `<input>`
masqué. Le seul filet existant était la spec E2E `sprint-62-control-focus-contrast.spec.ts`.

## Ce qui a été livré

Un seul fichier écrit : `frontend/src/styles/__tests__/control-border-tier.test.ts` (+276 l.).
`core.css` et `tokens/base.css` non touchés (lecture seule respectée) ; la spec E2E est intacte.

- `FOCUS_INDICATOR_CONTROLS` (les 3 sœurs visibles)
- `isFocusRuleFor()` — matcher de **forme composée** : sélecteur contenant `:focus` **et** le token
  de classe. Remplace l'égalité de sélecteur, inutilisable ici (cf. écart ci-dessous)
- `auditFocusIndicator(css, control) → FocusViolation[]`, 5 genres : `missing-rule`, `no-outline`,
  `box-shadow-only`, `outline-none`, `outline-not-focus-token`
- `withFocusRuleReplaced()` — mutation **en mémoire**, lève si la règle réelle a disparu
- 3 tests de garde + 15 tests d'armement + 1 test « disque intact » = **19 nouveaux**

Message d'échec passé en 2ᵉ argument d'`expect` (`PIT-S57-002` : Vitest décapite la valeur comparée
en CI).

## Contrôle négatif — le critère d'acceptation le plus exigeant, tenu

4 copies **mutées en scratchpad** de `core.css` (le fichier sur disque n'a jamais été modifié,
`git status` le confirme) :

| Mutation | Résultat |
|---|---|
| `box-shadow` seul (régression #415 exacte) | **3** gardes rouges, `kind: box-shadow-only` |
| `outline:none; box-shadow:…` | **3** rouges, `kind: outline-none` |
| règles de focus supprimées | **3** rouges, `kind: missing-rule` |
| `--color-focus` → `--color-rule` sur `.mt-check__box` **seul** | **1 seul** rouge — prouve que la garde est par contrôle et **non sur-large** |

Non-faux-positif vérifié : `.mt-input:focus` (box-shadow **cumulé** à un changement de bordure) est
hors périmètre et ne rougit pas — c'était le risque explicite de l'issue.

Les 15 tests d'armement sont **commités**, pas supprimés avant commit (`PIT-S62-003`).

## Écart au plan — l'issue se trompait de point d'accroche

Confirmé par lecture directe : **aucun** des 3 sélecteurs cités par l'issue (l.53-55) ne porte de
règle de focus. Les indicateurs sont sur `core.css` **l.160 / 172 / 189**, forme
`.mt-check input:focus-visible + .mt-check__box{outline:2px solid var(--color-focus)}`.
Suivre l'issue à la lettre avec le matcher existant `rule.selector.trim() !== selector` aurait rendu
`decls.length === 0` puis `toBeGreaterThan(0)` → **rouge sur du CSS parfaitement sain**.

Deux constats de l'architect confirmés, un corrigé :
- `base.css:144-149` pose bien un `:focus-visible` global mais ne couvre pas ces contrôles
  (`<input>` en `opacity:0;width:0;height:0`) — `PIT-S62-007`. Les règles de `core.css` sont bien
  le seul indicateur.
- **Correction apportée à l'architect** : `core.css:120-131` documente que `.mt-radio__dot` est
  *aussi* un spécimen DS, pas seulement `.mt-check__box`. Seul `.mt-switch__track` est monté en
  production (`EventEditForm.tsx:624`). La garde n'est donc pas vendue comme couvrant 3 contrôles
  applicatifs.

Aucun chemin fantôme.

## Tests

- Fichier seul : **28/28**
- `./scripts/test-quiet.sh frontend` : **988/988**, 98 fichiers, 23,7 s
- `npx eslint <fichier>` exit 0 ; `npx tsc --noEmit` 0 erreur hors `.next/`

## Non vérifié — déclaré par l'agent

- **Rendu navigateur** : non vérifié, et c'est structurel — un test de source CSS prouve ce que le
  CSS *déclare*, jamais ce qui est *peint*. Aucun ratio recalculé.
- `next build` non lancé (`.next` partagé, `PIT-S62-009` : casserait le `next dev` d'un agent
  voisin). `eslint` + `tsc --noEmit` lancés à la place.
- E2E `sprint-62-control-focus-contrast.spec.ts` non rejouée (fichier non modifié).
- **Le 988/988 n'est pas un baseline propre** : il inclut le travail en cours des 2 agents
  parallèles.

## Périmètre statué par écrit (dans l'en-tête du fichier)

Ce que la garde **ne** couvre pas : hors `core.css`, sélecteur voisin ou `:has()`, cascade/`@layer`,
aucun pixel ni ratio, et 2 des 3 contrôles sont des spécimens DS sans montage applicatif.

## Signaux mémoire

- `[MEMORY:pitfall]` — étendre un matcher de test CSS par inertie : les sélecteurs « surveillés »
  ne portent pas forcément la règle visée (focus sur forme composée frère-adjacent). Grepper la
  règle **réelle** avant d'étendre. Symétrique de `PIT-S61-006` (grepper les appelants).
- `[MEMORY:pattern]` — prouver rouge une garde qui lit un fichier source **partagé/lecture seule** :
  extraire l'audit en fonction pure `audit(css, cible)`, garde sur disque, armement sur copies
  mutées en mémoire **commitées**. Anti-patterns évités : muter puis restaurer (`PIT-S60-005`),
  supprimer les fixtures avant commit (`PIT-S62-003`).
- `[MEMORY:pattern]` — une fixture de mutation peut devenir un no-op silencieux :
  `expect(mutated).not.toBe(source)` + `throw` si la règle ciblée est absente.

## Recommandations suite

Négations explicites rendues : pas de `RECOMMAND_TEST_RUNNER` (suite frontend en 23,7 s, lancée et
lue), pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` (aucun backend, schéma, auth ou PII),
pas de `RECOMMAND_PLAYWRIGHT_REVIEWER` (aucune spec E2E modifiée).

`RECOMMAND_FOLLOWUP:` la garde ne détecte pas un `ring-*` / `outline-none` réintroduit dans un
`.tsx` — trou connu, écrit dans l'en-tête du fichier. Couvrirait `DEC-S58-001` côté TSX. [triage S |
domaine design]

STATUS: COMPLETED
