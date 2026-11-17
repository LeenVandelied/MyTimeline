# Mini-plans architect — Sprint 63

> Produit en Phase 3 de `/sprint start` (le sprint n'avait jamais été planifié par `/sprint plan`).
> Architect en lecture seule, HEAD `7743a28`, `origin/dev == HEAD`.
> Lu par `/sprint start` Phase 4.1 pour injection dans la HEAD des briefings fullstack-dev.

`[CTX] cwd=.claude/worktrees/my-timeline-dev-status-f5f568 branch=sprint/63 HEAD=7743a28` — conforme.
`[CTX] origin/dev == 7743a28` — aucun commit au-delà de la clôture S62.
Détection no-op : **aucune issue déjà livrée**, mais **3 pistes d'issue sont fausses ou incomplètes**.

---

## A. Matrice de chevauchement de fichiers

| Paire | Fichier(s) en commun | Nature |
|---|---|---|
| #446 ↔ #441 | `frontend/src/components/shared/DeleteConfirmDialog.tsx` | #441 **édite** (l.93 namespace) ; #446 le **vérifie en non-régression** (critère 3 : 5 autres consommateurs de `ui/select`) |
| #423 ↔ #441 | `frontend/public/locales/{fr,en,de,es}/common.json` | #441 édite `deleteDialog`/`conflictDialog` ; #423 édite potentiellement `common.landing.buttons.register` (option « texte ») — **mêmes 4 fichiers** |
| #74 ↔ #441 | `frontend/public/locales/{fr,en,de,es}/common.json` | idem, si #74 raccourcit un libellé DE |
| #74 ↔ #423 | `HeaderSection.tsx`, `e2e/landing-header-logo.spec.ts`, `e2e/landing-mobile-overflow.spec.ts` | même terrain : bouton `register` DE à 320 px. « button wrap » (#74) et « marge ≥ 10 px » (#423) visent **la même boîte flex** |
| #446 ↔ #447 | **aucun** | #446 : `spacing.css`, `timeline.css`, `select.tsx`, `sprint-62-select-focus-indicator.spec.ts`. #447 : `styles/__tests__/control-border-tier.test.ts` (+ lecture de `core.css`, `globals.css`) |
| #446 ↔ #442 | **aucun** | specs distinctes. `e2e/support/pixel.ts` est **consommé** par #446, non modifié ; #442 n'y touche pas |
| #442 ↔ #441 | **aucun** | le chemin de conflit du désarchivage utilise `products.detail` (namespace valide), pas `conflictDialog` |
| #442 ↔ #74 / #423 | **aucun** | — |
| #447 ↔ #74 | `frontend/src/styles/globals.css` (lecture seule côté #447 ; #74 pourrait y ajouter un `@import`) | faible, mais le test #447 parse `globals.css` via Tailwind (l.100) |
| #447 ↔ #423/#441/#442 | **aucun** | — |

Surveillés et **non partagés en écriture** : `frontend/src/styles/ds/tokens/spacing.css` (#446 seul), `frontend/e2e/support/` (personne n'écrit dedans).

---

## B. Graphe de vagues

```
VAGUE 1 (parallèle — 0 fichier en commun entre les trois)
├── #446  P1/M  select.tsx · spacing.css · timeline.css · sprint-62-select-focus-indicator.spec.ts
├── #447  P2/S  styles/__tests__/control-border-tier.test.ts
└── #442  P2/S  sprint-61-archived-events.spec.ts · ProductDetailView.tsx

VAGUE 2
└── #441  P2/S  DeleteConfirmDialog.tsx · ConflictDialog.tsx · locales/*/common.json
        ← APRÈS #446 : fichier commun `DeleteConfirmDialog.tsx`
          (#446 doit mesurer sa non-régression sur une base stable)

VAGUE 3
└── #423  P2/S  HeaderSection.tsx · landing-header-logo.spec.ts · (locales/*/common.json)
        ← APRÈS #441 : fichiers communs `locales/{fr,en,de,es}/common.json`

VAGUE 4
└── #74   P2/S→M  HeaderSection.tsx · i18n.css · ui/tabs.tsx · locales/*/common.json
        ← APRÈS #423 : `HeaderSection.tsx`, `landing-header-logo.spec.ts`,
          `landing-mobile-overflow.spec.ts`  ← et APRÈS #441 : `locales/*/common.json`
```

`[PRIORITÉ] #446 est en vague 1` — seul P1, seul défaut rendant une fonctionnalité inutilisable.
`[SÉRIE] #74 en dernier est un effet du graphe de fichiers, pas de sa priorité` — il hérite de deux
chaînes (header + locales). Pour le sortir de la queue : le scoper **CSS/composants uniquement, zéro
écriture de locale et zéro écriture de `HeaderSection.tsx`** le fait remonter en vague 2, en
parallèle de #441.

---

## C. Mini-plans

```yaml
issue_446:
  fichiers_cles:
    - "frontend/src/components/ui/select.tsx"                       # l.88 Portal, l.92 z-50
    - "frontend/src/styles/ds/tokens/spacing.css"                   # l.60-65 échelle z
    - "frontend/src/styles/ds/components/timeline.css"              # l.270-271 drawer, l.403,406 sheet, l.432 actionsheet
    - "frontend/e2e/sprint-62-select-focus-indicator.spec.ts"       # l.487 test, l.490 test.fail
    - "frontend/src/components/events/NewEventDrawer.tsx"           # l.73 isCompact, l.135/141 classes
    - "frontend/src/components/layout/AppShell.tsx"                 # l.259 montage en ligne du drawer
  couches_touchees: ["frontend"]
  strategie_test: >
    E2E + sonde de pixel (`frontend/e2e/support/pixel.ts`) sur les 2 thèmes.
    RETIRER les 2 `test.fail()` (un par scheme, boucle `for scheme` l.382) — ne pas les
    neutraliser. Ajouter la mesure mobile (<1024 px) : c'est un chemin de code DIFFÉRENT
    (`.mt-sheet`), pas un simple re-run.
  risque_regression: >
    Remonter `SelectContent` au-dessus de `--z-modal` (70) le fait passer au-dessus de
    `.mt-dialog__overlay` (core.css:293, aussi z-modal) : vérifier qu'un Select DANS un Dialog
    reste correct et que `--z-netbanner` (80) reste au-dessus de tout.
  ordre_ecriture: >
    1. Reproduire au pixel en clair+sombre, desktop ET mobile (<1024 px), AVANT toute
    modification. 2. Trancher l'échelle z (token dédié type `--z-popover-over-modal` entre 70 et
    80, plutôt que muter `--z-popover` qui sert aussi `core.css:97,286` et `timeline.css:316`).
    3. Appliquer sur `select.tsx`. 4. Retirer les 2 `test.fail()`. 5. Non-régression sur les 5
    autres consommateurs. 6. Statuer `.mt-sheet` / `.mt-actionsheet`.
  zod_dto_sync: "NON"
  piste_issue_confrontee: >
    CONFIRMÉE sur le mécanisme, PARTIELLEMENT FAUSSE sur le périmètre.
    Confirmé : select.tsx:92 porte bien `z-50` dans un `SelectPrimitive.Portal` (l.88) ;
    spacing.css:62,64 donnent `--z-popover:50` / `--z-modal:70` ; timeline.css:271
    `.mt-drawer{z-index:var(--z-modal)}` ; AppShell.tsx:259 rend `<NewEventDrawer>` EN LIGNE
    (aucun portail).
    FAUX : l'issue présente `.mt-sheet` (l.406) comme un cas voisin « à traiter dans la même
    passe ». `.mt-sheet` N'EST PAS un voisin : c'est la forme MOBILE DU MÊME COMPOSANT —
    `NewEventDrawer.tsx:73` pose `isCompact = useMediaQuery('(max-width: 1023px)')` et l.141 rend
    `isCompact ? 'mt-sheet' : 'mt-drawer mt-drawer--form'`. Sous 1024 px le Select cassé vit donc
    dans `.mt-sheet`. Le critère « desktop ET mobile » n'est pas une double vérification de
    confort : c'est deux chemins CSS.
    `.mt-actionsheet` (`TimelineActionSheet.tsx`) et `TimelineBottomSheet.tsx` ne contiennent
    AUCUN `ui/select` (grep : 0 hit) → hors risque, mais à consigner comme démonstration, pas
    comme supposition.
  chemins_fantomes: "aucun — les 4 chemins cités existent, aux lignes citées (test.fail à l.490, l'issue dit 487 = ligne de `test(`)"
  possibly_done: false
  etat_reel_du_code: |
    `select.tsx:92` porte toujours `z-50`. `spacing.css` n'a aucun token au-dessus de `--z-modal`
    hors `--z-netbanner:80`. Les 2 `test.fail()` sont en place (spec l.490). origin/dev == HEAD,
    aucun commit correctif.
    Recommandation : ADR (`docs/adr/ADR-008-echelle-z-popover-modale.md`) — modifier un token
    d'échelle partagé par 6 consommateurs + 3 couches modales n'est pas trivial.
    Signaler [MEMORY:decision] au lead.
```

```yaml
issue_447:
  fichiers_cles:
    - "frontend/src/styles/__tests__/control-border-tier.test.ts"   # l.48-56 sélecteurs, l.59-68 borderDeclsOf
    - "frontend/src/styles/ds/components/core.css"                  # l.160, l.172, l.189 règles de focus
    - "frontend/src/styles/ds/tokens/base.css"                      # l.144-149 @layer base :focus-visible
    - "frontend/src/__tests__/e2e-pixel-guards.test.ts"             # méthode de contrôle négatif (427 l.)
  couches_touchees: ["frontend"]
  strategie_test: >
    Vitest node + postcss (le fichier est déjà `@vitest-environment node`). Chaque assertion
    ajoutée doit être PROUVÉE ROUGE en neutralisant la règle visée dans une copie en mémoire du
    CSS, et le run consigné.
  risque_regression: >
    Une assertion « pas de box-shadow » trop large rougirait sur du box-shadow décoratif légitime
    cumulé à un outline ; viser le box-shadow SEUL (outline absent ou `outline:none`).
  ordre_ecriture: >
    1. Écrire une seconde table `FOCUS_INDICATOR_SELECTORS` (formes composées, cf. ci-dessous).
    2. Écrire un `focusDeclsOf()` distinct de `borderDeclsOf()` — le matcher exact actuel ne peut
    PAS servir. 3. Assertion : `outline` présent ET (`box-shadow` seul ⇒ échec). 4. Contrôle
    négatif par assertion. 5. Statuer par écrit le périmètre (règle au sélecteur exact uniquement)
    dans l'en-tête du fichier.
  zod_dto_sync: "NON"
  piste_issue_confrontee: >
    PARTIELLEMENT FAUSSE — diagnostic juste, point d'accroche faux.
    Juste : `borderDeclsOf` (l.63) ne lit que `/^border(-[a-z]+)*$|^border-color$/` ; un
    box-shadow de focus passerait.
    FAUX : l'issue dit d'asserter le focus « des 3 sélecteurs surveillés » (l.53-55 =
    `.mt-check__box`, `.mt-radio__dot`, `.mt-switch__track`). Or AUCUN de ces 3 sélecteurs ne
    porte de règle de focus. Les indicateurs sont déclarés sur des sélecteurs COMPOSÉS
    frère-adjacent, dans core.css :
      l.160 `.mt-check input:focus-visible + .mt-check__box{outline:2px solid var(--color-focus); outline-offset:2px;}`
      l.172 `.mt-radio input:focus-visible + .mt-radio__dot{...}`
      l.189 `.mt-switch input:focus-visible + .mt-switch__track{...}`
    Le matcher `rule.selector.trim() !== selector` (l.62) rendrait `decls.length === 0` et
    l'`expect(...).toBeGreaterThan(0)` ferait échouer le test sur du CSS sain. La garde doit
    cibler la FORME COMPOSÉE.
    Non dit par l'issue : `base.css:144-149` pose un `@layer base :focus-visible{outline:2px
    solid var(--color-focus)}` global — il NE couvre PAS ces 3 contrôles, puisque c'est l'`input`
    masqué qui reçoit `:focus-visible`, pas la boîte peinte. Les règles de core.css sont donc le
    SEUL indicateur : la garde est bien nécessaire, contrairement à ce qu'un lecteur pressé de
    `base.css` conclurait.
    À signaler aussi : `.mt-check__box` est un spécimen DS sans montage applicatif (core.css
    l.115-135 le dit) ; seul `.mt-switch__track` est monté en production
    (`EventEditForm.tsx:624`). La garde reste utile (elle protège le CSS) mais ne pas la vendre
    comme couvrant 3 contrôles applicatifs.
  chemins_fantomes: "aucun — les 3 chemins cités existent ; seules les l.53-55 désignent la mauvaise forme de sélecteur"
  possibly_done: false
  etat_reel_du_code: |
    `control-border-tier.test.ts` (116 l.) ne contient aucune assertion de focus : 3 `it`
    seulement (tier de bordure, non-migration des filets décoratifs, pont `--color-input`). Le
    seul filet de focus est `frontend/e2e/sprint-62-control-focus-contrast.spec.ts`. Rien de livré.
```

```yaml
issue_442:
  fichiers_cles:
    - "frontend/e2e/sprint-61-archived-events.spec.ts"              # 7 tests, 0 sur le 409
    - "frontend/e2e/sprint-42-events.spec.ts"                       # l.94-96 patron 2 contextes, l.131-132 assertion du 409
    - "frontend/src/components/products/ProductDetailView.tsx"      # l.172-188 handleUnarchive, l.412 testid, l.419-424 message inline
    - "frontend/src/hooks/useSetEventArchived.ts"                   # l.43-45 invalidation sur 409
    - "frontend/e2e/support/accounts.ts"                            # storageState partagé (lecture)
  couches_touchees: ["frontend", "e2e"]
  strategie_test: "E2E Playwright, 2 contextes navigateur sur le même compte (patron sprint-42-events.spec.ts:94-96)"
  risque_regression: >
    Ajouter un `data-testid` sur le `<p role="alert">` du message inline modifie un composant de
    production couvert par `ProductDetailView.test.tsx` — vérifier que ses snapshots/queries
    tiennent.
  ordre_ecriture: >
    1. Ajouter `data-testid` au message inline de ProductDetailView.tsx (l.419-424) — il n'en a
    PAS. 2. Écrire le scénario dans sprint-61-archived-events.spec.ts en copiant la mécanique de
    sprint-42-events.spec.ts (ctxA/ctxB, PATCH observé, `expect(status)===409` AVANT d'attendre
    l'UI — anti-flaky). 3. Asserter le re-fetch (`queryKeys.products.all`) par une conséquence
    OBSERVABLE, pas par introspection du cache. 4. Second clic → succès.
  zod_dto_sync: "NON"
  piste_issue_confrontee: >
    CONFIRMÉE, avec un manque. Vérifié : `useSetEventArchived.ts:43-45` invalide bien
    `queryKeys.products.all` sur 409 ; `sprint-61-archived-events.spec.ts` porte 7 tests
    (l.74, 100, 125, 146, 161…) dont aucun ne mentionne 409 ni conflit (grep : 0 hit) ;
    `sprint-42-events.spec.ts` fournit bien le patron 2-contextes (l.94-96, 131-132).
    MANQUE non dit par l'issue : le message de conflit inline (ProductDetailView.tsx:419-424)
    N'A PAS de `data-testid` — c'est un `<p role="alert" class="text-destructive text-xs">`.
    L'issue présente le travail comme « un test à ajouter, rien à développer » ; il faut au
    minimum poser un testid, sinon la spec s'accroche à du texte traduit (fragile) et le check de
    couverture testid de la CI n'a rien à citer. À arbitrer par le dev : testid vs
    `getByRole('alert')`.
    Second manque : le critère « les données sont re-fetchées » n'est pas directement observable
    en E2E. Le proxy honnête est le 4e critère (2e clic réussit sans nouveau 409) ; ne pas
    prétendre asserter l'invalidation elle-même.
  chemins_fantomes: "aucun"
  possibly_done: false
  etat_reel_du_code: |
    Hook 409 en place depuis #307/BR-EVE-015, jamais couvert. La spec S61 couvre
    archiver/désarchiver/filtres/grisage/confirmation, pas le conflit. Aucun commit sur
    origin/dev depuis la clôture S62.
```

```yaml
issue_441:
  fichiers_cles:
    - "frontend/i18n.ts"                                            # l.12-22 indexation par nom de fichier
    - "frontend/app/[locale]/layout.tsx"                            # l.48 loadMessages, l.69 NextIntlClientProvider
    - "frontend/src/components/shared/DeleteConfirmDialog.tsx"      # l.93 useTranslations('deleteDialog'), 12 appels t()
    - "frontend/src/components/shared/ConflictDialog.tsx"           # l.104 useTranslations('conflictDialog'), 15 appels t()
    - "frontend/public/locales/{fr,en,de,es}/common.json"           # fr: l.56 deleteDialog / l.82 conflictDialog ; en/de/es: l.16 / l.42
    - "frontend/src/components/shared/DeleteConfirmDialog.test.tsx" # l.22-24 mock qui masque le défaut
  couches_touchees: ["frontend"]
  strategie_test: >
    Le mock actuel (`useTranslations: (ns) => (k) => `${ns}.${k}`) rend le bug INDÉTECTABLE par
    construction : le remplacer par un `NextIntlClientProvider` alimenté par les VRAIS messages
    `fr` — patron déjà en place dans le dépôt : `DensityRibbon.intl.test.tsx:37-44` et
    `src/components/timeline/fixtures.tsx:185-191`. Réutiliser, ne pas inventer.
  risque_regression: >
    Passer au namespace `common` impose de re-préfixer les ~27 appels `t()` des deux composants
    (`t('cancel')` → `t('deleteDialog.cancel')`, y compris les clés dynamiques
    `t(`${variant}.title`)` l.163 et `t(`fields.${f.key}`)` l.179) : un oubli produit exactement
    le même symptôme qu'aujourd'hui.
  ordre_ecriture: >
    1. Vérification navigateur 4 locales (critère 1, bloquant). 2. Trancher `common` re-préfixé VS
    extraction en `deleteDialog.json` / `conflictDialog.json` (l'extraction ne touche aucun `t()`
    mais duplique 8 fichiers de locale et laisse des clés orphelines dans common.json — arbitrage
    à consigner). 3. Appliquer sur 4 locales. 4. Refaire les tests avec provider réel.
    5. Contre-vérification navigateur sur 2 locales.
  zod_dto_sync: "NON"
  piste_issue_confrontee: >
    CONFIRMÉE PAR LECTURE, INDÉCIDABLE SANS NAVIGATEUR SUR LE RENDU EXACT.
    Confirmé côté mécanisme : `i18n.ts:17` fait `namespace = file.replace('.json','')` et l.22
    `messages[namespace] = content` — les clés de premier niveau de `messages` sont donc
    EXACTEMENT les 13 noms de fichier (auth, categories, common, dashboard, errors, export, legal,
    network, products, register, settings, shell, validation). `deleteDialog` et `conflictDialog`
    n'y figurent pas : ils sont imbriqués dans `common.json` (fr l.56/l.82, en/de/es l.16/l.42).
    `layout.tsx:48,69` passe cet objet tel quel au provider, sans aplatissement. La supposition de
    l'issue est donc exacte au niveau de la donnée.
    CE QUI RESTE INDÉCIDABLE : ce que next-intl AFFICHE. Le comportement par défaut (onError +
    getMessageFallback ⇒ chemin de clé brut) n'est pas configuré explicitement dans ce dépôt —
    `i18n.ts` ne définit ni `onError` ni `getMessageFallback`. Selon la version, le rendu peut
    être la clé brute, une chaîne vide, ou un throw en dev. Le dev DOIT faire le critère 1 avant
    de corriger. L'architect n'a pas lancé le navigateur (contrainte de son mandat).
    Confirmé aussi : les 6 autres namespaces utilisés dans `src` sont tous valides (`common`,
    `products.*`, `settings`, `shell.*`, `dashboard.*`, `categories.*`, `export`, `network`,
    `validation.event`) — le défaut est circonscrit à ces 2 composants.
    Confirmé enfin : le piège de test est réel — `DeleteConfirmDialog.test.tsx` l.22-24 mocke bien
    `next-intl` en `${namespace}.${key}`.
  chemins_fantomes: "aucun — i18n.ts, les 2 composants et les 4 common.json existent, aux lignes citées"
  possibly_done: false
  etat_reel_du_code: |
    `DeleteConfirmDialog.tsx:93` = `useTranslations('deleteDialog')`, `ConflictDialog.tsx:104` =
    `useTranslations('conflictDialog')`. Aucun `deleteDialog.json` / `conflictDialog.json` dans
    les 4 locales (13 fichiers identiques partout). Aucun test de parité/intégrité de clés i18n
    dans `src/__tests__/` (console-error-guard, ds-type-scale, e2e-pixel-guards, smoke) ni
    ailleurs. Rien de livré.
```

```yaml
issue_423:
  fichiers_cles:
    - "frontend/src/components/landing/HeaderSection.tsx"           # l.180-215 relevé, l.224-228 bouton register
    - "frontend/e2e/landing-header-logo.spec.ts"                    # l.83 MIN_GAP_PX, l.131 gapToNextPx, l.144-190 assertions
    - "frontend/e2e/landing-mobile-overflow.spec.ts"                # l.42 WIDTHS, l.43 LOCALES (fr, de seulement)
    - "frontend/public/locales/{fr,en,de,es}/common.json"           # si option « raccourcir le libellé »
  couches_touchees: ["frontend", "e2e"]
  strategie_test: >
    Playwright — le harnais de mesure EXISTE DÉJÀ et n'a pas à être écrit :
    `landing-header-logo.spec.ts` mesure `gapToNextPx` (l.131) sur
    WIDTHS = [320,375,390,768,820,1023,1024,1280] × LOCALES = [fr,en,de,es].
    Le correctif consiste à relever le plancher, l.83 :
    `const MIN_GAP_PX = (width) => (width < 768 ? 1 : 24)` → le `1` doit devenir `10`.
    C'est l'assertion qui matérialise PIT-S52-001.
  risque_regression: >
    Le plancher `1` couvre TOUTES les largeurs < 768 (320/375/390), pas seulement 320. Le porter à
    10 peut rougir en `es`/`de` à 375 ou 390 px — largeurs jamais contraintes jusqu'ici. Mesurer
    les 3 largeurs × 4 locales avant de figer le seuil.
  ordre_ecriture: >
    1. Relever MIN_GAP_PX à 10 et FAIRE ROUGIR la spec (contrôle négatif : sans cette étape rien
    ne prouve que la garde mord). 2. Corriger le layout. 3. Re-mesurer les 4 locales × 3 largeurs
    mobiles. 4. Remplacer le tableau de relevé de HeaderSection.tsx (l.194-199) — NE PAS le
    doubler : le commentaire l.204-210 documente que 3 chiffres ont déjà coexisté pour une seule
    mesure. 5. Retirer la mention « Dette connue, non traitée ici » (l.215-217).
  zod_dto_sync: "NON"
  piste_issue_confrontee: >
    CONFIRMÉE, et plus avancée que l'issue ne le dit. Les 4 mesures de la piste (en 40 / fr 18 /
    es 10 / de 5) sont reproduites À L'IDENTIQUE dans `HeaderSection.tsx:194-199`, avec la
    référence d'image `mcr.microsoft.com/playwright:v1.61.1-jammy` et la date 2026-08-16.
    Le critère « vérification par mesure automatisée (Playwright), pas seulement visuelle » est
    DÉJÀ à moitié satisfait : `landing-header-logo.spec.ts:83` porte le plancher, mais
    délibérément à 1 px, avec le commentaire l.78-79 « mesuré : 5 px en `de` à 320 px — c'est son
    terrain, pas celui-ci », qui renvoie explicitement à cette issue. Le travail n'est donc PAS
    « écrire une mesure » mais « relever un plancher existant et corriger ce qui rougit ».
    NUANCE sur la géométrie : le commentaire l.200-203 établit que le header est
    `justify-between` avec DEUX items seulement (la `nav` est `display:none` sous `lg`), donc
    « marge restante » et « écart logo↔groupe droit » sont LA MÊME grandeur. Toute correction doit
    produire UN chiffre, pas deux.
    Le levier déjà consommé : `max-[360px]:px-3 max-[360px]:text-xs` sur le bouton register
    (l.226). Le prochain levier n'est donc pas « appliquer les métriques sm » (déjà fait au S52) —
    à trouver ailleurs (gap, libellé, ou bascule burger plus tôt).
  chemins_fantomes: "aucun — HeaderSection.tsx est bien sous frontend/src/components/landing/"
  possibly_done: false
  etat_reel_du_code: |
    MIN_GAP_PX vaut toujours `width < 768 ? 1 : 24`. HeaderSection.tsx:215-217 porte encore
    « Dette connue, non traitée ici ». Aucun commit correctif.
```

```yaml
issue_74:
  fichiers_cles:
    - "frontend/src/styles/ds/components/i18n.css"                  # 186 l., 8 sections
    - "frontend/src/styles/globals.css"                             # l.31 @import déjà présent
    - "frontend/src/components/ui/tabs.tsx"                         # l.61 .mt-tabs, l.75 .mt-tab — pas de sous-structure
    - "frontend/src/components/landing/HeaderSection.tsx"           # bouton register DE
    - "frontend/src/components/products/ProductDetailView.tsx"      # l.337 seul consommateur de Tabs avec app/[locale]/(app)/products/page.tsx
  couches_touchees: ["frontend"]
  strategie_test: "à déterminer par fullstack-dev — dépend de l'arbitrage de périmètre ci-dessous"
  risque_regression: >
    Si `.mt-tabs--collapsible` est réellement activé, il faut restructurer `ui/tabs.tsx` (ajout
    d'un `.mt-tabs__row` + d'un `.mt-tabs__menu` avec un Select) : changement de markup sur un
    composant partagé par ProductDetailView et products/page.tsx, pas une pose de classe.
  ordre_ecriture: >
    AVANT TOUT : re-scoper l'issue avec le lead sur la base du constat ci-dessous. Puis, si
    l'audit visuel 4 locales révèle des débordements réels, traiter cas par cas avec les outils
    réellement applicables.
  zod_dto_sync: "NON"
  piste_issue_confrontee: >
    LARGEMENT FAUSSE. Le fichier et les classes existent ; les COMPOSANTS qu'elles ciblent
    n'existent pas. Relevé exhaustif des appelants applicatifs (grep sur frontend/src +
    frontend/app, hors styles/) :
      .mt-sysbanner*        → 1 appelant réel (OfflineBanner.tsx:49-63) OK
      .mt-eyebrow(--wrap/--title) → 0 appelant
      .mt-seg / .mt-seg--de-select → 0 appelant, ET aucun composant « Segmented » n'existe dans
                              le dépôt (grep "Segmented|segmented" : 0 hit). L'action
                              « segmented → Select au-delà du seuil » n'a pas d'objet.
      .mt-btn--wrap         → 0 appelant. Elle ne s'applique qu'aux `.mt-btn`, et `.mt-btn` n'a
                              qu'UN consommateur applicatif (`ui/language-selector.tsx`). Les
                              boutons de l'app sont des `Button` shadcn/Tailwind : la classe n'a
                              aucune prise sur eux.
      .mt-tabs--collapsible → 0 appelant. `ui/tabs.tsx:61` rend un `.mt-tabs` PLAT contenant des
                              `.mt-tab` (l.75). Les règles l.84-88 d'i18n.css exigent
                              `.mt-tabs__row` et `.mt-tabs__menu`, qui n'existent NULLE PART
                              (grep : hits uniquement dans i18n.css). Poser la classe ne
                              produirait rien.
      .mt-truncate / .mt-num / .mt-date--* → 0 appelant
    Conséquence sur la dépendance déclarée : « bloqué par #45 (tokens Tailwind) » est LEVÉ —
    `globals.css:16-31` importe les 4 fichiers de tokens ET `ds/components/i18n.css`. Ce n'est
    pas le blocage. Le blocage est que 3 des 4 actions visent des composants inexistants ou de
    markup incompatible.
    Conséquence sur l'estimation : « S — application de classes utilitaires existantes, pas de
    nouveau code logique » est FAUX pour tabs (restructuration de composant + Select de repli) et
    sans objet pour segmented/eyebrow/button.
    Ce qui RESTE défendable : le critère d'acceptation 1 (auditer les débordements DE sur
    Timeline / formulaire d'événement / réglages) et le critère 5 (non-régression FR/EN).
    L'audit est le vrai livrable ; les « pistes » sont à jeter.
    RECOMMANDATION AU LEAD : re-scoper #74 en « audit de débordement DE sur les 3 écrans, avec
    correctifs ciblés au cas par cas » et sortir explicitement la ligne segmented→Select ; ou
    déplacer #74 hors sprint. Décision du dev.
  chemins_fantomes: >
    Le corps cite « `i18n.css` dans le Design System tokens (chemin à vérifier dans `src/styles/`
    ou `packages/ds/`) » : `packages/ds/` N'EXISTE PAS (dépôt à deux racines, backend/ et
    frontend/, aucun monorepo de packages). Le chemin réel est
    frontend/src/styles/ds/components/i18n.css.
    Le corps cite aussi « l'issue 6.1 » pour les traductions DE : référence non résolvable dans ce
    dépôt (numérotation d'un plan externe). Les 13 fichiers de locale DE existent et sont
    complets — traiter cette dépendance comme satisfaite.
  possibly_done: false
  etat_reel_du_code: |
    i18n.css est bien chargé (globals.css:31, depuis #76). Une seule de ses 8 sections a un
    consommateur applicatif (section 6, bannière système). Les sections 1/2/3/5 visées par
    l'issue sont inertes faute de markup. Aucun commit S63 sur origin/dev. Non pas « déjà fait » :
    « pas faisable tel qu'écrit ».
```

---

## D. Risques de sprint

`[BLOCKER] #74` — 3 des 4 actions ciblent des composants inexistants (`Segmented` : 0 occurrence
dans le dépôt) ou de markup incompatible (`ui/tabs.tsx` n'a ni `.mt-tabs__row` ni `.mt-tabs__menu`).
Arbitrage lead requis AVANT lancement : re-scoper en audit, ou sortir du sprint. Ne pas lancer un
dev dessus tel quel.

`[WARNING] #446` — modifie l'échelle `z` du DS, partagée par `.mt-drawer`, `.mt-sheet`,
`.mt-actionsheet`, `.mt-dialog__overlay`, `.mt-sysbanner--sticky` et 6 consommateurs de `ui/select`.
ADR requis (`docs/adr/ADR-008-*`) + `[MEMORY:decision]` au lead. Estimation M crédible,
potentiellement sous-évaluée du fait des 2 chemins CSS (`.mt-drawer` desktop / `.mt-sheet` < 1024 px).

`[WARNING] #441` — le critère 1 (vérification navigateur) est bloquant et non satisfaisable par
lecture. Le dev doit avoir un environnement debout (backend + `next dev`) avant de commencer. Si
l'environnement n'est pas disponible, l'issue est à décaler, pas à corriger à l'aveugle.

`[WARNING] #423` — relever `MIN_GAP_PX` de 1 à 10 pour **toutes** les largeurs < 768 px expose 375
et 390 px, jamais contraintes. Prévoir un relevé complet avant de figer le seuil ; ne pas
restreindre l'assertion à 320 px pour la faire passer (ce serait affaiblir le test, cf. DEC-S52-004).

`[WARNING] #442` — l'issue affirme « rien à développer » ; il faut au minimum ajouter un point
d'accroche au message inline (`ProductDetailView.tsx:419-424`, aucun `data-testid`). Le critère
« re-fetch vérifié » n'est pas directement observable : le proxy honnête est le 4e critère.

`[WARNING] PIT-S52-001` — #423 et #74 mesurent tous deux des largeurs. Toute mesure faite sur macOS
est nulle et non avenue : image `mcr.microsoft.com/playwright:v1.61.1-jammy` obligatoire,
`--workers=1`.

`[OK] #447` — périmètre net, un seul fichier en écriture, méthode de contrôle négatif déjà établie
au S62. Seule correction à apporter : cibler les sélecteurs composés de core.css (l.160/172/189),
pas les 3 sélecteurs nus de la table l.53-55.

`[MEMORY:decision]` candidat après arbitrage de #446 : « Échelle z du DS — palier popover au-dessus
des couches modales. Contexte : SelectContent z-50 (--z-popover) sous .mt-drawer/.mt-sheet z-70
(--z-modal), drawer rendu en ligne. Alternatives rejetées : portaliser NewEventDrawer (déplace le
défaut sur le focus trap), muter --z-popover (impacte core.css:97,286 et timeline.css:316).
Conséquences : contrainte --z-netbanner (80) doit rester au-dessus. »

---

## E. Arbitrages du dev (Phase 3, 2026-08-31)

### Périmètre du sprint
Le dev a retenu le **milestone complet (6 issues)**, averti des deux options plus étroites
(label seul = #423 + #74 ; ou +#446) et de l'écart aux bornes du skill. Les 4 issues non
labellisées (#441, #442, #446, #447) ont été labellisées `sprint-63` pour que label et milestone
concordent.

### #74 — re-scopée en audit
Sur le `[BLOCKER]` de la section D, le dev a tranché **« re-scoper en audit DE »** (contre
« sortir du sprint » et « garder tel quel »). Le corps GitHub de #74 a été réécrit le 2026-08-31
avec le relevé d'appelants complet ; un commentaire trace la raison et les alternatives écartées.

Le mini-plan `issue_74` ci-dessus reste **valide comme constat**, mais son `ordre_ecriture`
(« re-scoper avec le lead ») est désormais **consommé**. Le livrable est l'audit ; l'estimation
`size:S` est à redéterminer après audit.

Le chevauchement #74 ↔ #423 (même boîte flex du header, mêmes specs) **subsiste** : le graphe de
vagues est inchangé, #74 reste en vague 4 derrière #423.
