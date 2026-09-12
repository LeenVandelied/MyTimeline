# Issue #340 — Audit des CSS non-layerisés (Sprint 53, Vague 2)

**Commit :** `a4c4a6c` — `:bug: fix(ds): layerise les 3 règles hors layer réellement en conflit + audit CSS complet (#340)`
**Audit :** `docs/memory/sprints/sprint-53/audit-css-layers-340.md` (226 lignes)
**Bilan :** 382 règles hors layer recensées · **4 conflits réels démontrés** · **3 corrigés**

## ⚠ La prémisse littérale de l'issue était fausse — et la correction du lead l'était aussi partiellement

L'issue postulait des **sélecteurs d'élément HTML** hors layer dans `animations.css`, `landing.css`,
`hero-timeline.css`, `ds/components/*.css`. Le lead avait mesuré « 0 sélecteur d'élément » dans les
7 fichiers. **Confirmé pour l'élément en tête de sélecteur**, avec deux écarts relevés par le dev :
1. `i18n.css:153` — `time.mt-date--short, time.mt-date--long, time.mt-num` : **qualifié par élément**.
2. ~16 sélecteurs d'élément en position **descendante** (`.mt-btn svg`, `.mt-avatar img`,
   `.mt-table th|td`, `.mt-check input`, `.mt-recur svg`…).

Aucun des deux n'est en conflit réel. **Erreur du lead corrigée :** `landing.css` avait **0** `@layer`,
pas 1 — mon `grep -c '@layer'` avait compté le mot `@layer` **dans un commentaire**.

**Le vrai défaut** n'était pas les sélecteurs d'élément mais les **classes hors layer** : une classe hors
layer bat elle aussi toutes les utilitaires de `@layer utilities`.

## Les 3 corrections livrées (chacune avec sa preuve de conflit réel)

| Règle | Layer | Preuve du conflit |
|---|---|---|
| `ds/components/core.css:176` `.mt-avatar` | `components` | `AppShell.tsx:217` rend `<Avatar className="rounded-sm">` (commentaire sur place : « Avatar carré — override local »). DS `--radius-md` 7px annulait `--radius-sm` 5px → **l'override était un NO-OP**. |
| `landing.css:141` `.timeline-preview` | `components` | `TimelinePreviewSection.tsx:19` pose `rounded-xl` (14px) ; DS `--radius-lg` (10px) l'annulait. |
| `ds/tokens/base.css:89` bloc scrollbar `*` | `base` | L'utilitaire `scrollbar-none` (`globals.css:204`, `@utility` → `@layer utilities`) pose `scrollbar-width:none`, **annulé** par `scrollbar-width:thin`. Sites : `ProductCarousel:50`, `DensityRibbon:77`. |

**Le cas scrollbar est un vrai bug cross-navigateur**, invisible en développement : sous Chromium la barre
disparaissait quand même via l'**autre** moitié de l'utilitaire (`::-webkit-scrollbar{display:none}` —
propriété différente, donc jamais en conflit). **Sous Firefox la barre restait visible.** ⚠ Non observé :
Firefox n'a pas été lancé, le correctif est **déduit**, pas constaté.

## Le 4ᵉ conflit et 2 autres : réels, DÉLIBÉRÉMENT non corrigés

Corriger aurait **créé** la régression — c'est le point le plus important de cet audit :

- **`:focus-visible`** (`base.css:82`) — annule `focus-visible:outline-none` sur ~14 sites et force
  `border-radius:3px` sur tout élément focalisé. **Mais** `language-selector.tsx:54` **dépend** de ce
  comportement (mesuré et documenté sur place, aucun anneau propre posé) : le layeriser supprimerait son
  **unique** indicateur de focus → **régression WCAG 1.4.11**. Idem `ExportDataFlow:85`.
  → follow-up [M] avec arbitrage `ui-design`.
- **`.feature-card` / `.testimonial-card`** — layeriser mettrait leur `:hover{box-shadow|border-color}`
  sous `shadow-lg`/`border-rule`, utilitaires **sans variante `hover:`** → **l'élévation au survol
  disparaîtrait en permanence**.
- **`time, .mono, [data-mono]`** — 2 sites (`EventPreviewTimeline:203`, `WeekAgenda:53`), les **deux**
  posent `font-mono`, soit la même valeur. Dérive nulle → verrou de l'AC appliqué, pas de modification.
- **~770 lignes de `.mt-*`** — posées **seules** partout (hors Avatar). **0 conflit.**

