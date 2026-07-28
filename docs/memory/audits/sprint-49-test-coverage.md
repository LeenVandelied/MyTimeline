# Audit tests — Sprint 49

> Phase 6. `[MISSING]` bloque la Phase 9 (PR).
> Base : `origin/dev` @`92c14c4` → HEAD `24f44a3`. 68 fichiers, +6874 / −451.

## Périmètre réel

**Sprint 100 % frontend — vérifié :** `git diff --name-only 92c14c4..HEAD -- backend/` = **vide**,
`-- '*db/migration*'` = **vide**. Aucune couche domaine/application/infrastructure touchée, **aucune
migration Flyway**. La suite backend n'a donc pas été exécutée : elle exige Docker et **ne couvre aucun
fichier de ce sprint**. C'est un choix documenté, pas un oubli.

> ⚠ **V16 reste non consommée — 12e sprint consécutif sans migration** (depuis le S39). Le chemin Flyway
> n'a pas tourné à froid depuis longtemps ; un smoke `flyway migrate` sur base vierge reste à faire.
> Hors périmètre de ce sprint, mais le risque s'accumule.

## Couverture par issue

| Issue | Unit frontend | E2E | Contrôle navigateur | Verdict |
|---|:---:|:---:|:---:|---|
| **#69** virtualisation frise | ✅ 11 tests `virtualization.test.ts` | ✅ `timeline.spec.ts` **verte** | ✅ Storybook + Chromium, mesures rAF | Couvert |
| **#335** tokens `landing.css` | ✅ `landing-palette.test.ts` (AST) | ✅ via `landing-cta-contrast.spec.ts` | ✅ clair + sombre, ratios mesurés | Couvert |
| **#336** bordures WCAG | ✅ `control-border-tier.test.ts` (AST, **mutation validée**) | ⚠ indirect | ✅ auth clair + sombre ; ❌ `EventEditForm` non ouvert | **Réserve, voir ci-dessous** |
| **#334** header responsive | ✅ `HeaderSection.test.tsx` (+7 tests) | ⚠ pas de spec dédiée au débordement | ✅ 320/375/390/768 × fr/de/es × clair/sombre | Couvert par mesure lead |
| **#337** harnais contraste | — | ✅ **12 tests**, mutation validée | ✅ 1280 + 375, clair + sombre | Couvert |
| **correctif `button.tsx`** | ✅ `button.hover-pairing.test.ts` (AST) | ✅ 2 ex-`test.fail()` désormais verts | ✅ 6 écrans survolés, clair + sombre | Couvert |

**Aucun `[MISSING]`.** Aucune règle métier cross-system n'est touchée : les 5 issues sont `epic:design` ou
frontend pur, zéro flux multi-systèmes/rôles, donc **aucun E2E métier obligatoire** au sens du protocole.

## Résultats des runs

| Suite | Résultat |
|---|---|
| **Frontend unitaire** | **685 passed / 0 failed** (84 fichiers, 12,8 s) — relancé par le lead sur HEAD `24f44a3` |
| **E2E Playwright** | **80 passed / 0 failed / 1 skipped** (`settings-profile.spec.ts:36`, `test.fixme` pré-existant) — exécuté sur `24f44a3` |
| **Backend** | **non exécutée — aucun fichier backend dans le diff** |
| `tsc --noEmit` | OK · **eslint** OK · **prettier** OK |

**Baseline E2E prise avant le sprint : 68 passed / 0 failed.** → +12 tests, zéro régression.

## Tests créés pendant le sprint

| Fichier | Objet |
|---|---|
| `frontend/src/components/timeline/virtualization.test.ts` | 11 tests purs sur le fenêtrage |
| `frontend/src/styles/__tests__/landing-palette.test.ts` | AST — aucun littéral de couleur dans `landing.css` |
| `frontend/src/styles/__tests__/control-border-tier.test.ts` | AST — tier des bordures de contrôle, **mutation validée** |
| `frontend/e2e/support/contrast.ts` | Luminance WCAG 2.x, fond composité, normalisation canvas |
| `frontend/e2e/landing-cta-contrast.spec.ts` | 12 tests contraste + troncature, **mutation validée** |
| `frontend/src/components/ui/button.hover-pairing.test.ts` | AST — aucun variant ne pose de `hover:text-*` |
| `frontend/src/components/landing/HeaderSection.test.tsx` | +7 tests (burger, a11y) |

