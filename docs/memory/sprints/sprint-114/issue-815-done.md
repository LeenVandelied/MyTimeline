# Issue #815 — Tabs DS : le focus suit la sélection au clavier
## Résumé
- Cause : `frontend/src/components/ui/tabs.tsx` `onKeyDown` appelait `select(next.value)` sans aucun `.focus()` → focus resté sur l'onglet quitté (`tabIndex=-1`, `aria-selected=false`).
- Correctif : `tabRefs = useRef<(HTMLButtonElement|null)[]>([])` (ref callback par onglet, scopée à la tablist, pas de `document.querySelector`) ; `onKeyDown` calcule `nextIndex`, appelle `select()` puis `tabRefs.current[nextIndex]?.focus()`. Focus posé dans le gestionnaire, PAS dans un effet sur `current` (un changement au clic ou venu du parent ne vole pas le focus). Pas d'option `focusVisible`.
- Consommateurs : `app/[locale]/(app)/products/page.tsx` et `src/components/products/ProductDetailView.tsx` vérifiés, AUCUNE modification nécessaire (contrôlés, `onValueChange` accepte toutes les valeurs de leurs items ; aucune vue montée par onglet ne prend le focus au montage — les `.focus()` de `ProductsListView`/`CategoriesView` sont conditionnés à la fermeture du drawer). `SettingsShell` non touché (hors `ui/tabs.tsx`).
- Tests : `frontend/src/components/ui/tabs.test.tsx` (nouveau) 15 tests — contrôlé + non contrôlé × (Tab entrée, →, ←, bouclage aux deux bouts, End/Home, touche inerte) + onValueChange 1×/navigation + clic + 2 tablists sur la page (scope des refs). **Test rouge avant correctif : oui — 9 échecs / 15**. Après : 15/15. Suite `src/components/ui` 111/111 (9 fichiers) ; `ProductDetailView.test` + `app/[locale]/(app)/products` 38/38 ; `tsc --noEmit` exit 0 ; `next lint --file` ×3 : 0 ; `prettier --check` ×3 OK.
## Commits
- 09b72861 :bug: fix(ui/tabs): le focus suit la sélection au clavier ←/→/Home/End (#815)
## Spec E2E à exécuter par le lead
- `frontend/e2e/sprint-114-tabs-focus-follows.spec.ts` — sur `/fr/products` (`products-tabs`) et fiche produit semée (`product-detail-filter`), 1280 et 390, clair, `storageState: PROD` : armement clic + Shift+Tab/Tab, puis →, ←, ← (bouclage), → (bouclage), End, Home ; à chaque pas : onglet attendu `toBeFocused`, `:focus` `aria-selected=true`, `tabindex=0`, `:focus-visible` conservé, un seul `tabIndex=0`. `--list` : 4 tests chromium (+5 setup = 9). NON exécutée (consigne). Risque connu : l'assertion `:focus-visible` après `.focus()` programmatique repose sur l'heuristique Chromium « dernière interaction clavier » — si elle rougit, c'est un vrai défaut d'anneau, pas un défaut de spec.
- À rejouer aussi : `frontend/e2e/sprint-107-tab-focus-outline.spec.ts` (armement par clic/Shift+Tab/Tab, sans flèche → non impacté en théorie, non vérifié) et les autres specs citant `products-tabs`/`product-detail-filter` : `sprint-113-focus-return`, `sprint-101-touch-targets`, `sprint-61-archived-events`, `sprint-106-product-detail`, `categories`, `sprint-93-restore-product`, `sprint-112-touch-targets`.
## Fichiers de contexte lus
- `docs/memory/sprints/sprint-114/briefing-815.md` — intégral.
- `.ai-env/context-packs/pit-frontend.md` — grep ciblé : PIT-S107-001 (l.1793, défaut source), PIT-S83-014 (l.1200, `focus({focusVisible:true})` n'arme pas `:focus-visible` → armement par vrai Tab), l.1433 (`storageState` par fichier).
- `.ai-env/context-packs/br-products.md` — §1 Lifecycles (l.8, onglet « Archivés » de `/products`) ; aucune BR impactée.
- `docs/memory/sprints/sprint-107/issue-524-done.md` — RECOMMAND_FOLLOWUP d'origine, mesure 8/8.
- `docs/memory/sprints/sprint-107/issue-608-done.md` — NON LU (sr-only/overflow, hors sujet focus).
- `frontend/e2e/sprint-107-tab-focus-outline.spec.ts` — `armByKeyboard` (clic + Shift+Tab/Tab) réutilisé.
- `frontend/e2e/support/products.ts` — l.46/55/76 `getUserId`/`seedCategory`/`seedProduct` ; `frontend/playwright.config.ts` l.17/89 (baseURL, testDir).
- `frontend/src/styles/ds/a11y-audit.md` l.446-449 — note « ⚠️ Constaté en passant » désormais périmée (non modifiée : hors fichiers attribués).
## Signaux mémoire
- [MEMORY:pattern] Problem: roving tabindex + activation automatique. Solution: focus posé dans le gestionnaire clavier (refs par index), jamais dans un effet sur la valeur sélectionnée. Anti-pattern: `useEffect(() => ref.focus(), [current])` qui vole le focus à chaque changement venu du clic ou du parent.
- [MEMORY:pitfall] Context: PIT-S107-001 résolu par #815 (S114) — marquer la fiche comme corrigée ; `a11y-audit.md` §8ter l.446-449 la décrit encore comme un écart ouvert.
## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun changement de schéma ni de requête.
- Pas de RECOMMAND_SECURITY : composant UI pur, aucune donnée ni auth.
- Pas de RECOMMAND_UI_DESIGN : aucun changement visuel, comportement clavier conforme APG.
- Pas de RECOMMAND_TEST_RUNNER : suites Vitest ciblées jouées ; E2E réservés au lead par consigne.
- Follow-up a11y-audit.md l.446-449 absorbé par le lead (commit docs(a11y) #815).
STATUS: COMPLETED
