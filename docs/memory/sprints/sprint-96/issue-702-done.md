# Issue #702 — Test E2E instable : flèche droite dans la palette du formulaire d'événement

Branche : `claude/sprint-96-start-b98611` (worktree `amazing-rubin-93b16e`, GF-1 vérifié :
`git rev-parse --abbrev-ref HEAD` → `claude/sprint-96-start-b98611`).

## Cause identifiée

**Le voleur de focus est le `Select` Radix du sélecteur de produit, qui rend le focus à son
déclencheur de façon DIFFÉRÉE. Le test ne l'attendait pas.** Ce n'est pas un défaut produit.

### La preuve (mesurée, pas déduite)

Sonde jetable `zz-lead-focus-probe.spec.ts` (supprimée depuis) : un écouteur `focusin` en
capture, posé sur le document, qui horodate chaque changement de focus. Poste local,
`next build` + `next start`, oracle `/api/auth/me` = 401 et `/fr/login` = 200.

**Sonde 1 — journal posé juste après la sélection du produit, puis `ArrowRight` :**

| passe | focus immédiat après `ArrowRight` | journal `focusin` |
|---|---|---|
| 1 | `shell-new-event-drawer-product-trigger` | t=5 cobalt · t=7 **pervenche** · t=12 **product-trigger** |
| 2 | `event-form-swatch-#6C7BE0` | t=4 cobalt · t=6 pervenche |
| 3 | `event-form-swatch-#6C7BE0` | t=5 cobalt · t=6 pervenche |

La passe 1 filme le vol en direct : le clavier pose bien le focus sur pervenche (t=7 ms),
puis à t=12 ms le focus part sur le déclencheur du `Select`. Les passes 2 et 3 ne le voient
pas — la restitution avait déjà eu lieu AVANT que la sonde soit posée. C'est une course.

**Sonde 2 — journal posé AVANT le clic sur l'option, pour dater la restitution :**

| passe | `expect(event-form).toBeVisible()` résolu à | restitution du focus au déclencheur |
|---|---|---|
| 1 | t = 32 ms (actif = product-trigger) | **t = 29 ms**, une seule fois |
| 2 | t = 20 ms (actif = `null`) | **t = 29 ms**, une seule fois |
| 3 | t = 32 ms (actif = product-trigger) | **t = 28 ms**, une seule fois |

### Le mécanisme, en une phrase

`SelectContent` de Radix est enveloppé d'un `FocusScope` qui, au démontage du contenu (donc
APRÈS l'animation de sortie), restitue le focus à l'élément précédemment focalisé — le
déclencheur. Cette restitution est **différée** et tombe à **t ≈ 28-29 ms** après le clic sur
l'option. Or le seul point d'attente qu'avait `openNewEventForm` était
`expect(event-form).toBeVisible()`, qui se résout à **t = 20-32 ms** : **à cheval sur la
restitution**. Quand `toBeVisible()` gagne la course, le test enchaîne `cobalt.focus()` puis
`ArrowRight` en quelques millisecondes, `handleKeyDown` fait son travail (`focus()` sur
pervenche **puis** `onChange`), et la restitution différée atterrit par-dessus.

D'où la signature exacte rapportée par l'issue et par #665 : **`aria-checked="true"` est bien
passé sur pervenche — la sélection avance — et seul `toBeFocused()` rend « inactive ».**

Les deux pistes que l'énoncé disait déjà écartées le sont bien : `palette-color-picker.tsx`
focalise avant `onChange` (l.149-150, inchangé), et `NewEventDrawer.tsx` ne déclenche aucun
auto-focus. La piste prioritaire de l'énoncé (« re-rendu pendant l'animation d'ouverture du
tiroir ») était **la bonne famille mais le mauvais composant** : ce n'est pas le tiroir qui
reprend le focus, c'est le `Select` imbriqué, et ce n'est pas un re-rendu mais une
restitution de `FocusScope`.

### Le produit ne vole rien à l'utilisateur

