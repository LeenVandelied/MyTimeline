## Objectif

Solder la **dette de cascade CSS** du design system : des règles écrites hors de tout `@layer`
annulaient silencieusement les utilitaires Tailwind posées sur les mêmes éléments.

Milestone : **Sprint 53** (#53). Sprint **100 % CSS + tests** — aucun `.tsx`, `.ts` applicatif, `.java`
ni `.sql` modifié. **Aucune BR métier touchée. Aucune migration Flyway.**

## Issues traitées

| # | Titre | P | Size | État |
|---|---|---|---|---|
| #339 | `h1..h6 { margin: 0 }` non-layerisé annule silencieusement les `mb-*` | P2 | S | Livrée |
| #340 | Auditer les fichiers CSS non-layerisés restants | P2 | S | Livrée |

> **#346 retirée du périmètre — NO-OP confirmé, pas supposé.** Le plan de l'architecte (ancrage
> `fc2a3a0`) la plaçait en vague 1 avec `possibly_done: false`. Elle a été **livrée au S52** entre-temps
> (PR #374, issue fermée, milestone et label repassés à `sprint-52`). Vérifié au HEAD `2966994` avant
> tout spawn : `focus:bg-accent-soft` est en place aux 5 emplacements, **zéro occurrence** de
> `focus:bg-accent focus:text-accent-foreground` ne subsiste dans `components/ui/`.
> Le sprint devient donc **strictement séquentiel** #339 → #340.
> Dérive de milestone corrigée au lancement : #339 portait « Sprint 52 » avec un label `sprint-53`.

## Changements clés

### #339 — `40665fc`
- `h1..h6` déplacée **en bloc** (5 propriétés) dans `@layer base`, même geste que le S48 sur `a`.
- Les 5 `--leading-*` ajoutées au `@theme` de `globals.css`.
- `FooterSection.tsx` **non modifié** : le CSS suffit à débloquer `mb-3 font-bold`.

### #340 — `a4c4a6c`
Audit exhaustif (`docs/memory/sprints/sprint-53/audit-css-layers-340.md`, 226 lignes) :
**382 règles hors layer recensées · 4 conflits réels démontrés · 3 corrigés.**

| Règle | Layer | Preuve du conflit réel |
|---|---|---|
| `core.css:176` `.mt-avatar` | `components` | `AppShell.tsx:217` rend `<Avatar className="rounded-sm">` — le `--radius-md` (7px) du DS annulait `rounded-sm` (5px). **L'override était un NO-OP.** |
| `landing.css:141` `.timeline-preview` | `components` | `TimelinePreviewSection.tsx:19` pose `rounded-xl` (14px) ; `--radius-lg` (10px) l'annulait. |
| `base.css:89` reset scrollbar `*` | `base` | L'utilitaire `scrollbar-none` pose `scrollbar-width:none`, **annulé** par `scrollbar-width:thin`. Sites : `ProductCarousel:50`, `DensityRibbon:77`. |

**Le cas scrollbar est un vrai bug cross-navigateur** invisible en dev : sous Chromium la barre
disparaissait quand même via l'**autre** moitié de l'utilitaire (`::-webkit-scrollbar{display:none}`,
propriété différente donc jamais en conflit) ; **sous Firefox elle restait visible.**

### Ce qui a été délibérément NON corrigé — corriger aurait créé la régression
- **`:focus-visible`** — `language-selector.tsx:54` **dépend** de son caractère hors-layer : c'est son
  **unique** indicateur de focus. Le layeriser = **régression WCAG 1.4.11**. → follow-up [M].
- **`.feature-card` / `.testimonial-card`** — leur `:hover{box-shadow}` passerait sous `shadow-lg`,
  utilitaire **sans variante `hover:`** → **l'élévation au survol disparaîtrait en permanence**.
- **`time, .mono, [data-mono]`** — 2 sites, les deux posent `font-mono`, même valeur. **Dérive nulle**,
  verrou de l'AC appliqué.
- **~770 lignes de `.mt-*`** — posées **seules** partout (hors Avatar). **0 conflit.**

## Prémisses infirmées par la mesure, avant tout code

1. **L'issue #339 citait `FooterSection.tsx:41`.** Faux : les `<h4 className="text-ink mb-3 font-bold">`
   sont **lignes 43, 63 et 78 — trois occurrences, pas une**.
2. **La prémisse littérale de #340 était largement infondée.** Elle visait des « sélecteurs d'élément
   HTML hors layer » : il n'en existe **aucun** en tête de sélecteur dans les 7 fichiers listés. Le vrai
   défaut portait sur les **classes** hors layer, que l'issue ne mentionnait pas.
3. **Une erreur du lead, infirmée par le fullstack-dev.** J'avais affirmé que `leading-tight` rendait
   1.25 (défaut Tailwind) et que mapper `--leading-*` était une « condition de non-régression ».
   **Faux** — `ds/tokens/typography.css` déclare ces tokens dans un `:root` **hors layer**, homonyme du
   namespace `@theme` de Tailwind 4, et hors-layer bat tout layer : la valeur DS **1.08 gagnait déjà**.
   Le mapping est donc un **NO-OP sur le rendu**, conservé comme assurance et **re-documenté
   honnêtement dans le code**. Corollaire : les « 11 sites impactés » que j'annonçais pour
   `--tracking-*` **ne bougeaient pas**. Confirmé ensuite **en navigateur** (`line-height` mesuré
   38,88px sur 36px = 1.08).

## Tests

| Suite | Résultat |
|---|---|
| Frontend | **92 fichiers, 834 passed / 0 failed** (12,87 s) |
| Backend | **452 tests, 0 failures, 0 errors** — BUILD SUCCESS |
| `base-layer.test.ts` | **5 → 11 tests**, 11 passed |
| Mutations (dé-layeriser, exiger le rouge) | 3/3 — **chaque mutation ne fait tomber que son test** |
| `tsc --noEmit` / `eslint` / `prettier` | 0 / 0 / OK |
| E2E Playwright | **non lancés en local** (backend + Postgres absents) — autorité = CI |

Les tests compilent la **vraie chaîne CSS** via PostCSS + Tailwind 4 et assertent **sur l'AST** : c'est
la seule chose qui prouve quoi que ce soit ici, **jsdom ne résout ni `@layer` ni le layout**.
Chaque fixture témoin a un `from` **unique** (le plugin Tailwind mémoïse par chemin — un `from` partagé
ferait passer le test **à vide**) et chaque regex discrimine le preflight Tailwind homonyme.

> ⚠ Un rapport `test-runner` annonçant `814/821`, une suite en échec sur `eslint-plugin-storybook` et
> « `base-layer.test.ts` : 2 tests » a été **écarté après contre-mesure** : les trois chiffres sont
> faux, le subagent avait tourné depuis le **dépôt principal** au lieu du worktree. Les chiffres
> ci-dessus sont ceux de runs relancés par le lead **depuis le worktree**.

## Revue

`reviewer` sur le diff complet `2966994..HEAD` : **0 CRITIQUE / 0 MAJEUR / 1 MINEUR / 2 NON VÉRIFIÉ**.
Il a re-exécuté les tests lui-même (11/11) et confirmé : ordre interne de cascade préservé
(`.mt-avatar--sm/--lg/--round` battent toujours `.mt-avatar`), layer correct, et **exactitude des
commentaires vis-à-vis du code** — pas de récidive de l'incident de la PR #374.

## Vérification navigateur — clair ET sombre (obligatoire, pitfall S48)

Landing `/fr`, mesures **avant/après contre `origin/dev`** sur la même page, le même navigateur :

| Sonde | avant | après |
|---|---|---|
| `footer h4` ×3 — `margin-bottom` / `font-weight` | `0px` / `600` | **`12px` / `700`** |
| hero `h1` — `margin-bottom` | `0px` | **`24px`** |
| hero `h1` — `line-height` | — | **1.08 préservé** (Tailwind aurait donné 1.25) |
| `.timeline-preview` — `border-radius` | `10px` | **`14px`** |
| `.feature-card` — fond (sombre) | `rgb(19,21,25)` | **`rgb(19,21,25)`** (inchangé) |

**Balayage de contraste WCAG : 38 éléments par thème, 0 sous AA 4,5:1** (pire cas 6,94:1 en sombre).
Le mode de défaillance du S48 (CTA invisibles avec CI verte) est écarté **sur la landing**.
Détail et protocole : `docs/memory/sprints/sprint-53/browser-verification.md`.

## ⚠ Réserves assumées — à lever au prochain accès à un environnement authentifié

1. **Dashboard, settings, products, timeline non ouverts** (backend + Postgres absents en local). Or
   `ui-design` y situait le **risque le plus élevé** : bascule police display → **mono** sur 5 titres du
   dashboard (`KpiMarginalia:38`, `ProductList:29`, `ProductCarousel:43`, `WeekAgenda:40`,
   `CompactAgenda:80`), `mb-2` de `ProductDetailView:211,225`, graisses 600→500 de `settings/`, avatar
   7px → 5px dans `AppShell`. **Ces changements n'ont pas été vus.**
2. **Firefox / WebKit non lancés** — alors que le correctif scrollbar vise *précisément* Firefox : il
   est **déduit de la cascade, pas observé**.
3. Paliers responsive (320 / 768 / 1024 px) non balayés.
4. La détection de conflit de l'audit est **syntaxique** : un conflit via variable CSS intermédiaire,
   `style={{}}` inline ou classe concaténée dynamiquement y échapperait.

## Couverture E2E

`[COVERAGE-E2E] OK` — **aucun `data-testid` ajouté** (aucun `.tsx` modifié). Rien à couvrir.

## Follow-ups proposés (à arbitrer en `/sprint end`)

1. **[M]** `:focus-visible` — layeriser + réauditer les ~14 sites `outline-none` (chacun doit porter son
   propre indicateur avant que le contour global ne cède). **Bloqué sur arbitrage `ui-design`.**
2. **[XS]** `FeaturesSection.tsx:41` — **double lévitation au survol** : `hover:-translate-y-2` compile
   en Tailwind 4 vers `translate` (pas `transform`) et se **compose** avec
   `.feature-card:hover{transform:translateY(-10px)}` → **−18px au lieu de −10** (−13px sous 768px).
   Pas un problème de layer : retirer l'un des deux.
3. **[L, non recommandé en l'état]** Layerisation globale des ~770 lignes `ds/components/*.css` :
   **0 conflit réel aujourd'hui**, donc 0 bénéfice immédiat contre un basculement de précédence
   composant→utilitaire sur toute la Vue Timeline.
4. **[XS]** `ds/styles.css` n'est **importé par personne** — fichier mort côté app, à statuer.
5. **[XS]** Requalifier le mapping `--tracking-*` : purement **cosmétique**, **pas** une correction de
   dérive visuelle (ma justification initiale était fausse).

## Artefacts

- `docs/memory/sprints/sprint-53/issue-339-done.md` · `issue-340-done.md`
- `docs/memory/sprints/sprint-53/audit-css-layers-340.md`
- `docs/memory/sprints/sprint-53/browser-verification.md`
- `docs/memory/audits/sprint-53-test-coverage.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
