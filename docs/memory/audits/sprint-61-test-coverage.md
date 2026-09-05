# Audit tests — Sprint 61

> Généré en Phase 6. `[MISSING]` bloque la Phase 9 (PR).
> Base de comparaison : `origin/dev` @ `d5f60eb`. Commits audités : `1dfb527`, `17c73f8`, `afdcfb5`.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-013 | `archived` PATCH-only | NON | ⚠ N/A | ⚠ N/A | ✅ | ✅ | ✅ |
| BR-EVE-011 | quota events actifs = non archivés | NON | ⚠ N/A | ⚠ N/A | ✅ | ✅ | ✅ |
| BR-EVE-015 | édition concurrente → 409 | OUI | ⚠ N/A | ⚠ N/A | ✅ | ✅ | ✅ |
| BR-EVE-006/016 | payload PATCH cohérent sous verrou de champs | NON | ⚠ N/A | ⚠ N/A | ✅ | ✅ | ⚠ indirect |

`⚠ N/A` backend : **le sprint ne touche aucun fichier `backend/**`** (vérifié sur le diff complet).
Aucun test backend n'était donc attendu ; les BR ci-dessus étaient déjà couvertes côté serveur par
les sprints antérieurs.

BR-EVE-011 est le risque de régression principal du sprint (le compteur d'actifs ne doit jamais
suivre le filtre de vue). Il est couvert **deux fois** : test de non-régression Vitest dédié dans
`ProductDetailView.test.tsx`, et assertion E2E de bout en bout
(`sprint-61-archived-events.spec.ts` — après archivage, `product-detail-filter-active` affiche `0`).

## Tests créés

