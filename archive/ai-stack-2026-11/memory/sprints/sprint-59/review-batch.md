# Review batch — Sprint 59 (Phase 7)

> Reviewer spawné par le lead sur `git diff origin/dev...HEAD` (4 commits, 8 fichiers, +1143/−26).
> Briefé sur le piège RTK (`git diff` tronqué) et sur l'échelle DS qui écrase Tailwind.

**Verdict : 0 CRITIQUE · 1 MAJEUR · 6 MINEURS.**

## [MAJEUR] Doublement des tests par thème, pour zéro signal

`landing-typography-hierarchy.spec.ts:457,675` + `landing-header-logo.spec.ts:42,126`

La boucle `SCHEMES` clair/sombre double **32 tests → 64**. Vérifié par le reviewer : **aucune règle
`.dark` ni `prefers-color-scheme` du DS ne touche `font-*` / `text-*` / `leading-*`**, et les
métriques assertées (`fontSize`, `lineHeight`, nombre de lignes, `gap`, `scrollWidth`) sont toutes
**invariantes au thème**.

Coût réel : ~64 `page.goto` supplémentaires sur `next dev` (`playwright.config.ts:47`), avec
`workers: 1` et `retries: 2`, **sur un check e2e requis** pour merger.

Le contraste — la seule grandeur réellement sensible au thème — est déjà couvert par
`landing-cta-contrast.spec.ts`.

## [MINEUR] × 6

1. **`HeaderSection.tsx:149` vs `:199` — deux chiffres MESURÉS contradictoires** pour la même
   grandeur à 320 px en `de`. Le bloc #347 dit « 281 px requis pour 288 dispo → **7 px** de marge »,
   l'addendum #381 dit « **5 px** entre le logo et le groupe droit ». Le header est
   `justify-between` et la `nav` est en `display:none` sous `lg` (2 items flex) : tout le slack
   tombe dans ce gap, **les deux valeurs devraient être égales**. L'une est périmée.
2. **`landing-typography-hierarchy.spec.ts:496-501`** — le JSDoc affirme « Exclusion déjà portée par
   `landing-mobile-overflow.spec.ts` — même liste ». **C'est faux** : 3 sélecteurs ici
   (`#__next-build-watcher` en plus) contre 2 là-bas. → extraire la liste dans `e2e/support/`.
3. **`landing-mobile-overflow.spec.ts:413`** — l'auto-contrôle asserte
   `offenders.some(o => o.tag === 'div')`, pas l'identité de la sonde : **n'importe quel autre `div`
   fautif le satisferait**. → asserter sur `o.cls` / l'id `overflow-self-check`.
4. **`ds-type-scale.test.ts`** — `OUT_OF_SCALE` s'applique aussi aux `.css`, et
   `\btext-(?:[4-9]xl…)` apparie **`--text-4xl`** : le jour où le DS ajoute légitimement ce token à
   `typography.css`, **le garde-fou rougit sur la définition même du token**. → exclure
   `src/styles/ds/tokens/` ou exiger l'absence de `--`.
5. **`ds-type-scale.test.ts`** — `walk(APP_ROOT)` sans garde d'existence : `readdirSync` jette
   `ENOENT` si le test tourne hors du `cwd` `frontend/`.
6. **`HeroSection.tsx:78`** — `leading-tight` sur le `h1` est **inerte** (`base.css:53`, hors layer,
   gagne avec la même valeur 1.08) ; idem `HowItWorksSection.tsx:46` sur le `h2`. Inoffensif, mais
   suggère à tort qu'un `leading-*` pilote un titre.

## [OK] — ce qui a été vérifié et tient

- **Table de hiérarchie vérifiée contre le code** : h1 35/35/45/57 · h2 27/27/35/35 ·
  h3 21/21/27/27 · chiffre 17/17/21/21 · logo header et wordmark footer 21/27/27/27 — conformes à
  `expected()` (spec:482-493) et `EXPECTED_FONT_PX` (spec:58). **Aucun palier `md`/`lg` oublié.**
- **Les `leading-*` du sous-titre et du chiffre sont délibérés et non redondants** (hors `h1..h6`,
  cf. `base.css:23-52`) ; ratios 1.08 / 1.5 / 1 = `--leading-tight` / `--leading-normal` /
  `--leading-none`.
- **JSDoc** : la table 234 / 322,5 px est explicitement étiquetée « relevé HISTORIQUE, ne pas
  recalculer » ; les 122 px du logo sont cohérents avec `text-md` = 21 px ; **aucun `md:text-3xl`
  résiduel dans le code**.
- **Les 2 dérogations sont bien retirées ET verrouillées** : `<footer>` réintégré au balayage
  `pageMaxFontPx` (spec:610-645), chiffre en `<` strict contre h3 **et** h2. **Aucune autre
  tolérance, exclusion de zone, `test.skip`/`test.fail` ou assertion vacuous trouvée.** Les
  exclusions DOM restantes se limitent à l'outillage de dev, justifiées car la CI e2e tourne sur
  `next dev` (`ci.yml:273` + `playwright.config.ts:47`).
- **i18n** : ancrages structurels, jamais sur libellé → 4 locales tenues, `de`/`es` couvertes, aucun
  libellé en dur introduit.
- **a11y intacte** : `h-11` (44 px) du CTA et `h-11 w-11` du burger non touchés, **aucune règle
  `:focus-visible` modifiée** — la dette soldée au Sprint 58 n'est pas réintroduite.
- `tsc --noEmit` propre, `prettier --check` propre, `ds-type-scale.test.ts` PASS.
