# Arbitrage `ui-design` — Sprint 59

> Spawné par le lead en amont des vagues 2 et 3. Lecture seule, aucun fichier modifié.
> Alimente les briefings de **#379** (vague 2) et **#348** (vague 3), et amende **#381** (vague 1).

## Fait vérifié qui corrige une hypothèse du plan architect

Source : `typography.css:12-19` + `globals.css:38,118-126`.

`@theme inline` ne mappe **que** `2xs..3xl`, et aucun `--text-*: initial` n'est posé.
Conséquence : `--text-4xl` / `--text-5xl` ne sont pas « inexistants et sans effet » — ils
**retombent sur les défauts Tailwind** (2.25rem / 3rem ≈ **36 / 48 px**).

Donc le `h1` du hero (`HeroSection.tsx:59`, `text-4xl md:text-5xl`) rend à 36 / 48 px, soit
**plus petit que le logo du header** (`md:text-3xl` = 57 px). **La hiérarchie est inversée, et
c'est confirmé au code.** `HeroSection.tsx:59` est le **seul** site `4xl`/`5xl` de tout le dépôt
(grep `src/` + `app/`).

---

## Arbitrage A — palier d'échelle du logo du header

**Verdict : APPROUVÉ.** Cible `text-md sm:text-lg` (21 / 27 / 27 / 27 px).
Suppression pure de `md:text-3xl` **et** de `md:whitespace-normal` → `whitespace-nowrap` à tous
les paliers. **`space-x-8` (nav, ligne 115) reste INTOUCHÉE.**

Justification :

- `md:text-3xl` = 57 px pour un `py-6` (24+24) → boîte de ligne ~61,6 px (`leading-tight` 1.08),
  soit un header d'environ **110 px de haut pour un wordmark**.
- Le JSDoc `HeaderSection:44-49` chiffre déjà ce palier à **234 px de large sur 2 lignes**
  (137 px de haut), et **328 px** si on interdit le retour à la ligne — 25 % d'un conteneur 1280.
  **C'est un vestige, pas un choix de design.**
- Calibrage depuis la mesure existante (121 px @ 21 px, ligne 35) → ~5,76 px de largeur par px de
  fonte → **27 px ⇒ ~155 px sur une ligne**.
- À 1024 px (992 utiles) : 155 + 322,5 (nav `fr`, ligne 43) + 298,8 ≈ **776 px ⇒ ~216 px de
  marge**. **Cela traite #379 sans toucher la nav.**
- Resserrer `space-x-8` n'achèterait que ~16-32 px, au prix de l'espacement interactif, alors que
  le vrai hors-norme est le 57 px. **Rejeté.**
- Cibles tactiles inchangées (CTA `h-11` ligne 175, burger `h-11 w-11` ligne 190).

---

## Arbitrage B — contradiction d'AC de #348

**Verdict : l'AC est mal formulée.** Elle interdit d'« introduire » `text-4xl`/`text-5xl` alors
que le défaut **préexiste** ligne 59.

**Option retenue : ramener le `h1` DANS l'échelle DS. `typography.css` n'est PAS modifié.**

Ajouter `--text-4xl`/`--text-5xl` en prolongeant la progression ~1,27 donnerait 72 px / 92 px :
cohérent avec l'intention d'en-tête (« never Tailwind-default ») mais disproportionné pour un `h1`
de landing, et créerait 2 tokens pour **1 seul site d'usage**. Supprimer ce site rend l'invariant
« never Tailwind-default » **vrai à l'échelle du dépôt** — argument décisif.

### Hiérarchie cible

| Élément | Fichier:ligne | Cible | Rendu DS | Aujourd'hui |
|---|---|---|---|---|
| h1 hero | `HeroSection.tsx:59` | `text-xl md:text-2xl lg:text-3xl` | 35 / 45 / 57 | `text-4xl md:text-5xl` (36/48, hors DS) |
| Sous-titre hero | `HeroSection.tsx:62` | `text-md md:text-lg` + `leading-normal` explicite | 21 / 27 | `text-xl` (35 — quasi égal au h1) |
| Titres de section h2 | `HowItWorks:22`, `Features:29`, `Testimonial:21`, `Cta:38`, `MobileApp:28` | `text-lg md:text-xl` | 27 / 35 | **inchangé** (passe sous le h1 desktop à 57) |
| h3 étape | `HowItWorks:36` | `text-md md:text-lg` | 21 / 27 | **inchangé** |
| Chiffre d'étape | `HowItWorks:34` | `text-lg` + `leading-none` | 27 | `text-2xl` (45 — dépasse le h2) |
| Logo header | `HeaderSection.tsx:110` | cf. arbitrage A | 21 / 27 | `md:text-3xl` (57) |

**Impact tokens : aucun.** Reformuler l'AC de #348 en « **zéro** classe `text-4xl`/`text-5xl`
**restante** dans `frontend/src` », avec un garde-fou grep/lint.

---

## Risques signalés

1. **Les blocs JSDoc `HeaderSection:28-57` et `140-172` chiffrent des largeurs à `md:text-3xl`** →
   ils deviennent faux. **À réécrire dans la MÊME PR**, sinon la prochaine issue recalculera sur
   des chiffres morts.
2. `leading-tight` sur le `h1` devient redondant (`base.css:53`, hors layer, gagne déjà) —
   inoffensif. **Ne pas le « nettoyer » sur les `<p>`/`<span>`** : eux ne sont PAS couverts par
   cette règle.
3. **Piège du `line-height` apparié** (`base.css:21-52`) : un `text-lg` posé sur un **non-titre**
   hérite `--text-lg--line-height` = 1,5556 (défaut Tailwind), pas 1,08. Le sous-titre et le
   chiffre d'étape **doivent** porter un `leading-*` explicite, sinon dérive silencieuse.
