# Extrait maquette — Landing, hero (Sprint 87)

> Lu par le lead le 2026-09-13 via DesignSync dans le projet des maquettes `e8ce9db5…`,
> fichier `design_handoff_mytimeline/Landing.dc.html`. Les subagents n'ont PAS accès à
> DesignSync : **ce fichier est leur source de vérité visuelle** pour #610 et #611.
> Pour un point visuel précis, la règle CSS de la maquette prime sur le README du handoff
> (`docs/design/graphite-handoff.md` §1 Landing, qui ne fait que résumer).

## 1. Section hero (conteneur) — périmètre #610

```css
section { display:flex; align-items:stretch; gap:40px; max-width:1340px; margin:0 auto;
          padding:64px 40px 56px; flex-wrap:wrap; }
```

- **Colonne texte** : `flex:1 1 300px; min-width:300px; max-width:420px;`
  `display:flex; flex-direction:column; justify-content:center;`
- **Colonne frise** : `flex:1 1 460px; min-width:340px;`
- Le « 30/70 » du README est donc un **flex asymétrique borné** (texte ≤ 420px, frise
  prend le reste), pas une grille à pourcentages. À 1340px : ~420 / ~800.
- `flex-wrap:wrap` → empilement quand la place manque. ⚠ `min-width:340px` + padding 40px
  **déborde à 320px** : la maquette ne traite pas le mobile. Le comportement mobile est à
  définir par #610 (critère d'acceptation) et doit passer `landing-mobile-overflow.spec.ts`
  et `sprint-63-de-overflow-audit.spec.ts`.

### Contenu de la colonne texte (maquette) — pour mémoire, HORS périmètre S87
Surtitre mono 11px uppercase accent « Assistant d'organisation » ; h1 display 50px ;
paragraphe 17px ink-muted max 400px ; 2 boutons `accent` lg + `secondary` lg ; ligne mono
11px ink-faint « Gratuit pour commencer · FR · EN · ES · DE ».
**Ne pas refaire la typo ni les textes du hero dans ce sprint** : l'échelle du `h1` est
verrouillée par `landing-typography-hierarchy.spec.ts` et par #348 ; les textes
(surtitre, ligne mono) seraient de nouvelles clés i18n non demandées par les issues.

## 2. Panneau de la frise — périmètre #610 (contenant) / #611 (contenu)

```css
.panel { position:relative; border:1px solid var(--color-rule-strong); border-radius:14px;
         background:var(--color-surface); box-shadow:var(--shadow-md); overflow:hidden;
         height:420px; }
```

Barre de chrome en tête du panneau (appartient au panneau → #610) :
```css
.chrome { display:flex; align-items:center; gap:8px; padding:11px 16px;
          border-bottom:1px solid var(--color-rule); }
/* 3 pastilles */ width:9px; height:9px; border-radius:50%; background:var(--color-rule-strong);
/* libellé */     font-family:var(--font-mono); font-size:10px; letter-spacing:.1em;
                  text-transform:uppercase; color:var(--color-ink-faint); margin-left:8px;
                  → texte « app.mytimeline · frise »
```

⚠ **Conflit à arbitrer par #610, préférence du lead : garder le filet, pas l'ombre.**
La maquette pose `box-shadow: var(--shadow-md)` au repos sur le panneau. Or **#574 (S83,
fermée)** a précisément retiré les ombres au repos des surfaces de la landing au profit
d'un **filet 1px** (« 8 surfaces hors charte »), et le conteneur actuel
`HeroSection.tsx:113` porte ce filet (`border-rule … border`, sans ombre). Réintroduire
`shadow-md` défait #574. → Filet conservé ; écart de maquette consigné dans le done.md.
Tier de bordure : la maquette dit `rule-strong` ; vérifier l'existence du token côté dépôt
(`src/styles/ds/tokens/colors.css`, classes `border-rule-*`) avant de choisir.

## 3. Frise animée — périmètre #611

Viewport sous la barre de chrome :
```css
.lp-viewport { position:relative; overflow:hidden; height:373px;
  mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
  -webkit-mask-image: (idem); }
```

