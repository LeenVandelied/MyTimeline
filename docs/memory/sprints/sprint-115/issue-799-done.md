# Issue #799 — Landing : audit WCAG 1.4.4 (texte ×2), débordements horizontaux

## Résumé

Audit à texte ×2 simulé (8 tokens `--text-*` doublés, lus sur `:root`) des 5 sections × `fr`/`de` × 375/1024 px. Le header n'était pas seul en cause : le hero, la frise et le bandeau final débordaient aussi (mots plus larges que leur colonne). Trois correctifs CSS, aucun texte modifié. Au texte nominal, rien ne bouge : empreinte géométrique des 587 éléments de `body` identique avant/après dans les 4 combinaisons (macOS). E2E `sprint-115-landing-text-200` (4 cas) armé : rouge sans correctif. Commit `1eda8b9b`.

## Audit ×2

Relevé AVANT correctif (macOS, Chromium Playwright, `next dev` :3000). Sonde : `scrollWidth` document/body + chaque élément (rect hors fenêtre, `scrollWidth > clientWidth`).

| Section | fr 375 | fr 1024 | de 375 | de 1024 | Cause |
|---|---|---|---|---|---|
| header | DÉBORDE (doc 504) | OK | DÉBORDE (doc 529) | DÉBORDE (doc 1054) | logo 244 + CTA 194/219 + burger 44 sur une ligne non repliable ; à 1024 `de` groupe droit 534 px |
| hero | OK | DÉBORDE (h1 537/396, sur la frise animée, doc intact) | DÉBORDE (h1 417/343, section 433) | DÉBORDE (h1 679/396) | mot insécable (« Organisieren », 70–114 px) |
| frise | OK | DÉBORDE (h3 251/227) | OK | DÉBORDE (h3 240/227, p 254/227) | « renouvellements », « Mindesthaltbarkeit » plus larges que la colonne |
| bandeau final | DÉBORDE (bouton 389/343) | OK | DÉBORDE (h2 398/343) | OK | bouton `inline-flex` borné par sa min-content (« gratuitement » + `px-10`) ; « Organisation » |
| footer | OK | OK | OK | OK | — |
| panneau burger (375) | OK | — | OK | — | aucun élément hors fenêtre |