**Trois garde-fous AST** et **deux tests validés par mutation** : le harnais ne se contente plus de
passer, il a été prouvé capable de rougir.

## Ce que le sprint a détecté et corrigé, invisible à la CI

Le Sprint 48 avait livré des défauts visibles avec une **CI entièrement verte**. Ce sprint en a trouvé
**quatre de plus**, tous par contrôle en rendu réel :

1. **3 CTA invisibles au survol** (1,00 / 1,03 / 1,07:1) — héros de la landing, `/fr/privacy`, `/fr/terms`.
   Cause : paire `hover:bg-*` + `hover:text-*` cassable par surcharge partielle. **Corrigé** (`24f44a3`).
2. **`landing.css` non layerisé** battait les classes `border-rule` du S48 → la migration DS du sprint
   précédent n'avait **jamais pris effet** sur ces cartes. **Corrigé** (`1a9ca6b`).
3. **`@keyframes pulse` non préfixé** écrasait `animate-pulse` de Tailwind **pour toute l'application**.
   **Corrigé** (`1a9ca6b`).
4. **Échelle typo DS ≠ Tailwind** : `md:text-4xl` **rétrécissait** les titres au desktop et `h1 < h2` en
   mobile — hiérarchie inversée. **Corrigé** (`8d615e2`).

## Réserves — assumées, non bloquantes

1. **#336, critère 4 partiel.** `EventEditForm` n'a pas été ouvert en navigateur : il exige une session,
   donc le backend, que le briefing du lead avait interdit. Le **contraste est prouvé** par mesure du
   couple utilitaire/fond identique (3,70 clair / 4,10 sombre) ; le **risque de mise en page propre à ce
   formulaire** ne l'est pas. Contrainte créée par le lead.
2. **#69, critère 3 partiel.** Aucun freeze (frame max 33,4 ms contre 133,4 en baseline), mais 60 fps pas
   tenus en continu sur fling à 7200 px/s : 7–10 frames sur 89 dépassent 16,7 ms. Remède identifié
   (mémoïsation des lanes), en follow-up.
3. **#69, budget redéfini.** L'issue demandait « < 16 ms par frame » ; l'agent a retenu ≤100 ms commit /
   ≤150 ms peint, au motif que 16 ms est un budget de frame et non de montage. Mesuré 52,0 / 81,5 ms.
   **Écart aux termes écrits de l'issue, à valider au triage.**
4. **#69, a11y.** `aria-rowcount`/`aria-rowindex` demandés par l'issue, remplacés par `role="list"` +
   `aria-setsize`/`aria-posinset` (les premiers exigent un rôle `grid` incompatible avec le pattern de
   #81). Justifié en `ADR-007`, **à valider au triage**.
5. **Dégradation mesurée et acceptée.** L'icône corbeille des catégories (`ghost`, icône seule) passe de
   4,76 à **3,87:1** en clair et de 5,97 à 5,00 en sombre. **Reste ≥ 3:1** (WCAG 1.4.11, non-texte), mais
   sous 4,5. Coût direct du correctif `button.tsx`, signalé et non masqué.
6. **Débordement résiduel à 768 px** (+90 à +108 selon la locale) — groupe droit du header au palier `md`.
   **Pré-existant, hors périmètre #334** (dont les critères visent 375 et 390), vérifié inchangé par les
   commits du sprint. Follow-up.
7. **Lecteur d'écran réel non testé** (#69, critère 6) : les rôles et labels sont vérifiés au code et au
   DOM, aucun test sur lecteur d'écran matériel.

## Conclusion

**Prêt pour PR.** Aucun `[MISSING]`, aucune régression, baseline E2E dépassée de +12 tests, suites
unitaire et E2E vertes sur le HEAD final. Les 7 réserves ci-dessus sont documentées, mesurées et
traçables — aucune n'est un blocage de merge, 4 relèvent du triage de clôture.