## Layer retenu et pourquoi

`components` pour les classes de composant, **pas `base`** comme l'énonce l'issue. Rang équivalent (les
deux précèdent `utilities`) mais `base` est le layer des resets **et du preflight Tailwind**. `base`
retenu uniquement pour le reset universel `*` (scrollbar).

## Tests

| Commande | Résultat |
|---|---|
| `./scripts/test-quiet.sh frontend` | **834 passed / 0 failed** (92 fichiers, 15,9 s) |
| `npx tsc --noEmit` | 0 erreur |
| `prettier --check` + `eslint` | OK |
| `base-layer.test.ts` | 5 → **11 tests** (3 assertions + 3 témoins anti-vacuité, `from` unique chacun) |
| **Mutations** (dé-layerisation, exigence de rouge) | `core.css` → 1 failed/10 · `landing.css` → 1 failed/10 · `base.css` → 1 failed/10 · référence → 11 passed. **Chaque mutation ne fait tomber QUE son test.** |

## NON VÉRIFIÉ (réserves explicites du fullstack-dev)

- Aucun navigateur ouvert **côté agent** (le lead l'a fait ensuite, cf. `browser-verification.md`).
- **Firefox jamais lancé** : le correctif scrollbar est **déduit**, pas observé.
- `next build` non lancé sur cette vague (vitest + tsc seulement).
- La détection de conflit est **syntaxique** (croisement par nom de propriété) : un conflit passant par
  une variable CSS intermédiaire, un `style={{}}` inline ou une classe concaténée dynamiquement
  **échapperait** au balayage.
- Storybook exclu du balayage (`*.stories.tsx`).
- Ordre des feuilles CSS émises par Next non vérifié **en bundle réel** (le test recompose l'ordre de
  `app/layout.tsx`).

## Signaux mémoire

**[MEMORY:pitfall]** Un balayage des `className` **littéraux** rate les utilitaires passées par la **prop
`className`** d'un composant — c'est ainsi que `<Avatar className="rounded-sm">` échappait. Tout audit de
cascade doit croiser classe-source **et** prop-passthrough, sinon il conclut faussement « 0 conflit ».

**[MEMORY:pitfall]** Layeriser une règle `:hover` la fait passer **sous** une utilitaire sans variante
`hover:` posée sur le même élément → l'état de survol **disparaît en permanence**. Vérifier les paires
(règle `:hover` hors layer / utilitaire non-hover) **avant** de layeriser. Cas `.feature-card`,
`.testimonial-card` : la « correction » aurait créé la régression.

**[MEMORY:pattern]** Un conflit de cascade peut être **masqué par un correctif redondant sur une autre
propriété** : `scrollbar-none` semblait marcher (Chromium masquait via `::-webkit-scrollbar{display:none}`)
alors que sa moitié standard `scrollbar-width:none` était annulée → cassé **sur Firefox seul**.
*Anti-pattern :* conclure « ça marche » depuis un seul moteur quand l'utilitaire agit par deux propriétés.

## Recommandations suite (RECOMMAND_FOLLOWUP)

1. **[M]** `:focus-visible` — layeriser + réauditer les ~14 sites `outline-none`/`outline-hidden` (chacun
   doit porter son propre indicateur avant que le contour global ne cède) + décider si un reset de focus a
   le droit d'imposer un `border-radius`. **Bloqué sur arbitrage `ui-design`.**
2. **[XS]** `FeaturesSection.tsx:41` — **double lévitation au survol** : `hover:-translate-y-2` compile en
   Tailwind 4 vers la propriété `translate` (pas `transform`) et se **compose** avec
   `.feature-card:hover{transform:translateY(-10px)}` → **−18px au lieu de −10** (et −13px sous 768px).
   Pas un problème de layer : retirer l'un des deux.
3. **[L, NON recommandé en l'état]** Layerisation globale des ~770 lignes `ds/components/*.css` dans
   `@layer components` : **0 conflit réel aujourd'hui**, donc 0 bénéfice immédiat contre un basculement de
   précédence composant→utilitaire sur toute la Vue Timeline. À faire seulement si le produit adopte la
   règle « une utilitaire gagne toujours ».
4. **[XS]** `frontend/src/styles/ds/styles.css` n'est **importé par personne** (point d'entrée DS
   autonome) — fichier mort côté app, à statuer.

`RECOMMAND_UI_DESIGN` — **uniquement** pour le follow-up n°1 (`:focus-visible`), **pas** pour ce commit.

STATUS: COMPLETED