Mesuré, sonde 2, après stabilisation : `cobalt.focus()` + `ArrowRight` → focus sur pervenche,
et il **y reste 1,5 s** sans aucun autre `focusin`. La restitution du `Select` a lieu **une
seule fois**, ~29 ms après le clic sur l'option, et plus jamais. Aucun humain ne peut cliquer
une option, atteindre une pastille et presser une flèche en moins de 29 ms. Le comportement
du `Select` (rendre le focus à son déclencheur) est d'ailleurs le comportement attendu du
motif. **Il n'y a pas de vol de focus subi au clavier par l'utilisateur.**

## Correctif

`frontend/e2e/sprint-84-palette.spec.ts`, helper `openNewEventForm` — une ligne :

```ts
await expect(page.getByTestId('event-form')).toBeVisible()
// La restitution de focus du `Select` a eu lieu : plus rien ne bougera derrière nous.
await expect(productTrigger).toBeFocused({ timeout: CLICK_BUDGET })
```

Ce n'est **ni** un `waitForTimeout`, **ni** un retry, **ni** une assertion assouplie : c'est
l'attente déterministe de l'événement réel qui manquait. `toBeFocused()` sonde jusqu'à ce que
la restitution soit faite ; elle est vraie immédiatement si elle a déjà eu lieu.

### Garde-fou anti-masquage (le piège central de l'issue)

Parce que « corriger côté test peut masquer un vrai vol de focus », j'ai ajouté au test
clavier un **oracle de durabilité en lecture UNIQUE et NON réessayée** : après les assertions
existantes (qui, elles, réessaient et ne diraient donc rien d'une reprise tardive), une
fenêtre de repos de 600 ms puis un `page.evaluate(() => document.activeElement…)` en un coup.
Si un re-rendu du formulaire ou du tiroir reprenait le focus au clavier, cette lecture le
verrait — l'attente ajoutée en amont ne peut pas la masquer, puisqu'elle porte sur un
événement antérieur au geste clavier.

## Preuve de stabilité

Boucle EXACTE utilisée (10 invocations SÉQUENTIELLES du runner, pas `--repeat-each` —
PIT-S95-002) :

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do
  SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy \
    npx playwright test e2e/sprint-84-palette.spec.ts \
      --grep "flèche droite depuis la pastille cochée" --workers=1 --reporter=line
  sleep 15            # ← indispensable, cf. PIT ci-dessous
done
```

| campagne | cible-KO / 10 | setup-KO / 10 |
|---|---|---|
| **AVANT correctif** | **6** | 0 |
| **APRÈS correctif** | **0** (10/10 verts) | 0 |

Chaque invocation sélectionne **6 tests** (5 `setup` + la cible), vérifié par `--list`.

### Contrôle négatif — quelle ligne porte le correctif

Pour prouver que c'est bien l'attente ajoutée qui verdit, et non l'oracle de durabilité :
j'ai neutralisé **la seule ligne** `await expect(productTrigger).toBeFocused(...)` en gardant
tout le reste (oracle compris), puis rejoué 6 fois. **Résultat : 2 échecs / 6, tous sur
`toBeFocused()`** — le flake revient. La ligne est bien load-bearing. Spec restaurée ensuite
(`/usr/bin/grep -n "NEGATIVE"` → aucun résultat).

## Spec déléguée #633

`frontend/e2e/settings-mobile.spec.ts` — **exécutée pour la première fois. 7 passed / 0 failed**
(5 `setup` + 2 tests de la spec), 4,0 s, `rc=0`.

- `settings-mobile.spec.ts:19` — drill-down + bottom sheet suppression → **passed**
- `settings-mobile.spec.ts:64` — cible tactile ≥ 44×44 + en-tête sans débordement → **passed**

**Rien à corriger : aucun commit #633 supplémentaire.** J'ai contrôlé que ce vert n'est pas
vacant (GF-6) : le test mesure réellement — `boundingBox()` sur `mobile-settings-back` au
viewport 375 px, bord droit du titre ≤ 375, `scrollWidth - clientWidth ≤ 0`, puis clic de
retour fonctionnel. Assertions en `expect.soft`, donc un dépassement serait rapporté, pas
avalé. Ce n'est pas une spec de capture → GF-5 sans objet, et `git status | grep darwin` est
vide.

## Fichiers modifiés

- `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e/frontend/e2e/sprint-84-palette.spec.ts`
  (seul fichier ; +44 / −2)

**Aucun fichier de production n'est touché.** En particulier `palette-color-picker.tsx`,
`EventEditForm.tsx` et `NewEventDrawer.tsx` sont **inchangés** — la mesure a montré que le
défaut n'était pas chez eux. Le volet « Designer » du briefing est donc sans objet : aucun
comportement perçu au clavier ne change (ordre de navigation, anneau de focus et sémantique
sont identiques au commit `14363a50`).

## Tests

Pile : image `amazingrubin93b16e-backend-e2e:latest` (17/09 22:13) re-taguée sans rebuild —
dernier commit `backend/` = `41aa3c76` du 17/09 22:08, donc antérieur à l'image.
`docker compose -p amazingrubin93b16e --profile e2e up -d --no-build backend-e2e`, backend sur
`:8085`. Front : `next build` puis `next start -p 3000` avec `NEXT_PUBLIC_API_URL=/api` et
`E2E_API_PROXY_TARGET=http://localhost:8085` **posées au BUILD** (rewrite vérifié dans
`.next/routes-manifest.json` → `localhost:8085/api/:path*`).
Oracle avant chaque campagne : `/api/auth/me` → **401**, `/fr/login` → **200**.

