# Issue #633 — [A11Y] Réglages mobiles : cible tactile du bouton retour à 36px au lieu de 44px

Sprint 96 — vague 1 — taille XS.
Worktree : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e`
`git rev-parse --abbrev-ref HEAD` → `claude/sprint-96-start-b98611` (GF-1 vérifié).

## Objectif

Porter le bouton retour des réglages mobiles (`mobile-settings-back`) de 36 px à la
cible tactile minimale de 44 px du handoff (token `--space-11`), conformément à
WCAG 2.5.5 « Target Size (Minimum) », et balayer les autres cibles des écrans de
réglages en viewport mobile.

## Fichiers modifiés

- `frontend/src/components/settings/mobile/MobileSettings.tsx` — `h-9 w-9` → `h-11 w-11`
  sur le bouton retour, + commentaire justifiant le choix de l'agrandissement visuel.
- `frontend/e2e/settings-mobile.spec.ts` — nouveau test de géométrie (voir `## Tests`).

### Choix : agrandir la boîte visuelle, pas de `::before` d'expansion

Les deux options de l'énoncé ont été pesées. Retenu : `h-11 w-11`.

Le motif d'expansion invisible (`.mt-zoom__btn`, `.mt-drawer__close::before`) existe pour
les barres d'outils DENSES, où le visuel doit rester petit sous peine de casser la mise en
page. Ce n'est pas le cas ici : l'en-tête des réglages mobiles ne porte que ce bouton et un
titre court, rien ne contraint sa largeur.

Argument décisif : le bouton fermer du `BottomSheet` VOISIN (même dossier,
`frontend/src/components/settings/mobile/BottomSheet.tsx:181`) utilise déjà
`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border` avec une icône
`h-4 w-4`. Les classes retenues sont donc identiques à ce frère, à la couleur de filet près
(`border-rule` vs `border-rule-emphasis`, conservée telle quelle — hors périmètre). Une seule
façon de dessiner un bouton-icône bordé sur les surfaces mobiles des réglages.

`-ml-1` (désindentation optique de 4 px) est CONSERVÉ : c'est l'intention de mise en page
existante, et la modifier serait un changement visuel non mesuré hors périmètre.

## Mesures

⚠️ Distinction explicite entre valeurs DÉCLARÉES (lues dans les classes / tokens) et
valeurs MESURÉES (rendues par un navigateur). **Aucune mesure navigateur n'a été faite dans
cette tâche** : je ne suis pas propriétaire Playwright pour cette vague.

| Élément | Valeur | Nature | Source |
|---|---|---|---|
| `--space-11` | 44 px | DÉCLARÉE | `frontend/src/styles/ds/tokens/spacing.css:18` |
| `--space-9` | 36 px | DÉCLARÉE | `frontend/src/styles/ds/tokens/spacing.css:17` |
| `mobile-settings-back` AVANT | `h-9 w-9` = 36×36 px | DÉCLARÉE | ancien `MobileSettings.tsx:52` |
| `mobile-settings-back` APRÈS | `h-11 w-11` = 44×44 px | DÉCLARÉE | `MobileSettings.tsx:59` |
| Cible effective rendue | — | **NON MESURÉE** | oracle = la spec E2E ci-dessous |

`h-11` = `2.75rem` = 44 px : Tailwind 4 est en config CSS-first (`tailwind.config.ts` ne
redéfinit que `content` et `plugins`), aucun `@theme` ne surcharge l'échelle de spacing ;
l'équivalence `h-11` = `--space-11` = 44 px est déjà assumée ailleurs dans le dépôt
(`frontend/src/components/landing/HeaderSection.test.tsx:109-110`).

### En-tête : absorption de l'agrandissement — analyse statique, NON mesurée

L'en-tête est `mb-4 flex items-center gap-2` : un bouton `shrink-0` + un `<span>` de titre.

