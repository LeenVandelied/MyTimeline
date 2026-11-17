# Sprint 96 — correction de review, issue #665

Branche `claude/sprint-96-start-b98611`, worktree `amazing-rubin-93b16e`.
Périmètre : **1 spec E2E élargie + 4 commentaires rectifiés**. Zéro ligne de
comportement touchée (vérifié, cf. §Mesures).

---

## Ce qui manquait

**Le trou (MAJEUR de la review).** `frontend/src/components/ui/palette-color-picker.tsx`
documente, JSDoc §GÉOMÉTRIE, que le défaut de #665 a été mesuré à **1280 px** :
`CategoryDrawer` 11+1, `EventEditForm` 10+2, `ProductDrawer` 11+1 à 1280 **et** à
375. La spec de garde livrée avec, `frontend/e2e/sprint-96-palette-geometry.spec.ts`,
ne tournait **qu'à 375 px** (`MOBILE = { width: 375, … }` + `test.use({ viewport: MOBILE })`).
Le critère « aucune pastille seule sur sa propre ligne, vérifié aux largeurs
réelles des 3 surfaces » n'était donc **pas gardé là où le défaut principal avait
été constaté**. Une régression de layout à 1280 px serait passée inaperçue.

**Le commentaire faux.** La spec affirmait que le rendu desktop était « déjà tenu
par les deux specs ci-dessus qui tournent à 1280 px ». **Vérifié faux avant
réécriture**, et faux deux fois :

| spec citée | largeur réelle | mesure-t-elle la géométrie de la palette ? |
|---|---|---|
| `sprint-84-palette.spec.ts` | 1280 px (l.40) ✔ | **Non** — aucun `boundingBox()` dans le fichier ; elle asserte des couleurs peintes, des comptes de `radio` et de l'ARIA |
| `sprint-95-toast-overlap.spec.ts` | **390 px** (l.103-109), jamais 1280 ✘ | **Non** — elle mesure des boîtes, mais celles du *toast* |

Commande : `/usr/bin/grep -n "viewport\|test.use\|boundingBox\|1280" sprint-84-palette.spec.ts sprint-95-toast-overlap.spec.ts`

**La formulation ambiguë.** `palette-color-picker.tsx:169` écrivait « Desktop
inchangé. » — vrai pour la TAILLE (28×28), faux pour la DISPOSITION (11+1 → 6+6,
qui change volontairement).

---

## Ce que j'ai ajouté

### 1. Un bloc desktop dans `frontend/e2e/sprint-96-palette-geometry.spec.ts`

`test.describe('#665 — palette, géométrie desktop')`, `test.use({ viewport: DESKTOP })`
avec `DESKTOP = { width: 1280, height: 900 }`, sur les **3 surfaces**. Il asserte :

- **découpage 6 + 6, aucune ligne orpheline, ordre de lecture = ordre DOM** — via
  `assertRowLayout()`, extrait de `assertPaletteGeometry()` pour que le bloc
  desktop **réutilise le regroupement par ordonnée déjà écrit** (`toRows()`,
  `ROW_TOLERANCE_PX`) au lieu d'en refonder un second, divergent ;
- **non-régression de taille 28×28** (`sm:size-7`) sur les 12 pastilles et 28 px
  de haut sur « Personnalisé » (`sm:h-7`), à 0,5 px près.

**L'oracle des 44 px n'est PAS appliqué à desktop** : au-delà de `sm` (640 px) la
correction repasse délibérément à 28×28, l'y exiger serait un faux rouge. C'est
dit explicitement dans la JSDoc, section (a).

