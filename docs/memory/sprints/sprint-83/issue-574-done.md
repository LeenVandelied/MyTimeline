# Issue #574 — Ombre au repos → filet 1px (surfaces hors charte)

**Commit :** `ca788e1` — `:lipstick: fix(ds): filet 1px au repos à la place de shadow-lg sur 9 surfaces (#574)`
**Vérification lead :** `git show --stat ca788e1` → 12 fichiers, +32/−20, tous dans le périmètre.
`AppShell.tsx` et `SettingsShell.tsx` **non touchés**, conformément à l'arbitrage imposé.

## Fichiers de contexte lus (déclarés par l'agent)
`ds/tokens/spacing.css`, `ds/readme.md` (60-115), `.ai-env/context-packs/pit-frontend.md`
(PIT-S53-003/004/005/006), `frontend/src/components/settings/*.tsx` (référence : zéro ombre,
`border-rule` seul), `frontend/src/styles/landing.css`, `frontend/e2e/sprint-77-theme-visual.spec.ts`.

## Résumé
- **9 sites trouvés / 9 corrigés** — les 8 de l'issue **plus** `legal/legal-table-of-contents.tsx:40`
  (même motif `rounded-xl border shadow-lg`, rendu à 7 lignes de la carte légale corrigée sur
  `privacy` **et** `terms` ; le laisser cassait la cohérence de l'écran).
- Traitement : **filet seul** partout (le `border-rule` préexistait sur landing et légal),
  **sauf auth = filet + `shadow-xs`** — l'escape hatch nommé par l'issue, retenu parce que
  `--color-bg` #FCFCFD vs `--color-surface` #FFFFFF est un écart quasi nul.
- Légal : `rounded-xl` → `rounded-lg`.
- **2 inversions de survol corrigées, pas 1** : `FeaturesSection` (lg→md, connue) et
  **`TestimonialCard`** (lg→sm via `.testimonial-card:hover` dans `landing.css`) — celle-ci
  **n'était pas signalée par l'issue**, invisible dans le seul `.tsx`.
- **FAB `AppShell:343` non touché** (flottant, hors des 8 sites) — arbitrage architect confirmé.
  `BottomSheet`, `dialog`, `dropdown`, `.mt-drawer/sheet/actionsheet` : usages conformes.
- **#505 n'est PAS redondante** : sa cible `EventContent.tsx:146` (+`:168`) porte `shadow-md`,
  hors périmètre, intacte → **la laisser ouverte**.
- Commentaires PIT-S53-004 (`landing.css`, `FeaturesSection.tsx:36`) réancrés sur `border-rule`
  (le piège de cascade survit ; c'est sa moitié non-`hover:` qui change).
- Tests : `./scripts/test-quiet.sh frontend` complet → **1359/1359, 119 fichiers, exit 0**,
  conforme à la base annoncée. Typecheck + prettier rejoués après l'édition du spec.

## Blocage E2E dur découvert et corrigé (le point le plus important de cette issue)
`AUTH_CARD` (`sprint-77-theme-visual.spec.ts:132`) valait
`div.bg-surface.max-w-md.rounded-lg.shadow-lg` — **ancré sur l'ombre même que l'issue retire**.
Les 8 tests auth seraient tombés en « élément introuvable », **pas** en écart de pixels : un mode
d'échec que rien dans le périmètre de l'issue ne laissait prévoir.
Réancré sur `.border-rule` (l'invariant exigé par la charte) ; unicité vérifiée par grep,
1 seul match par page.

## Références PNG invalidées
**Les 10** de `e2e/sprint-77-theme-visual.spec.ts-snapshots/` :
`login|register|forgot-password|reset-password`-{light,dark} (8, carte auth modifiée) et
`landing-hero`-{light,dark} (2, le cadre image de `HeroSection` perd son ombre).
Le test d'armement (~`:559`, mutation typo du hero) compare à `landing-hero-light.png` : **rouge
lui aussi** tant que les références ne sont pas régénérées.
**Non régénérées** — PIT macOS (faux rouges `doesn't exist`, mutation d'armement gravée dans la
référence par `--update-snapshots`). **La CI Linux doit trancher.**

## Non vérifié / manquant (à retenir)
- **Le rendu en clair et en sombre n'a PAS été observé** — aucun navigateur lancé, jsdom ne le
  prouve pas.
- **Lisibilité des cartes Auth : point ouvert nommément.** Raisonnement sur tokens uniquement —
  `bg` #FCFCFD vs `surface` #FFFFFF ≈ 1,01:1 ; `--color-rule` #E6E7EB sur `bg` ≈ 1,21:1 (chiffre
  du DS, non remesuré). L'agent a **gardé `shadow-xs` précisément parce que le filet seul lui
  paraissait insuffisant — sans preuve**. En sombre, `--shadow-xs` n'a pas été relevé et
  `--color-rule` #20232A sur `--color-bg` #0B0C0E est encore plus ténu. **À trancher à l'œil ou
  au pixel.**
- **Suite E2E non exécutée** (exclusivité lead) : le nouveau `AUTH_CARD` est vérifié par grep,
  pas par un run Playwright.
- `HeroSection:113` garde `rounded-xl` (14 px) — hors des critères de l'issue, mais au-dessus du
  plafond de 10 px si on le lit comme une carte. **Non tranché.**

## Signaux mémoire
- `[MEMORY:pitfall]` **Un sélecteur E2E peut s'ancrer sur la classe même qu'une issue de charte a
  pour but de supprimer** (`AUTH_CARD` = `.shadow-lg`). Le mode d'échec n'est pas un diff de
  pixels mais « élément introuvable », et rien dans le périmètre de l'issue ne le signale.
  Prévention : grep de chaque classe retirée dans `frontend/e2e/` avant de commiter ; ancrer un
  locator visuel sur l'invariant exigé par la charte, jamais sur l'habillage.
- `[MEMORY:pattern]` Un balayage « ombre hors charte » doit croiser l'utilitaire au repos **et**
  la règle `:hover` en CSS — c'est ce croisement qui a révélé la 2e inversion (`TestimonialCard`),
  invisible dans le seul `.tsx`.

## Recommandations suite
- `RECOMMAND_FOLLOWUP` : régénérer les 10 références PNG de `sprint-77-theme-visual.spec.ts`
  **sur Linux après merge**, et mesurer au pixel le contraste carte Auth / fond dans les 2 thèmes
  (valider ou retirer `shadow-xs`) `[XS | frontend]`.
- `RECOMMAND_UI_DESIGN` : arbitrage visuel clair/sombre des cartes Auth privées d'ombre franche —
  **le vrai risque de l'issue, non levé**.

## Note aval
**#610 (Sprint 87) réécrira `HeroSection.tsx`** : le filet posé ici devra être préservé.

STATUS: COMPLETED