- **Hauteur** : la ligne passe de 36 à 44 px, le contenu descend de 8 px. `items-center`
  garde le titre centré. Aucun débordement possible (le conteneur n'a pas de hauteur fixe).
- **Largeur** : le bouton consomme 8 px de plus. Les 4 libellés possibles sont courts —
  le plus long est `Einstellungen` (de, 13 caractères) ; `Préférences` (fr) en fait 11.
  À 375 px de viewport moins `px-4` de part et d'autre, la place restante après
  44 + 8 px reste très supérieure à ces libellés.
- **Je n'affirme PAS que « ça passe »** : c'est une lecture statique. Le risque résiduel
  (retour à la ligne du titre, débordement horizontal) est précisément ce que mesure le
  critère 2 de la spec E2E ci-dessous, qui reste à EXÉCUTER.

## Tests

### Spec E2E — ÉCRITE, **NON EXÉCUTÉE**

Ajoutée à `frontend/e2e/settings-mobile.spec.ts` (et non dans un nouveau fichier) : ce
fichier porte déjà, en tête, `test.use({ viewport: { width: 375, height: 812 },
storageState: SHARED.storageState })` — le viewport ET la session sont donc hérités, ce qui
évite le piège d'une spec neuve sans session.

Test : `bouton retour : cible tactile >= 44x44 et en-tête sans débordement`
1. drill-down vers le chapitre Préférences (le bouton retour n'existe que sur un écran détail) ;
2. `boundingBox()` du bouton → `width >= 44` et `height >= 44` (critère 1) ;
3. titre du chapitre visible, bord droit `<= 375`, et débordement horizontal du document
   `<= 0` (critère 2 — absorption par l'en-tête) ;
4. clic sur le bouton → retour à l'index (le bouton reste FONCTIONNEL après agrandissement).

Le titre est ciblé par un locator STRUCTUREL (`xpath=following-sibling::span`) et non par
`getByText('Préférences')` : la section Préférences porte le même libellé et un locator
textuel apparierait plusieurs nœuds.

**Cette spec n'a PAS été exécutée — exécution déléguée à la vague 2 (#702).** Je ne suis pas
propriétaire du stack E2E pour la vague 1 (l'agent #665 le tient) et `test-quiet.sh frontend`
reconstruirait `.next` sous ses pieds (PIT-S95-001). Je n'affirme donc PAS qu'elle passe :
sur ce dépôt, une spec citée mais jamais jouée est un faux vert documenté.

Vérification faite — **le chargement de la spec, pas son exécution** :
```
SKIP_DELEGATION=1 NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 \
  rtk proxy npx playwright test e2e/settings-mobile.spec.ts --list
→ [chromium] settings-mobile.spec.ts:64:7 › ... › bouton retour : cible tactile >= 44x44 ...
  Total: 7 tests in 2 files
```

### Vérifications statiques — EXÉCUTÉES

- `rtk proxy npx next lint --file src/components/settings/mobile/MobileSettings.tsx`
  → `✔ No ESLint warnings or errors`
- `npx prettier --check src/components/settings/mobile/MobileSettings.tsx e2e/settings-mobile.spec.ts`
  → `All files formatted correctly`
- `./scripts/test-quiet.sh frontend-unit` → **147 fichiers / 1876 tests passés**, 0 échec.
  (Aucun test unitaire n'assertait la classe `h-9` du bouton : `MobileSettings.test.tsx`
  ne teste que la navigation. `loading.test.tsx` vise `settings-back`, un AUTRE bouton.)

Non exécuté, et donc non garanti : `next build`, `tsc --noEmit`, la suite E2E. Le changement
est une chaîne de classes Tailwind dans un fichier déjà typé — le risque de rupture de build
est faible, mais il n'est pas VÉRIFIÉ.

## Balayage

Périmètre imposé par le lead : les surfaces de réglages rendues en viewport mobile (375 px).
Méthode : lecture statique des classes de dimension de tous les éléments interactifs sous
`frontend/src/components/settings/**` (`<button>`, `<Button>`, `<Input>`, `<Select*>`,
`role="button"`), plus l'en-tête de page qui les encadre. **Valeurs DÉCLARÉES, non mesurées.**

Contrôle négatif d'abord : aucune règle globale ne relève les cibles sur pointeur grossier.
`/usr/bin/grep -rn "pointer: coarse|min-height:44px|min-h-11" frontend/src/styles/` ne rend
que 4 lignes, toutes dans `timeline.css` (frise), aucune ne s'applique aux réglages. Les
hauteurs déclarées ci-dessous ne sont donc pas rattrapées ailleurs.

Résultat : **le bouton retour n'était PAS la seule exception.** L'énoncé de l'issue
(« Une exception ») est réfuté par le code — trois familles de cibles sous le seuil
subsistent dans le périmètre balayé. Aucune n'est corrigée ici (bornage du lead), toutes
sont remontées en `## Recommandations suite`.

| Élément | Déclaré | Rendu à 375 px ? | Verdict |
|---|---|---|---|
| `mobile-settings-back` | 36 → **44 px** | oui | **CORRIGÉ** |
| `settings-back` (page.tsx:52) | `size="icon"` = 36 px | oui (`lg:hidden`) | < 44 → FOLLOWUP |
| `Button` défaut / `Input` / `SelectTrigger` | `h-9` = 36 px | oui | < 44 → FOLLOWUP |
| `Button size="sm"` (AvatarUpload) | `h-8` = 32 px | oui | < 44 → FOLLOWUP |
| Grabber du `BottomSheet` | `h-7` = 28 px | oui | < 44 → FOLLOWUP (nuancé) |
| Lignes de l'index (`SettingsIndex`) | `py-4` + texte | oui | >= 44 — conforme |
| Bouton fermer du `BottomSheet` | `h-11 w-11` = 44 px | oui | conforme |
| Onglets `SettingsShell` | `h-11` = 44 px | non (>= 768 px) | conforme |

Hors périmètre, non balayé : dashboard, frise, landing, formulaires d'authentification,
drawers produit/événement. Le critère d'acceptation « un balayage confirme qu'aucune AUTRE
cible interactive n'est sous 44 px » n'est donc **pas tenu à l'échelle du produit** — il a
été borné aux réglages par décision du lead, et même sur ce périmètre réduit il est
**infirmé**, pas confirmé.

## Recommandations suite

RECOMMAND_FOLLOWUP: écran Réglages (tous paliers < 1024 px) — bouton retour `settings-back`
(`frontend/app/[locale]/(app)/settings/page.tsx:52-59`, `<Button size="icon">` =
`h-9 w-9`) déclaré à 36px, rendu à 375 px juste AU-DESSUS du bouton corrigé par #633 :
deux flèches retour empilées sur le même écran, l'une à 44 px et l'autre à 36 px.
[triage XS] [domaine frontend-settings]

RECOMMAND_FOLLOWUP: primitives shadcn partagées — `Button` défaut (`ui/button.tsx:49`,
`h-9` = 36px), `Button size="sm"` (`ui/button.tsx:50`, `h-8` = 32px), `Input`
(`ui/input.tsx:11`, `h-9`) et `SelectTrigger` (`ui/select.tsx:56`, `h-9`) sont tous sous
44px et portent la quasi-totalité des contrôles des réglages en mobile (`profile-submit`,
`password-submit`, `pref-language`/`pref-theme`/`pref-density`, `export-format`, les
boutons de suppression de compte, `avatar-confirm`, révocation de session). C'est la
cause SYSTÉMIQUE derrière #633, pas un cas isolé ; le correctif touche tout le produit et
demande un arbitrage Designer (relever la hauteur en mobile ou sous `pointer: coarse`).
[triage M] [domaine transversal — design-system / ui]

RECOMMAND_FOLLOWUP: `BottomSheet` des réglages mobiles — zone de swipe-down (« grabber »,
`frontend/src/components/settings/mobile/BottomSheet.tsx:162`) déclarée `h-7` = 28px de
haut avec des handlers `onPointerDown/Move/Up`. Nuance à trancher avant de corriger : la
feuille offre AUSSI un bouton fermer conforme à 44 px, ce qui peut relever de l'exception
« autre moyen équivalent » de WCAG 2.5.5 — l'écart est donc réel mais peut-être non
bloquant. Déjà signalé en tant que tel dans `frontend/src/styles/ds/a11y-audit.md:101`.
[triage XS] [domaine frontend-settings]

Pas de `RECOMMAND_TEST_RUNNER` : la seule exécution nécessaire est celle de la spec E2E,
déjà affectée à la vague 2 (#702) par le plan de sprint.
Pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` : le changement est une classe CSS,
sans surface de données ni d'authentification.

## Signaux mémoire

[MEMORY:pitfall] Contexte : `next lint` sous le hook RTK. `npx next lint --file <f>` a
rendu `Errors: 1 | Warnings: 0` — un résumé RTK — sur un fichier que la sortie réelle
déclare `✔ No ESLint warnings or errors`. Le résumé INVENTE une erreur, là où
PIT-S93-008 décrivait l'inverse (un `grep` qui perd des résultats). Solution : lire la
sortie réelle via `rtk proxy npx next lint --file <f>`. Prévention : étendre GF-2 au-delà
de `grep`/`git diff` — tout VERDICT d'outil (0/1 erreur, PASS/FAIL, nombre de résultats)
passé par RTK doit être rejoué sous `rtk proxy` avant d'être cru, dans les deux sens :
un faux négatif fait rater un bug, un faux positif fait chasser un fantôme.

[MEMORY:pattern] Problème : choisir entre agrandir un bouton-icône et lui poser une zone
d'expansion `::before` de 44×44. Solution : trancher par la DENSITÉ de la surface hôte —
expansion invisible quand le visuel est contraint par ses voisins (barre d'outils de la
frise, en-tête de drawer), agrandissement réel quand la surface est aérée ; et, à densité
égale, copier les classes du bouton-icône le plus proche dans le MÊME dossier
(ici `BottomSheet.tsx:181` a fourni la réponse à l'identique). Anti-pattern : appliquer
le `::before` partout « parce que c'est le motif maison », ce qui fige des visuels à 28–36 px
et laisse un écart durable entre la boîte peinte et la boîte tappable.

[MEMORY:decision] Contexte : le critère d'acceptation #633 « un balayage confirme qu'aucune
autre cible interactive n'est sous 44 px » suppose l'énoncé « une exception » exact.
Décision : le balayage, borné aux réglages, INFIRME l'énoncé — `settings-back` (36 px) est
rendu sur le même écran, et les primitives shadcn partagées sont toutes à 36 px (32 px en
`sm`). Pourquoi : ces cibles sont déclarées par des classes Tailwind que ne relève aucune
règle `pointer: coarse` globale (contrôle négatif fait). Conséquence : #633 corrige un
symptôme ; la cause systémique est la hauteur des primitives et appelle un arbitrage
Designer à l'échelle du produit, pas une rustine par bouton. Un critère d'acceptation
formulé comme « vérifier qu'aucune autre X n'existe » devrait être borné DANS l'issue,
pas au briefing, sous peine d'être soit ingérable soit clos à tort.

STATUS: COMPLETED