### Specs rejouées — liste grep COMPLÈTE du briefing, en un run groupé `--workers=1`

`categories.spec.ts`, `sprint-70-preview-visual.spec.ts`, `sprint-73-model-vs-rendered.spec.ts`,
`sprint-84-palette.spec.ts`, `sprint-95-toast-overlap.spec.ts`, `timeline.spec.ts`,
`sprint-96-palette-geometry.spec.ts`, `settings-mobile.spec.ts`
→ **67 passed / 0 failed** (1,1 min), `rc=0`.

`git status --porcelain | /usr/bin/grep darwin` après tous les runs → **vide**. Aucun PNG
`-darwin` produit, donc aucun « vert vide » au sens de PIT-S95-003/GF-5.

### Statique (binaires DIRECTS, GF-2)

- `./node_modules/.bin/prettier --check .` (dépôt frontend entier) → **All matched files use
  Prettier code style!**
- `./node_modules/.bin/tsc --noEmit` → **0 erreur**. Non-vacuité contrôlée :
  `tsc --noEmit --listFiles | /usr/bin/grep -c "e2e/sprint-84-palette.spec.ts"` → **1**, le
  fichier modifié est bien dans le programme typé.
- `npx next lint --file e2e/sprint-84-palette.spec.ts` → **No ESLint warnings or errors**.

### Ce que je n'ai PAS vérifié

- `./scripts/test-quiet.sh frontend` **non lancé** : il reconstruit `.next` pendant qu'un
  `next start` sert la même arborescence (PIT-S95-001 / GF-4). Mon changement ne porte que sur
  un fichier `e2e/`, qui n'entre pas dans `next build` ; `tsc` et `next lint` le couvrent. Le
  `next build` a quand même tourné en amont de la pile (exit 0).
- **Vitest non relancé** : aucun fichier sous `src/` ni `app/` n'est touché.
- Le 10/10 vaut **pour ce poste**. Je n'ai pas de mesure CI Linux de la campagne répétée.

## Recommandations suite

- **`RECOMMAND_UI_DESIGN`** — *décision ouverte, pas un défaut, héritée de #665.* Depuis la
  grille 6×2 (`14363a50`), la mise en page est franchement bidimensionnelle alors que
  `handleKeyDown` reste **linéaire** (→/↓ = +1, ←/↑ = −1). Conséquence perçue :
  `ArrowRight` depuis la 6e pastille descend d'une ligne, et `ArrowDown` avance d'**une** case
  et non de six. C'est conforme au motif `radiogroup` de l'APG (un groupe n'a qu'un ordre) et
  **je n'y ai pas touché** — mais c'est un arbitrage produit, pas un oubli, et il mérite d'être
  tranché explicitement plutôt que de rester implicite. Je ne l'ai pas tranché seul, comme le
  demandait le briefing.
- Pas de `RECOMMAND_DB_EXPERT`, pas de `RECOMMAND_TEST_RUNNER`, pas de `RECOMMAND_SECURITY` : rien dans cette issue ne touche la base, le backend ni la sécurité.

---

### `[MEMORY:pitfall]`

