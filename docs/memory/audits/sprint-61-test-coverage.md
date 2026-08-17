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
| Vitest frontend | **920 / 920** | 0 |
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