Piste animée — **boucle sans raccord par duplication** :
```css
@keyframes lp-pan { from { transform:translateX(0) } to { transform:translateX(-50%) } }
.lp-track { display:flex; width:1640px; animation: lp-pan 52s linear infinite; }
@media (prefers-reduced-motion: reduce) { .lp-track { animation:none !important } }
```
La piste contient **deux copies identiques** d'un bloc de 820px (`pair: [0, 1]`) ; la
translation de −50% ramène exactement la 2e copie à la position de la 1re → aucun saut.
Easing **`linear`** (et non `--ease-quart` : la courbe DS de motion ne s'applique pas à un
défilement continu — c'est l'« écart secondaire » de l'issue).

Bloc de 820px :
- **Ruler** : hauteur 34px, `border-bottom:1px solid rule` ; gouttière gauche 120px
  (`border-right:1px solid rule`, vide) ; libellés de mois mono 9px ink-muted, positions
  absolues `left: 14 / 190 / 370 / 540px`, `top:9px` → `MAI JUIN JUIL AOÛT`.
- **6 lanes**, hauteur 46px chacune, `border-bottom:1px solid rule` (sauf la dernière) ;
  **zébrure** une lane sur deux (2e et 4e) :
  `background: color-mix(in srgb, var(--color-ink) 2.6%, transparent)`.
- **En-tête de lane** (gouttière 120px, `border-right: rule`, padding 0 14px, colonne
  centrée) : nom `600 13px var(--font-display)` + catégorie `8px mono, letter-spacing .08em,
  uppercase, ink-muted`.

| Lane | Nom | Catégorie | Éléments (left / top / largeur, fond, encre) |
|---|---|---|---|
| 1 | Renault Clio | Véhicules | barre 24/10/230 `#E5484D` blanc « ↻ Assurance auto » · barre 300/10/96 `#EE7B30` encre `#16181D` « Contrôle » |
| 2 (zébrée) | Habitation | Assurance | barre 120/10/150 `#6C7BE0` blanc « ↻ Prime annuelle » |
| 3 | Santé | Médical | barre 60/10/120 `#B056A8` blanc « Ordonnance » · **ponctuel** pin 420/15 (10×16, radius 3) `#4FA459` + libellé à 436/16 « Bilan annuel » en encre `ink` |
| 4 (zébrée) | Abonnements | Finances | barre 20/10/560 `#3B62D4` blanc « ↻ Licence logiciel » |
| 5 | Garde-manger | Alimentation | ponctuel pin 250/15 `#E3A82B` + libellé 266/16 « Huile d'olive · DLUO » |
| 6 | *(dernière lane, pas de bordure basse)* | — | — |

⚠ La table maquette ne montre que **5** lanes remplies dans le bloc (la 6e ligne listée par
l'issue = « Garde-manger »). Compter : Clio, Habitation, Santé, Abonnements, Garde-manger =
**5 lanes de 46px** + ruler 34px = 264px ; le viewport fait 373px. Le README dit « 6 lanes ».
→ #611 tranche (6e lane réelle ou 5) et le consigne ; le critère d'acceptation GitHub dit 6.

Barre pleine : `height:26px; border-radius:6px; font:600 12px var(--font-ui);
display:flex; align-items:center; padding:0 10px; box-shadow:var(--shadow-sm)`. Préfixe
`↻` = récurrent. Convention DS « barre pleine » = `.mt-evt` (`src/styles/ds/components/
timeline.css`, rendu par `EventPill.tsx`) — à réutiliser si ses dimensions collent.
Couleurs : les hex de la maquette sont des couleurs d'**événement/catégorie** ; chercher les
tokens de palette de catégories du dépôt plutôt que coder les hex en dur (règle DS : zéro
hex hardcodé dans les composants).

**Curseur TODAY** — HORS de la piste animée (il reste fixe pendant le défilement) :
```css
.today { position:absolute; left: calc(120px + (100% - 120px) * 0.46); top:0; bottom:0;
         width:2px; background:var(--color-accent); pointer-events:none; }
.today span { position:absolute; top:6px; left:50%; transform:translateX(-50%);
  font:9px var(--font-mono); letter-spacing:.12em; color:var(--color-accent-ink);
  background:var(--color-accent); padding:2px 6px; border-radius:3px; }  /* « TODAY » */
```

## 4. Ce que la maquette ne dit pas (à décider et consigner)

- Libellés (noms de produits, catégories, événements, mois, « TODAY », « app.mytimeline ·
  frise ») : **texte illustratif en dur ou i18n ?** La frise est `aria-hidden`
  aujourd'hui ; si elle le reste, le texte n'est pas lu, mais il est VU dans 4 locales.
- Largeur de piste fixe 1640px vs panneau fluide : la maquette suppose un panneau ≥ ~800px.
- Comportement sous le palier tablette (#610).