- `frontend/src/components/products/ProductDetailView.test.tsx` — +7 tests (#307)
- `frontend/src/hooks/useSetEventArchived.test.tsx` — 4 tests (#307)
- `frontend/src/components/EventEditForm.test.tsx` — +157 lignes (#230)
- `frontend/src/components/timeline/{EventPill,TimelineMobilePortrait,TimelineMobileLandscape}.test.tsx`,
  `lib-a11y.test.ts`, `types/event.test.ts` — grisage + a11y + propagation duration (#230)
- `frontend/e2e/sprint-61-archived-events.spec.ts` — **5 specs** (3 pour #307, 2 pour #230)

## Résultats de runs

| Suite | Résultat | Exit |
|---|---|---|
| Vitest frontend | **937 / 937** (920 avant les correctifs de review, +17) | 0 |
| `tsc --noEmit` | 0 erreur | 0 |
| `eslint` | 0 erreur | 0 |
| `next build` | OK | 0 |
| E2E — specs du sprint | **13 / 13** (5 du sprint + 8 de `sprint-42-events`) | 0 |
| **E2E — suite complète** | **174 passed / 0 failed / 8 skipped** | 0 |
| Backend | **non rejoué** — zéro fichier `backend/**` au diff | — |
| Coverage-E2E (Phase 8) | 10 testids ajoutés, **0 sans spec** | 0 |

## Ce que la Phase 6 a réellement corrigé

Les deux subagents avaient rendu `RECOMMAND_TEST_RUNNER` : **les 5 specs E2E n'avaient jamais été
exécutées**, faute de serveur. Seule leur compilation TypeScript était prouvée. Le premier audit
délégué a également échoué à les lancer (Turbopack inférant un mauvais workspace root, à cause de
plusieurs lockfiles présents dans les worktrees voisins).

Contournement retenu, **sans modifier le dépôt** : lancer le serveur de dev via `rtk proxy npx next dev`
(le wrapper RTK compressait la sortie ET perturbait le serveur ; `npm run dev` force `--turbopack`).
Backend réutilisé tel quel : conteneur `mytimeline-e2e-backend-e2e-1` sur `:8086`, profil `dev,e2e`
actif (vérifié par le `404` sur `/api/test-support/...`, cf. runbook S47), CORS autorisant `:3100`.

À la première exécution réelle, **2 défauts sont apparus, tous deux côté test** :

1. **`sprint-61-archived-events.spec.ts`** — le clic ciblait l'`<input>` du `Switch`, rendu
   inactionnable par `core.css:146` (`position:absolute; opacity:0; width:0; height:0`). Corrigé en
   cliquant le `<label>` parent — convention **déjà établie et documentée** dans
   `sprint-42-events.spec.ts:246-250`, que la spec neuve n'avait pas suivie.
2. **`sprint-42-events.spec.ts:251`** — **vraie régression de comportement**, attendue et voulue :
   #230 fait que cocher le toggle n'applique plus l'état directement mais ouvre la confirmation
   d'effet quota ; la case reste décochée jusqu'à validation. La spec assertait l'ancien flux. Mise
   à jour pour passer par le dialog. Le commentaire « pas de vue archivés / impossibilité de
   ré-éditer » a été rafraîchi : il est périmé depuis #307.

> **Leçon** : le check de couverture E2E (Phase 8) était **vert avant ces corrections** — il prouve
> qu'un testid est *cité* par une spec, jamais que la spec *passe*. Un sprint dont les E2E n'ont pas
> tourné n'a pas de garantie E2E, quelle que soit la couleur de ce check.

## Conclusion

**Prêt pour PR.** Aucun `[MISSING]`. Suites unitaire et E2E vertes, mesurées et non déduites.

### Réserves explicites (ne pas lire ce vert comme une validation complète)

- **Aucune vérification en navigateur réel** : thème sombre, mobile et paysage jamais regardés à
  l'œil. Les E2E tournent en chromium desktop.
- **Aucun ratio de contraste mesuré.** #230 argumente que `grayscale(1)` préserve le contraste
  (contrairement à `opacity`) — c'est un raisonnement, pas une mesure ; le filtre CSS opère en sRGB
  non linéaire, l'égalité n'est qu'approchée.
- **Backend non rejoué** (justifié : zéro fichier backend au diff, le job CI requis le couvre).
- **Bug i18n préexistant non corrigé** (hors périmètre) : `DeleteConfirmDialog.tsx:93` et
  `ConflictDialog.tsx:104` appellent `useTranslations('deleteDialog')` / `('conflictDialog')`, alors
  que ces entrées sont des **clés dans `common.json`**, pas des fichiers-namespaces. Aucun test ne
  peut l'attraper : l'unitaire mocke `useTranslations` en `` `${namespace}.${key}` ``, et les E2E
  ciblent des `data-testid` sans asserter de texte. **Non constaté en navigateur** — à confirmer
  avant de le traiter.
- **Prettier n'est gaté par aucun job CI** : `sprint-42-events.spec.ts`, `popoverPicker.tsx` et
  `TimelineView.tsx` étaient déjà non conformes au HEAD. Le reformat complet a été **volontairement
  écarté** de ce sprint (239 lignes de bruit qui auraient noyé un correctif de 19 lignes).

---

## Phase 7 — review batch et correctifs (mise à jour finale)

Reviewer : **0 CRITIQUE · 2 MAJEUR · 3 MINEUR · verdict NON-BLOQUANT**. Les deux majeurs ont été
traités dans le sprint plutôt que reportés, parce que tous deux étaient vérifiables.

### MAJEUR 1 — quota fictif dans la confirmation d'archivage → corrigé (`db079e1`)

Le dialog annonçait « libérera d'autant ton quota d'événements » dans les 4 locales, alors que
BR-EVE-011 est une anticipation : `PlanPolicy` est un no-op, aucun endpoint n'expose de plafond,
aucune autre surface n'affiche de tier. Clause retirée, effet réel conservé.

### MAJEUR 2 — contraste sous AA après grisage → corrigé (`ca3f02f`)

`filter:grayscale(1)` ne préserve PAS le ratio de contraste dans la direction défavorable :
`contrastInk` ne choisit que du noir ou du blanc, or ce sont des **points fixes** de `grayscale()`
(seul le fond bouge) ; et le filtre pondère les canaux **gamma-encodés** quand la luminance WCAG
linéarise d'abord — par convexité le gris obtenu est plus sombre. Encre blanche → contraste
augmente ; **encre foncée → il diminue**. Le garde-fou `eventLabelReadableInside` ne connaissait que
la couleur d'origine et ignorait `archived`.

Correctif : `grayscaleHex` (réplique du filtre en gamma-encodé), `renderedEventColor(color, archived)`,
`eventInkColor`, et `eventLabelReadableInside(color, archived)` — encre ET verdict calculés sur le
**couple réellement rendu**, consommés par les 3 surfaces.

Balayage mesuré : **8,6 % des couleurs passant AA échouaient après grisage → 1,5 % après correctif**,
et ces 1,5 % déclenchent désormais le repli « libellé à l'extérieur ».

#### Deux corrections de mesure à consigner

1. **Le lead avait calculé avec du noir pur.** La charte utilise `INK_DARK = #0B0C0E`
   (L = 0.00366), pas `#000000` : le point d'égalisation noir/blanc descend de 4.583 à 4.424.
   Conséquence — `#0070F8`, l'exemple cité par le lead et par la review, **basculait déjà à
   l'extérieur avant le correctif** (4.494 < 4.5) : il ne démontrait pas le défaut. Exemples
   valides : `#0078F8` archivé (3.51:1 muet → 5.57:1) et `#008DFF` archivé (4.37 dedans → repli
   déclenché). **Leçon : recalculer un seuil avec les constantes du dépôt avant de l'annoncer.**
2. **Le briefing du lead affirmait à tort** que `EventPill`, `TimelineMobilePortrait` et
   `TimelineMobileLandscape` partageaient le garde-fou. Vérifié sur `17c73f8` : **seul `EventPill`
   appelait `eventLabelReadableInside`**, les vues mobiles n'avaient aucun repli. Corriger le seul
   verdict aurait laissé 2 surfaces sur 3 à découvert — d'où le choix (accepté) de recalculer
   l'encre sur la couleur rendue.

### Résultats après correctifs

| Suite | Résultat | Exit |
|---|---|---|
| Vitest frontend | **937 / 937** | 0 |
| `tsc --noEmit` · `eslint` | 0 · 0 | 0 |
| `npm run build` | OK (lancé après arrêt du serveur de dev) | 0 |
| **E2E suite complète** | **174 passed / 0 failed / 8 skipped** | 0 |
| Coverage-E2E | 10 testids, 0 sans spec | 0 |

### MINEURS non traités → triage au `/sprint end`

- `popoverPicker.tsx:36-46` — trigger `<div>` sans `role`/`tabIndex`/`onKeyDown`, non actionnable
  au clavier. **Préexistant**, fichier seulement effleuré par ce diff. [XS]
- `httpStatusOf` — 6e copie dans le dépôt. Seuil de tolérance dépassé, extraire `lib/http-status.ts`. [XS]
- Aucun E2E ne couvre le **409 sur désarchivage** (BR-EVE-015), alors que `useSetEventArchived`
  porte une logique dédiée (invalidation on 409). [S]
- Bug i18n préexistant `deleteDialog` / `conflictDialog` (namespaces inexistants). [S]
- **Suppression laissée active sur un événement archivé** — écart assumé par #230 vs le critère
  « seul le désarchivage reste possible », **non arbitré par le dev**. [à trancher]

### Réserves qui subsistent

- **Aucune vérification en navigateur réel** : thème sombre, mobile, paysage jamais observés.
- **La couleur réellement peinte par `grayscale(1)` n'a pas été mesurée en navigateur** :
  l'hypothèse sRGB/gamma vient de la spec CSS Filter L1 §8. Si un navigateur filtrait en linéaire,
  le fond peint resterait un gris pur (le correctif reste valide) mais les seuils exacts des tests
  `#0078F8` / `#008DFF` bougeraient.
- L'état `:hover` d'un archivé (`grayscale(1) brightness(1.04)`) n'a pas été analysé — il éclaircit
  le gris et peut faire varier le ratio de quelques dixièmes.
- **Backend non rejoué** (zéro fichier `backend/**` au diff ; le job CI requis le couvre).