Après correctif : 0 fautif sur les 4 combinaisons. Restent seuls, IDENTIQUES au texte nominal (donc pas des régressions de ×2) : la piste animée du hero (`aria-hidden`, 1640 px dans un viewport `overflow:hidden`) et le filet décoratif `landing-frieze-rule` du dernier jalon (rogné par l'`ol overflow-hidden`).

## Fichiers

- `frontend/src/components/landing/HeaderSection.tsx` — `<header>` : `flex-wrap gap-x-2 gap-y-2` (+ commentaire chiffré). Le groupe CTA/burger passe à la ligne ; la barre grandit (ResizeObserver #614 inchangé).
- `frontend/src/components/pages/HomePage.tsx` — `break-words` sur la racine, hérité par les 5 sections (h1 hero, h2 bandeau, h3/p frise). `break-word` ne change pas la min-content, donc aucune mise en page nominale ; `HowItWorksSection` NON touché.
- `frontend/src/components/landing/CtaSection.tsx` — bouton final `[overflow-wrap:anywhere]` (seul moyen de réduire la min-content d'un `inline-flex`).
- `frontend/e2e/support/text-zoom.ts` — NOUVEAU : `applyTextX2(page)` (8 crans doublés, lus sur `:root`, rend les valeurs nominales).
- `frontend/e2e/sprint-104-landing-sticky-nav.spec.ts` — utilise le helper partagé ; le relevé `Range` ignore le texte `.sr-only` (faux rouge PIT-S77-002 : « Sprache ändern » masqué sortait de 14,5 px sous la barre une fois le groupe replié).
- `frontend/e2e/sprint-115-landing-text-200.spec.ts` — NOUVEAU (4 tests) : précondition (`h1` au double de sa taille), garde de vacuité (> 20 éléments texte inspectés), document + body, et éléments porteurs de texte (boîte dans la fenêtre ET contenu dans la boîte), exclusions `.sr-only` / `aria-hidden` justifiées. Pas de nouveau `data-testid`.

## Tests

- Nouvelle spec : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy npx playwright test e2e/sprint-115-landing-text-200.spec.ts --project=chromium --no-deps --ignore-snapshots --reporter=line` → 4 passed.
- Armement (`--retries=0`) :
  - les 3 correctifs retirés → 4/4 rouges (rejoué sur l'état combiné après le commit #797 `49e712d1` : 4 failed) ;
  - `flex-wrap` du header retiré seul → 3 rouges (fr 375, de 375, de 1024 : CTA hors fenêtre, doc 504/529/1054) ;
  - `break-words` racine retiré seul → 3 rouges (h1/h2/h3/p) ;
  - `anywhere` du bouton retiré seul → 1 rouge (fr 375, bouton 16→405) ;
  - restauration vérifiée par `cmp` / `git checkout` sur les fichiers commités.
- Rejeu complet (15 specs du briefing + la nouvelle, avec projet `setup`) → **205 passed, 0 failed** (3,4 min), joué APRÈS le commit #797. Oracles avant : `/api/auth/me` 401, `/fr/login` 200. `git status | grep darwin` vide.
- Vitest : `src/components/landing src/components/pages` 10 fichiers / 76 tests ; suite complète 177 fichiers / 2326 tests verts.
- `rtk proxy npx tsc --noEmit` exit 0 ; `next lint --file` (6 fichiers) 0 warning ; `prettier --check` (6 fichiers) OK après `--write` sur `CtaSection.tsx` (ordre de classes seulement).
- **Non vérifié** : métriques de police Linux (seule la CI tranche ; les correctifs ne dépendent d'aucun chiffre absolu, et le repli du header ne se déclenche qu'en dessous de 8 px d'écart, sous le plancher 10 px de `landing-header-logo`) ; `sprint-77-theme-visual` (captures Linux, hors périmètre local — l'empreinte nominale identique laisse attendre des captures inchangées) ; `en`/`es` à ×2 ; 320 px à ×2 ; Safari/Firefox ; vrai zoom texte navigateur (simulation par tokens uniquement).

## Signaux mémoire

- [MEMORY:pitfall] Contexte : audit 1.4.4 réduit au header parce que l'issue ne citait que lui. Solution : la sonde par élément a trouvé 4 sections fautives sur 5, dont 2 (hero 1024, frise 1024) où le texte déborde sur sa voisine SANS élargir le document. Prévention : à ×2, sonder `scrollWidth > clientWidth` des éléments porteurs de texte, pas seulement `documentElement.scrollWidth`.
- [MEMORY:pitfall] Contexte : un bouton `inline-flex` avec `whitespace-normal` déborde quand même à ×2. Solution : sa largeur est bornée par la min-content de son texte, que `overflow-wrap: break-word` ne réduit pas ; `anywhere` la réduit. Prévention : `break-words` suffit pour un bloc de largeur définie, pas pour un `inline-flex`/item flex sans `min-w-0`.
- [MEMORY:pattern] Problem : prouver qu'un correctif CSS ne change rien au rendu nominal sans captures. Solution : empreinte `tagName:left,top,width,height` de tous les éléments de `body` avant/après, par locale × largeur ; 0 diff = mise en page nominale identique sur cette plateforme. Anti-pattern : se fier aux seules specs de non-régression, qui n'échantillonnent que quelques éléments.
- [MEMORY:pitfall] Contexte : test `Range.getClientRects()` « texte contenu dans la barre » rougi par un repli légitime. Solution : le texte `.sr-only` est rapporté hors de son clip (récurrence PIT-S77-002) — l'exclure explicitement. Prévention : toute sonde `Range`/TreeWalker de texte filtre `.sr-only`.

## Recommandations suite

- RECOMMAND_FOLLOWUP: étendre l'audit texte ×2 aux autres écrans publics (login, register, forgot/reset, privacy/terms) et à 320 px / `en` / `es` sur la landing [triage S | domaine frontend]
- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY : classes CSS et specs E2E, aucun flux de données.
- Pas de RECOMMAND_TEST_RUNNER : 16 specs landing (205 verts) et Vitest complet joués par l'agent.
- Pas de RECOMMAND_UI_DESIGN : aucun changement visuel au texte nominal (empreinte identique) ; à ×2, retour à la ligne standard.

fichiers de contexte lus: `docs/memory/sprints/sprint-115/briefing-799.md` (intégral) ; `.ai-env/context-packs/pit-frontend.md` (grep des ancres demandées : l.69-80, 355-360, PIT-S63-012 l.621, PIT-S77-002 l.917, PIT-S104-003 l.1748, PIT-S96-006 l.1604, PIT-S112-007 l.1872 — titres seuls pour ces deux derniers) ; `docs/memory/sprints/sprint-104/issue-614-done.md` (l.1-80) ; `frontend/src/components/landing/HeaderSection.tsx` (intégral) ; `frontend/e2e/sprint-104-landing-sticky-nav.spec.ts` (l.1-320) ; `frontend/src/styles/ds/tokens/typography.css` (l.1-45) ; `frontend/src/styles/landing.css` (l.1-80) ; `frontend/src/components/pages/HomePage.tsx` (intégral) ; `frontend/src/components/landing/CtaSection.tsx` (l.30-70) ; `LandingMobileMenu.tsx` NON LU (mesuré au navigateur uniquement)
STATUS: COMPLETED
