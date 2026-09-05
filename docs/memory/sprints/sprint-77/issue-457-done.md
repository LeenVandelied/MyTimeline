# Issue #457 — Garde-fou focus sur un `ring-*` / `outline-none` réintroduit en `.tsx`

Sprint 77, vague 1. Branche `sprint/77`, base `82d66b9`.

## 1. Objectif

Fermer la moitié `.tsx` du trou que `control-border-tier.test.ts` (S63, #447) déclare lui-même en
en-tête : il ne lit que `ds/components/core.css`, donc un contournement de focus posé dans un
composant React lui échappe entièrement. Livrer la garde ET son contrôle négatif armé.

## 2. Ce qui a été livré

| Fichier | Nature |
|---|---|
| `frontend/src/styles/__tests__/tsx-focus-utility.test.ts` | **NOUVEAU** — la garde (≈510 lignes, en-tête + scanner + armement) |
| `frontend/src/components/legal/legal-table-of-contents.tsx` | **CORRIGÉ** — la seule violation réelle du dépôt |
| `frontend/src/styles/__tests__/control-border-tier.test.ts` | renvoi ajouté : la moitié `.tsx` de son trou est fermée |
| `frontend/src/styles/__tests__/base-layer.test.ts` | renvoi ajouté (son en-tête déclarait le même trou) |
| `docs/memory/decisions.md` | `DEC-S58-001` — section « COUVERTURE AUTOMATISÉE » (critère 3) |

### Arbitrage 1 — mécanisme : test Vitest, PAS règle ESLint

L'issue penchait pour ESLint. **Retenu : test Vitest de scan statique.** Trois motifs, dans l'ordre
de poids :

- **Le critère « lequel tourne en CI » ne départage RIEN — vérifié dans le job, pas dans l'énoncé**
  (PIT-S68-002). `.github/workflows/ci.yml`, job `frontend`, enchaîne **`npm run build`, `npm run
  test`, `npm run typecheck` ET `npm run lint`** : les deux voies s'exécutent. Le briefing suggérait
  que ce critère trancherait ; il ne tranche pas.
- **Le contrôle négatif exigé est la méthode S63** : mutation d'une copie EN MÉMOIRE passée à une
  fonction d'audit pure, disque jamais touché. Cela se transpose directement en fonction exportée
  (`findFocusUtilityOffences`). L'équivalent ESLint est `RuleTester` — une AUTRE méthode, et qui
  demande des fixtures sur disque hors des dossiers que `next lint` balaie.
- **`no-restricted-syntax` (le seul levier ESLint sans dépendance, précédent #160/#258 déjà présent
  dans `eslint.config.mjs`) ne sait pas exprimer le prédicat.** Il apparie des FORMES d'AST ; ici il
  faut inspecter le CONTENU d'un littéral de chaîne et le découper en jetons Tailwind. Il aurait
  fallu écrire une règle custom complète — plus de code que le scanner, pour une méthode d'armement
  moins alignée.

### Arbitrage 2 — périmètre : `src/components/**` + `app/**`, pas les 3 fichiers de l'énoncé

L'issue nomme `ui/checkbox.tsx`, `ui/radio.tsx`, `ui/switch.tsx`. **Réfuté au grep** (PIT-S71-001) :

- ces **3 fichiers ne contiennent AUCUNE occurrence** de `outline` ou `ring` ;
- la **seule violation réelle du dépôt** vivait dans `src/components/legal/`.

Un périmètre à 3 fichiers aurait donc gardé trois fichiers sans rien à garder, et manqué la seule
régression existante. Retenu : **122 fichiers** (99 sous `src/components/**`, 23 sous `app/**`,
hors `*.test.tsx` / `*.stories.tsx`). C'est l'échelle de `DEC-S58-001`, qui a nettoyé « les 31 AUTRES
sites applicatifs ». Un test de périmètre (`files.length > 50`) empêche la garde de passer à vide si
le walker casse.

### Arbitrage 3 — sort des `ring-*` / `outline-*` existants

Voir l'inventaire § 3. Trois traitements distincts : **1 dérogation** (allowlist motivée),
**1 correction**, **20 faux positifs éliminés par conception**.

### Nuance assumée : la garde est plus STRICTE que l'énoncé de #457

L'issue demandait de détecter un `ring-*` « isolé (sans le token `--color-focus`) ». `DEC-S58-001`
rejette `ring-*` en tant que **mécanisme**, pas en tant que couleur. La garde suit la décision, pas
l'énoncé — et c'était le bon choix : la violation trouvée portait justement la **bonne couleur**
(`ring-ring` → `--color-focus`) et restait un contournement. Le critère de l'issue l'aurait laissée
passer. Consigné dans l'en-tête du test et dans `DEC-S58-001`.

## 3. Inventaire des `ring-*` / `outline-*` dans le TSX (mesuré, 122 fichiers)

**23 occurrences brutes** au premier passage. Tri :

| # | Où | Verdict | Traitement |
|---|---|---|---|
| 20 | `variant="outline"` dans 18 fichiers (dont `app/[locale]/privacy/page.tsx`, `terms/page.tsx`) | **FAUX POSITIF** — valeur de prop du variant shadcn de `ui/button.tsx`, pas une classe | Éliminé **par conception**, pas par allowlist : les formes NUES (`outline`, `ring`) ne sont retenues que dans un littéral à **plusieurs jetons**. Une valeur de prop est un jeton seul. |
| 3 | `legal/legal-table-of-contents.tsx:52` — `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | **VIOLATION RÉELLE** | **CORRIGÉ** (les 3 classes retirées, `rounded-sm` conservé) |
| 1 | `ui/popover.tsx:48` — `outline-hidden` | **LÉGITIME** — dérogation nommée dans `DEC-S58-001` (« un panneau n'est pas un contrôle ») | **Allowlist** `ALLOWED_UTILITIES`, clé `(fichier, utilitaire)` |

Trois occurrences supplémentaires vivent en **COMMENTAIRE** et documentent leur propre retrait au
#383 (`CategoryDrawer.tsx:324`, `EventEditForm.tsx:835`, `LandingMobileMenu.tsx:65`). Un garde-fou
textuel aurait rougi sur les trois (PIT-S63-017 : un grep lit la présence, jamais l'intention) —
d'où le lexeur, et un test dédié qui pin ce comportement.

### Détail de la correction (⚠ vague 4 / #532 travaille sur les pages légales)

**`frontend/src/components/legal/legal-table-of-contents.tsx`** — un seul `className`, ligne 52.
Ce fichier n'est dans AUCUNE des zones interdites de mon briefing (`app/**`, `locales/*/legal.json`,
`e2e/**`, `ds/**`), mais il est **fonctionnellement adjacent à #532** : à signaler au lead.

La **couleur était juste** (`--color-ring` est un alias de `--color-focus`, `globals.css:114`) — ce
n'est donc **pas** un défaut de contraste, et je ne le présente pas comme tel. C'est le mécanisme qui
viole `DEC-S58-001` : le trio supprimait le contour du DS pour un `box-shadow`, d'où (a) un second
motif d'indicateur absent de la charte, (b) un anneau rogné par tout ancêtre `overflow` là où
`outline` déborde (même raisonnement qu'en `DEC-S58-004`), (c) la perte du repli
`@media (forced-colors: active)` que seul `outline` émet. Aucune E2E ni aucun test n'assertait sur
ces classes (vérifié au grep sur `e2e/` et `src/`). Motif complet en commentaire dans le fichier.

**Aucun autre `.tsx` n'a été modifié** — en particulier `ui/checkbox.tsx`, `ui/radio.tsx`,
`ui/switch.tsx` sont **intacts** (terrain de #191, vague 3).

## 4. Contrôle négatif — ARMÉ, deux niveaux

**Niveau 1 — en mémoire (méthode S63, 9 assertions).** Mutations injectées dans une copie en mémoire
de `ui/checkbox.tsx` (fichier RÉEL ; une assertion vérifie d'abord que l'ancre `peer h-4 w-4
shrink-0` existe encore, sinon la fixture serait un no-op silencieux) :

| Mutation | Attendu | Résultat |
|---|---|---|
| `focus-visible:outline-none` | `outline` | rouge |
| `focus-visible:ring-2` | `ring` | rouge |
| `ring-2 ring-[var(--color-focus)]` (bon token, refusé quand même) | `ring` | rouge |
| `data-[state=checked]:focus:ring-2` (variante composée) | `ring` | rouge |
| `!outline-none` (important) | `outline` | rouge |
| `cva("…", { … "bg-x focus:ring-2" })` | `ring` | rouge |
| `Record<V, string> = { ghost: "text-ink outline-none" }` | `outline` | rouge |
| `outline-none` **dans** `popover.tsx` (dérogé seulement pour `outline-hidden`) | `outline` | rouge |
| `className="rounded-sm outline"` (forme nue en liste) | `outline` | rouge |

Plus 5 contrôles **positifs** (la garde doit rester silencieuse) : occurrences en commentaire,
`href="https://…"` qui ne doit pas être pris pour un commentaire, code d'une substitution `${…}`,
utilitaires voisins (`underline-offset-4`, `[&_svg:not([class*='size-'])]:size-4`), et
`variant="outline"`. Plus un témoin « disque intact » et un témoin d'allowlist non périmée.

**Niveau 2 — mutation RÉELLE sur disque, puis revert.** Les tests du niveau 1 prouvent la fonction
d'audit, pas son câblage au walker de fichiers. Injection dans `frontend/src/components/ui/switch.tsx` :

```
cn('mt-switch', className)  ->  cn('mt-switch focus-visible:ring-2 focus-visible:outline-none', className)
```

Résultat : **`EXIT_CODE=1`**, `Tests 1 failed | 18 passed (19)`, la garde nommant
`src/components/ui/switch.tsx : focus-visible:outline-none` et `… : focus-visible:ring-`.
Fichier restauré, `git status` confirme `switch.tsx` non modifié.

**Preuve la plus forte, non fabriquée** : avant correction, le scan a réellement trouvé les 3
violations de `legal-table-of-contents.tsx` — la chaîne complète (walker → lexeur → verdict) a donc
mordu sur une régression authentique du dépôt, pas sur une fixture.

## 5. Tests — chiffres et codes de sortie réels

Tous joués via `rtk proxy` (PIT-S45-003 : RTK ment sur les résumés), code de sortie lu :

| Oracle | Commande | Exit | Résultat |
|---|---|---|---|
| Garde seule | `npx vitest run …/tsx-focus-utility.test.ts` | **0** | 1 fichier, **19/19** |
| Garde seule, MUTÉE sur disque | idem | **1** | **1 échec / 18 OK** (armement prouvé) |
| Suite Vitest complète | `npx vitest run` | **0** | **112 fichiers, 1280/1280** |
| Typecheck | `npx tsc --noEmit` | **0** | 0 `error TS` |
| Build (lint bloquant) | `npx next build` | **0** | compilé, 52 pages statiques |
| Lint | `npx next lint` | **0** | `No ESLint warnings or errors` |

**NON joué, et je le dis** :
- **Playwright / E2E** — aucune spec touchée, et `e2e/**` est hors de mon périmètre (vague 5 #294).
  Le retrait des 3 classes de `legal-table-of-contents.tsx` est un changement VISUEL au focus
  clavier : `e2e/sprint-76-legal-visual.spec.ts` existe et je ne l'ai **pas** exécuté. Voir § 8.
- **Aucune mesure au navigateur** : je n'ai vérifié à aucun pixel que le contour du DS se peint bien
  sur les liens du sommaire légal après retrait. Le raisonnement est en source (`@layer base`), pas
  mesuré.
- **Backend** : hors périmètre, non joué.
- `./scripts/test-quiet.sh` non utilisé (ne lance que Vitest, PIT-S60-009) ; `node_modules` était
  **présent** dans le worktree (542 entrées), aucun symlink nécessaire (PIT-S69-002 non rencontré).

## 6. Ce que cette garde NE prouve PAS

À la manière de l'en-tête S63 — repris in extenso dans le fichier :

- **Aucun pixel, aucun ratio.** Elle constate l'absence d'un contournement en SOURCE. Que le contour
  soit peint et contrasté reste la charge de `e2e/sprint-62-control-focus-contrast.spec.ts`.
- **Littéraux seulement.** Une classe construite (`` `ring-${n}` ``), un `clsx({ [FOCUS]: on })`, une
  constante importée d'un autre module, une classe venue d'une lib : invisibles. Aucune analyse
  statique par chaîne ne les voit — symétrique du trou `DEC-S52-003`.
- **Formes NUES sous-couvertes, du côté permissif.** `cn('outline', x)` — un `outline` nu SEUL dans
  son littéral — **passe**. C'est le prix du discriminant qui élimine les 20 `variant="outline"`.
  Le dépôt n'en contient aucun et la forme réelle d'une régression est `outline-none` (suffixée,
  donc vue). Fermer ce trou exigeait un parseur JSX.
- **Prose sévère.** Un littéral contenant le mot isolé `ring` ou `outline` parmi d'autres mots
  rougirait. Aucun n'existe (le texte visible passe par next-intl, en JSON). Biais assumé côté
  sévère, comme `landing.hover-pairing.test.ts`.
- **Regex non lexées.** Une expression régulière contenant `//` pourrait faire prendre la suite pour
  un commentaire → faux NÉGATIF. Aucun `.tsx` du périmètre n'en porte.
- **Le CSS reste à découvert.** Un `outline: none` écrit dans `globals.css`, `landing.css` ou une
  feuille du DS autre que `core.css` n'est pas du TSX : c'est l'AUTRE moitié du trou #447, que ce
  fichier ne ferme **pas**.
- **Ni cascade ni `@layer`** : une règle plus forte ailleurs peut annuler le contour sans faire
  rougir quoi que ce soit. `base-layer.test.ts` couvre la layerisation, pas les conflits.
- **Sémantique non jugée** : un `ring-*` purement décoratif (halo d'avatar) rougirait comme un
  contournement. Le dépôt n'en a aucun ; le jour venu, c'est une entrée d'allowlist, pas un bug.

## 7. Signaux `[MEMORY:*]`

`[MEMORY:pitfall]` **Un scan de classes Tailwind sur du TSX doit lexer, pas grepper — deux fois,
dans les deux sens.** #457 : le dépôt porte 3 occurrences de `ring-2`/`outline-none` en COMMENTAIRE
qui documentent leur propre retrait (#383) — un grep rougit dessus (PIT-S63-017) ; et 20
`variant="outline"` qui sont des valeurs de PROP, pas des classes — soit 20 faux positifs pour 3
vraies violations, un garde-fou à 87 % de bruit qu'on désarme à la première exécution. Remède :
lexeur d'états (chaîne / gabarit / commentaire), + discriminant de multiplicité pour les formes nues
homographes d'une valeur de prop.

`[MEMORY:pitfall]` **RTK avale le code de sortie ET corrompt `git log -1`.** Au S77, `git log
--oneline -1` rendait le parent (`1271253`) là où `git rev-parse HEAD` rendait le vrai HEAD
(`82d66b9`) — de quoi conclure à tort que le briefing du lead se trompait de base. Et
`npx vitest … ; echo $?` rend une chaîne VIDE sous le hook. Toute vérification de HEAD passe par
`git rev-parse`, tout code de sortie par `rtk proxy` (élargit PIT-S45-003 et `rtk-git-diff-empty-output`).

`[MEMORY:decision]` **Un garde-fou suit la DÉCISION, pas l'énoncé de l'issue qui le commande.** #457
demandait de détecter un `ring-*` « sans le token `--color-focus` » ; `DEC-S58-001` rejette `ring-*`
comme MÉCANISME. La seule violation du dépôt portait la BONNE couleur (`ring-ring` → `--color-focus`)
et le critère de l'issue l'aurait laissée passer. Écart tranché en faveur de la décision, et consigné
aux deux endroits (en-tête du test + `DEC-S58-001`).

`[MEMORY:pattern]` **Armer un garde-fou de scan à DEUX niveaux.** Les mutations en mémoire (méthode
S63) prouvent la fonction d'audit mais **pas** son câblage au walker de fichiers : une garde dont
`scannedFiles()` rend `[]` reste verte avec un armement parfait. Ajouter (a) une assertion de
périmètre non vide et (b) une mutation réelle sur disque jouée une fois, revert vérifié au
`git status`.

## 8. Recommandations suite

- `RECOMMAND_FOLLOWUP: Rejouer e2e/sprint-76-legal-visual.spec.ts après le retrait des 3 classes de focus de legal-table-of-contents.tsx (#457) — changement visuel au focus clavier non vérifié au navigateur [triage XS | domaine frontend]`
- `RECOMMAND_FOLLOWUP: Fermer l'autre moitié du trou #447 — un outline:none / box-shadow de focus posé dans globals.css, landing.css ou une feuille du DS autre que core.css n'est couvert par aucune garde [triage S | domaine frontend]`
- `RECOMMAND_FOLLOWUP: Mutualiser l'extraction de classes TSX — tsx-focus-utility.test.ts (lexeur) et landing.hover-pairing.test.ts (regex + accolades équilibrées) portent deux extracteurs distincts ; le second est le plus faible et couvre moins de formes [triage XS | domaine frontend]`
- Pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` ni `RECOMMAND_UI_DESIGN` ni `RECOMMAND_TEST_RUNNER` : aucune migration, aucune surface auth, aucun rendu visuel produit, et les suites jouées inline tiennent en un écran.
- **Point de coordination pour le lead** : j'ai modifié `frontend/src/components/legal/legal-table-of-contents.tsx`, fonctionnellement adjacent à #532 (vague 4, pages légales). Les 3 composants de #191 (`ui/checkbox.tsx`, `ui/radio.tsx`, `ui/switch.tsx`) sont **intacts**, mais désormais **surveillés** : un correctif de #191 qui y poserait un `ring-*` ou un `outline-*` fera rougir la CI, par conception.

STATUS: COMPLETED