4. **Le header perd ~50 px de hauteur** → toute ancre, offset, scroll-spy et **tout E2E qui clique
   en coordonnées** bouge.
5. **Incohérence hors périmètre :** `FooterSection.tsx:38` rend « Ma Timeline » en `text-2xl`
   (45 px), soit plus gros que le logo header cible (27 px). `[MEMORY:decision]` à arbitrer —
   candidat follow-up.
6. `HeaderSection.tsx:110` : le logo est un `<div>`, **pas un lien vers l'accueil**. Écart UX
   distinct — **ne pas le corriger en douce** dans #381.

## Non tranché — mesure navigateur obligatoire

- **Largeur `min-content` réelle du logo à 27 px par plateforme.** Le 155 px ci-dessus est une
  **extrapolation linéaire** depuis 121 px @ 21 px, pas une mesure. Métriques Ubuntu CI ≠ macOS
  (cf. `HeaderSection:156-160`). **Le relevé de #381 fait foi.**
- Marge résiduelle à 1024 px en `fr`/`es`/`de` avec le logo à 27 px : prédiction ~216 px,
  **à confirmer avant de fermer #379**.
- Nombre de lignes du `h1` à `text-xl` (35 px) sur 320-375 px en `de`/`es`, et débordement
  éventuel à `lg:text-3xl` (57 px) dans la colonne `md:w-1/2` (~584 px à 1280). **C'est le seul
  point qui peut invalider `lg:text-3xl`** et forcer un repli sur `lg:text-2xl` (45 px).
- Hauteur de header résultante (`py-6` + 27 px) et son effet sur le rythme vertical du hero
  (`py-20`).

## Fichiers lus

`frontend/src/styles/ds/tokens/typography.css`, `.../ds/tokens/base.css`,
`frontend/src/styles/globals.css`, `frontend/src/components/landing/HeaderSection.tsx`,
`.../HeroSection.tsx`, `.../HowItWorksSection.tsx`,
`.claude/rules-jit/ux-patterns.md` (aucune règle typo — périmètre frise/clavier uniquement).

---

# Addendum — ratification du 17 px du chiffre d'étape (clôture du sprint)

> Second passage `ui-design`, en Phase 1 de `/sprint end`. Le signal `RECOMMAND_UI_DESIGN` restait
> ouvert : le 17 px avait été **imposé par la lettre d'un AC**, jamais choisi par un designer.

## VERDICT : **RATIFIÉ 17 / 21**, `derogation_AC: NON`

Trois arguments, dont un que personne n'avait relevé :

1. **Le chiffre domine sa propre description.** Le `<p>` de la carte n'a aucune classe `text-*` et
   hérite donc `body { font-size: var(--text-xs) }` = **15 px** (`base.css:14`). Hiérarchie interne
   de la carte : **15 < 17 < 21** (mobile), **15 < 21 < 27** (md+). Cohérente, sans dérogation.
   Le chiffre n'est pas « minuscule » — il était simplement comparé au mauvais voisin.
2. **Contraste tenu.** `--color-accent` sur `--color-accent-soft` = **4,94:1** en clair / 5,43:1 en
   sombre. À 17 px gras on est **sous** le seuil « grand texte » (18,66 px gras), l'exigence est donc
   4,5:1 — **ça passe**.
3. **Aucun palier DS n'existe entre 17 et 21.** Les deux candidats supérieurs sont morts par mesure
   (27 égale le h2 ; 21/27 égale le h3). 17/21 est le **seul** point strictement conforme. « Rejeter
   reviendrait à déroger à l'AC pour gagner un cran d'échelle : pas justifiable. »

## Troisième voie proposée — le défaut serait la PASTILLE, pas le chiffre

`h-16 w-16` (64 px) a été dimensionnée à l'époque du `text-2xl` (45 px). Le ressenti « pastille
vide » viendrait du **contenant**, pas du contenu : hauteur de capitale ≈ 0,73 em → **~12,4 px dans
64 px = 19 %** en mobile, ~24 % en md+, contre **30-45 %** pour un badge numéroté usuel.

Correctif proposé : `HowItWorksSection.tsx:65` — `h-16 w-16` → **`h-10 w-10 md:h-12 md:w-12`**
(31 % et 32 % de remplissage). Zéro impact sur l'AC, zéro impact sur
`landing-typography-hierarchy.spec.ts` (la spec mesure le `<span>`, jamais la pastille). Pastille non
interactive → aucune contrainte 44×44 px.

**Non absorbé dans ce sprint** : ce n'est exigé par aucun AC, le 0,73 em est une **estimation non
mesurée**, et `ui-design` lui-même exige une capture d'écran pour trancher le ressenti. Parti en
follow-up.

Recommandation jointe : `aria-hidden="true"` sur le `<span>` du chiffre — purement ordinal, déjà
porté par l'ordre DOM, évite la lecture « 1 Créez votre timeline » au lecteur d'écran.

## NON_TRANCHÉ

- **Le 0,73 em de hauteur de capitale d'Archivo est une estimation, pas une mesure.** Les
  pourcentages 19 % / 31 % en dépendent linéairement. Exige un relevé navigateur via
  `Range`/`getClientRects` **sur le glyphe** — pas `getBoundingClientRect` du span, qui rend la boîte
  de ligne.
- **Perception « pastille vide » à 64 px vs 40 px : capture d'écran obligatoire**, 4 paliers, clair
  ET sombre. En sombre `--color-accent-soft: #16263A` a un contraste de **fond** différent : un
  disque peu contrasté rempli à 19 % peut disparaître visuellement alors que le texte, lui, passe AA.
- Rythme de scan de la rangée de 4 étapes après réduction de 24 px de hauteur : non simulable.

STATUS: COMPLETED