Ouvreur desktop dédié pour `EventEditForm` (`openEventFormDesktop`) : à 1280 px la
FAB mobile est `md:hidden`, c'est `shell-sidebar-new-event-button` qui est rendu.
Il reprend l'attente de restitution du focus du `Select` Radix introduite par le
commit `efe88983` (#702) — sans elle la sonde serait instable.

Le bloc desktop **ne rejoue pas les deux thèmes** : l'indépendance au thème est
déjà établie par le bloc mobile sur le même composant. 3 exécutions payées, pas 6.

### 2. Les deux commentaires demandés, plus deux inexactitudes trouvées en chemin

| fichier:ligne | avant | après |
|---|---|---|
| `sprint-96-palette-geometry.spec.ts` (§NE PROUVE PAS) | « rendu desktop […] déjà tenu par les deux specs ci-dessus qui tournent à 1280 px » | RECTIFICATIF nommant les deux specs, leur largeur réelle et ce qu'elles assertent vraiment |
| `palette-color-picker.tsx:169` | « Desktop inchangé. » | bloc distinguant **TAILLE inchangée** (28×28, `sm:gap-2`) / **DISPOSITION délibérément changée** (6×2 à toute largeur), chacune citant la spec qui la mesure |
| `palette-color-picker.tsx` JSDoc §2 | « Le rendu DESKTOP est donc inchangé au pixel près. » | « La **TAILLE** desktop est inchangée au pixel près (28×28 ; la DISPOSITION, elle, change — cf. point 1) », + renvoi au bloc @1280 |
| `palette-color-picker.tsx` (classe swatch) | « le rendu desktop est inchangé » | « la **TAILLE** desktop est inchangée (la disposition passe à 6×2) » |

Les deux dernières lignes **ne sont pas demandées par la review**. Je les ai
corrigées parce qu'elles portent **exactement la même affirmation trop large** que
la l.169 ; en rectifier une seule aurait laissé le fichier se contredire, et
l'affirmation non rectifiée aurait servi d'argument au prochain arbitrage — le
motif même du MINEUR (PIT-S95-007).

J'ai aussi corrigé, dans la spec, la JSDoc d'`openEventForm` qui situait la
bascule FAB / barre latérale au point de rupture `lg` : elle est à **`md`**
(`AppShell.tsx` l.387 `md:hidden`, l.235 `hidden … md:flex`). Sans cette
correction, mon nouveau commentaire l'aurait contredite dans le même fichier.
À 375 px les deux énoncés donnent le même résultat, la spec mobile n'en dépendait
donc pas — c'était une inexactitude dormante, pas un bug.

---

## Mesures

### Découpage à 1280 px — AVANT / APRÈS

« AVANT » ne peut pas être relu sur la branche (la correction #665 y est déjà).
Je l'ai donc **remesuré au navigateur** avec une sonde jetable qui réinjecte par
CSS la mise en page d'avant #665 — `git show 14363a50^` donne le `radiogroup` en
`className="flex flex-wrap items-center gap-2"` — puis regroupe les 12 pastilles
par ordonnée. Sonde `frontend/e2e/zz-probe-665-desktop.spec.ts`, **supprimée après
mesure** (absente du commit, `git status` final propre).

```
$ SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
    rtk proxy npx playwright test e2e/zz-probe-665-desktop.spec.ts --reporter=list

[SONDE-665] CategoryDrawer @1280 — radiogroup 402 px — decoupage 11 + 1
[SONDE-665] ProductDrawer  @1280 — radiogroup 402 px — decoupage 11 + 1
[SONDE-665] EventEditForm  @1280 — radiogroup 377 px — decoupage 10 + 2
  8 passed (4.2s)
```

| surface | AVANT (mise en page pré-#665 réinjectée) | APRÈS (code livré) |
|---|---|---|
| `CategoryDrawer` @1280 | radiogroup 402 px → **11 + 1** (orpheline) | **6 + 6** |
| `ProductDrawer` @1280 | radiogroup 402 px → **11 + 1** (orpheline) | **6 + 6** |
| `EventEditForm` @1280 | radiogroup 377 px → **10 + 2** | **6 + 6** |

Deux conséquences, et c'est le point :

1. **La garde mord.** `toEqual([6, 6])` échoue sur 11+1 comme sur 10+2, et
   l'assertion d'orpheline échoue en plus sur les deux 11+1. Le bloc desktop
   n'est pas un test qui passe par construction.
2. **Les chiffres de la JSDoc sont confirmés indépendamment** — 402 / 402 / 377 px
   et 11+1 / 11+1 / 10+2, identiques au mot près à ce que le composant
   documentait. C'est la réponse à PIT-S95-007 : l'affirmation géométrique du
   commentaire a désormais une mesure reproductible derrière elle.

### Non-régression de taille à desktop

Mesurée par le bloc @1280 lui-même : 12 pastilles à 28×28 px et « Personnalisé »
à 28 px de haut, sur les 3 surfaces, tolérance 0,5 px. Vert.

### Le diff du composant est bien commentaire-seul

```
$ rtk proxy git diff -- frontend/src/components/ui/palette-color-picker.tsx \
    | grep -E '^[+-]' | grep -vE '^[+-]{3}' | grep -vE '^[+-]\s*(//|\*|/\*)'
(sortie vide)
```

### Pile utilisée

Backend conteneur `:8085` (image `amazingrubin93b16e-backend-e2e:latest` réutilisée,
**aucun rebuild**), `postgres-e2e` `:5435`, `next start` `:3000` sur le `.next`
existant (bâti avec `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8085`).
Oracle avant toute exécution : `/api/auth/me` = **401**, `/fr/login` = **200**.

---

## Tests

| campagne | résultat réel |
|---|---|
| `sprint-96-palette-geometry.spec.ts` seule (6 mobile + **3 desktop** + 5 `setup`) | **14 passed / 0 failed** en 6,5 s |
| sonde de contrôle négatif (mise en page pré-#665) | **8 passed**, découpages 11+1 / 11+1 / 10+2 imprimés |
| specs citant la surface palette + voisines, run 1 | **64 passed / 0 failed** en 26,2 s |
| idem, run 2 (confirmation) | **64 passed / 0 failed** en 28,1 s |

Détail par spec du run complet (2 runs identiques) :

| spec | passed | failed |
|---|---|---|
| `auth.setup.ts` (projet `setup`) | 5 | 0 |
| `categories.spec.ts` | 7 | 0 |
| `sprint-73-model-vs-rendered.spec.ts` | 5 | 0 |
| `sprint-84-palette.spec.ts` | **3** | 0 |
| `sprint-95-toast-overlap.spec.ts` | 4 | 0 |
| `timeline.spec.ts` | 31 | 0 |
| `sprint-96-palette-geometry.spec.ts` | **9** (6 mobile + 3 desktop) | 0 |

**Sélection des specs à rejouer** — pas choisies à la main (PIT du S86). Liste grep
complète de tout ce qui cite la surface :

```
$ /usr/bin/grep -rln "swatch-\|color-custom\|PaletteColorPicker\|radiogroup" frontend/e2e/
frontend/e2e/categories.spec.ts
frontend/e2e/sprint-73-model-vs-rendered.spec.ts
frontend/e2e/sprint-84-palette.spec.ts
frontend/e2e/sprint-96-palette-geometry.spec.ts
```

Les 4 ont été rejouées, plus `sprint-95-toast-overlap` et `timeline` demandées par
le briefing. `sprint-84-palette` est **verte et stable** sur les deux runs : la
stabilisation `efe88983` tient, rien à signaler.

**GF-5 (captures macOS)** : `git status --porcelain | /usr/bin/grep darwin` →
**aucun** PNG `-darwin` produit. Aucune des specs jouées n'est une spec de
comparaison visuelle, le décompte ci-dessus n'a donc rien à retrancher.

**Portes de qualité** :

- `./scripts/test-quiet.sh frontend` → **OK** (build + Vitest + `tsc --noEmit` +
  « ✔ No ESLint warnings or errors »). Lancé **après** l'arrêt de `next start`
  (PIT-S95-001), et **avec** les variables de proxy pour ne pas laisser un `.next`
  sans rewrites à la vague suivante (PIT-S58-003).
- `cd frontend && ./node_modules/.bin/prettier --check .` (binaire **direct**, GF-2)
  → « All matched files use Prettier code style! »

### Ce que je n'ai PAS vérifié

- **La suite E2E complète** n'a pas été rejouée : le périmètre est une spec neuve
  + des commentaires, et le diff de production est vide de comportement (prouvé
  ci-dessus). Si le lead veut la garantie de non-régression globale, c'est un run
  complet à part — je ne la revendique pas.
- **Le rendu sous CI Linux** du nouveau bloc desktop : mesuré sur macOS/Chromium
  uniquement. Les valeurs assertées (28 px, 6+6) sont des tailles CSS fixes, pas
  des rendus de police, le risque de divergence est faible — mais **non vérifié**.
- **Les largeurs intermédiaires** (640-1279 px) ne sont gardées par aucun bloc.
  `grid-cols-6` les rend 6+6 par construction et rien ne l'y contredit, mais c'est
  un raisonnement, **pas une mesure**.

---

## Signaux mémoire

`[MEMORY:pitfall] Contexte: une spec de garde peut ne garder que la moitié du
défaut qu'elle documente — #665 mesurait le défaut à 1280 px dans la JSDoc du
composant et la spec livrée avec ne tournait qu'à 375 px. Solution: quand une
spec et le commentaire qu'elle sert citent des largeurs (ou des conditions)
DIFFÉRENTES, l'écart EST le trou ; comparer les deux listes avant de conclure.
Prévention: à la review d'une spec de géométrie, lire les viewports de la spec et
les cotes du commentaire côte à côte, pas l'un après l'autre.`

`[MEMORY:pitfall] Contexte: le commentaire d'une spec déléguait la couverture
desktop à deux specs voisines « qui tournent à 1280 px ». L'une y tourne mais
n'appelle aucun boundingBox ; l'autre mesure des boîtes mais à 390 px. Solution:
un renvoi « déjà couvert par X » se vérifie en DEUX temps — X tourne-t-il à la
bonne condition, ET X asserte-t-il la bonne PROPRIÉTÉ ? Prévention: un grep
"viewport|test.use" ne suffit pas, il faut aussi greper l'oracle (boundingBox,
toHaveScreenshot, …). Anti-pattern: croire un renvoi de couverture sur parole.`

`[MEMORY:pattern] Problème: mesurer l'état « AVANT » d'une correction de layout
déjà mergée, sans revenir en arrière sur le code de production. Solution: sonde
Playwright jetable qui réinjecte l'ancienne mise en page par page.addStyleTag()
(l'ancien className se lit avec git show <sha>^:<fichier>), puis imprime la mesure.
Ici elle a reproduit 402/402/377 px et 11+1 / 11+1 / 10+2, identiques à la JSDoc —
ce qui arme la garde ET confirme les chiffres du commentaire d'un seul coup.
Anti-pattern: reverter la production le temps d'une mesure, ou se contenter de
recopier le chiffre du commentaire.`

`[MEMORY:decision] Contexte: faut-il appliquer l'oracle des 44×44 au bloc desktop ?
Décision: NON — à desktop l'invariant est le découpage en lignes plus la
non-régression de taille à 28×28. Pourquoi: au-delà de sm (640 px) la correction
#665 repasse délibérément à size-7 ; exiger 44 px y fabriquerait un faux rouge sur
un comportement voulu. Corollaire: le seul oracle commun aux deux largeurs est le
découpage, d'où l'extraction d'assertRowLayout() partagé.`

---

## Recommandations suite

**`RECOMMAND_TEST_RUNNER` : NON.** Les 4 specs citant la surface plus les 2
demandées ont été jouées ici, deux fois, 64/64 vertes, et les portes frontend
(build / Vitest / tsc / lint / prettier) sont passées dans ce contexte. Rien à
déléguer. La seule campagne non faite est la suite complète, et je la signale
ci-dessus comme non vérifiée plutôt que de la faire passer pour acquise.

**`RECOMMAND_UI_DESIGN` : NON.** Aucun pixel de production n'a bougé : le diff du
composant est commentaire-seul, vérifié par commande. Il n'y a rien à arbitrer
visuellement.

**`RECOMMAND_REVIEWER` : OUI, sur ce commit.** Motif : PIT « cycle 2 de review
avant PR » (S62) — un commit qui corrige une review doit lui-même être relu, et
celui-ci ajoute des assertions neuves, pas seulement du texte. Le point à
regarder en priorité est le bloc `@1280` : l'ouvreur desktop d'`EventEditForm`
est un chemin neuf (déclencheur de barre latérale + attente de focus Radix), et
c'est là qu'une instabilité se logerait si elle devait se loger quelque part.

**`RECOMMAND_DB_EXPERT` / `RECOMMAND_SECURITY_EXPERT` : NON.** Aucun contact avec
la persistance, l'authentification ou une surface exposée.

**Follow-up NON traité, volontairement** : le MINEUR sur le commentaire `#656`
dupliqué 4× dans les pages auth. Hors périmètre de cette correction, et le
briefing le range explicitement en follow-up.

---

## État de la pile E2E

**DÉMONTÉE.** `docker compose -p amazingrubin93b16e -f docker-compose.yml
--profile e2e down -v`, état vérifié après coup :

- conteneurs `amazingrubin93b16e-*` : **aucun** (`docker ps -a`)
- volumes `postgres-e2e-data` / `avatars-e2e-data` / `postgres-data` /
  `avatars-data` et réseau `amazingrubin93b16e_default` : **supprimés**
- ports **3000**, **8085**, **5435** : **0 listener** (`lsof -nP -iTCP:<p> -sTCP:LISTEN`)
- image `amazingrubin93b16e-backend-e2e:latest` : **CONSERVÉE** — réutilisée telle
  quelle ici sans rebuild (`up -d --no-build backend-e2e`), toujours valide pour la
  vague suivante tant qu'aucun commit ne touche `backend/`

⚠ Deux notes pour l'agent suivant :

1. `--profile e2e up` **sans nommer de service** tente aussi de démarrer les
   services par défaut `postgres` / `backend` et **échoue** sur
   « No such image: amazingrubin93b16e-backend:latest ». Nommer le service :
   `… --profile e2e up -d --no-build backend-e2e` (il tire `postgres-e2e` en
   dépendance).
2. Le `.next` laissé sur disque provient du `next build` de `test-quiet.sh`
   lancé **avec** `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8085` :
   les rewrites `/api/*` y sont sérialisées (PIT-S58-003). Un rebuild sans ces
   variables perdrait le proxy.

STATUS: COMPLETED