**Contexte :** N invocations séquentielles du runner Playwright pour mesurer un flake.
**Symptôme :** ma première campagne de 10 a rendu « 5 échecs / 10 » — mais les runs 8, 9 et 10
avaient échoué sur le projet **`setup`** avec un **HTTP 429**, pas sur la cible, qui n'a même
jamais tourné. Chaque invocation purge `.auth/accounts.json` et re-provisionne **4 comptes** ;
le seau `register` est **partagé, 30/min/IP** sous le profil e2e. Autour de la 8e invocation,
le budget cède.
**Solution :** espacer les invocations (`sleep 15` → ~4 runs/min ≈ 16 registers/min) ET
classer chaque run en `SETUP-KO` / `CIBLE-KO` / `OK` en grepant `auth.setup.ts` dans le log,
au lieu de se fier au seul code de retour. Campagne re-mesurée proprement : **6/10 avant, 0/10
après, 0 `setup-KO` des deux côtés**.
**Prévention :** un chiffre de flake obtenu par une boucle serrée sans pacing est faux —
il mélange le flake étudié et l'épuisement du rate-limit qu'il provoque lui-même.

### `[MEMORY:pitfall]`

**Contexte :** sélectionner un test par **numéro de ligne** (`spec.ts:128`) dans une boucle de
mesure.
**Symptôme :** après mon correctif, le test avait glissé en ligne 154. Les 10 invocations ont
rendu `Error: No tests found.` avec un code de retour **non nul** — ma boucle les a comptées
« 10 CIBLE-KO », c.-à-d. le pire résultat possible, alors que **rien n'avait tourné**. Un
compteur naïf aurait conclu à une aggravation massive du flake.
**Solution :** sélectionner par **titre** (`--grep`), stable au décalage de lignes, et vérifier
la cardinalité attendue par `--list` (ici 6 tests = 5 `setup` + la cible) avant de lancer la
campagne.
**Prévention :** dans toute boucle de mesure, « exit ≠ 0 » ≠ « le test a échoué ». Compter les
tests RÉELLEMENT exécutés, jamais le seul code de retour.

### `[MEMORY:pattern]`

**Problème :** un E2E qui interagit au clavier juste après avoir fermé un overlay Radix
(`Select`, `Popover`, `Dialog`, `DropdownMenu`) échoue par intermittence sur `toBeFocused()`,
alors que l'effet de la touche (ici `aria-checked`) est bien appliqué.
**Solution :** le `FocusScope` de Radix restitue le focus au déclencheur de façon **différée**
(au démontage du contenu, après l'animation de sortie) — mesuré ici à **t ≈ 28-29 ms** après
le clic sur l'option. Attendre cet événement de façon déterministe :
`await expect(trigger).toBeFocused()` juste après la fermeture, AVANT tout geste clavier.
**Anti-motif :** `waitForTimeout` arbitraire, `retries`, ou assouplissement de l'assertion
(`toHaveAttribute` au lieu de `toBeFocused`) — les trois masqueraient un vrai vol de focus.
Corollaire : la visibilité d'un élément (`toBeVisible`) n'est **pas** un point de
synchronisation du focus ; ici les deux se résolvaient à ~10 ms d'écart, d'où la course.

### `[MEMORY:decision]`

**Contexte :** #702 demandait de corriger « côté code ou côté test selon ce que l'investigation
révèle », en avertissant qu'un correctif de test peut masquer un vrai vol de focus.
**Décision :** correction **côté test uniquement**, zéro ligne de production modifiée.
**Pourquoi :** la sonde `focusin` établit que la restitution du focus par le `Select` a lieu
**une seule fois, ~29 ms après le clic sur l'option**, et que le focus posé par le clavier
**tient 1,5 s** une fois cette restitution passée. Aucun utilisateur ne peut s'insérer dans
cette fenêtre ; la restitution au déclencheur est en outre le comportement attendu du motif.
Le défaut était donc bien dans la synchronisation du test. Pour que cette décision reste
réfutable, le test embarque un oracle de durabilité en lecture unique non réessayée, et le
contrôle négatif (2 échecs / 6 en neutralisant la seule ligne d'attente) prouve que le
correctif agit sur la cause et non sur le symptôme.

STATUS: COMPLETED
