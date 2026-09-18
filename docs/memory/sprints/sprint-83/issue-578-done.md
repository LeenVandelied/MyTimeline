# Issue #578 — Nav active : pilule graphite (cause racine)

**Commit :** `3a18e7f` — `:lipstick: fix(nav): pilule graphite pour l'état actif et CTA sidebar en bleu accent (#578)`
**Vérification lead :** `git show --stat 3a18e7f` → 4 fichiers, +80/−12, tous dans le périmètre
(`AppShell.tsx`, `AppShell.test.tsx`, `SettingsShell.tsx`, `SettingsShell.test.tsx`).
Aucun fichier de l'agent #518 embarqué — vérifié par le lead, pas seulement déclaré.

## Fichiers de contexte lus (déclarés par l'agent)
`.ai-env/context-packs/pit-frontend.md` (PIT-S58-001, PIT-S58-002, PIT-S61-004, PIT-S74),
`ds/tokens/colors.css`, `styles/globals.css`, `components/ui/button.tsx`,
`ds/components/core.css`, `frontend/e2e/sprint-77-theme-visual.spec.ts`.

## Résumé
- `SettingsShell.tsx:103` — **source** du motif corrigée : `bg-accent-soft text-accent` →
  `bg-primary text-primary-ink font-medium`.
- `AppShell.tsx:243` — copie alignée ; `:196` CTA sidebar en `bg-accent hover:bg-accent-hover
  text-accent-ink` ; commentaire `:91-113` réécrit — il ne désigne plus `SettingsShell` comme
  référence mais le handoff de maquettes.
- Contrastes calculés depuis les tokens (luminance relative WCAG) : **clair 17.76:1**,
  **sombre 16.70:1** sur la pilule ; CTA 6.08:1 / 6.94:1.
- Tests ciblés : `AppShell.test.tsx` + `SettingsShell.test.tsx` → **38 pass / 0 fail**.
  `tsc --noEmit`, eslint, prettier : clean sur les 4 fichiers.

## Non vérifié / manquant (à retenir)
- **Aucune mesure navigateur.** Les deux ratios sont calculés sur les valeurs *déclarées* des
  tokens, pas sur des pixels peints (réserve PIT-S58-001). Non prouvé : empilement de surfaces,
  couleur interpolée par `transition-colors` (PIT-S58-002).
- **Maquette non contrôlée sur pièce** : `design_handoff_mytimeline/README.md` (projet Claude
  Design `e8ce9db5…`) n'a pas été ouvert. L'agent s'est fié à l'énoncé de l'issue pour
  « pilule graphite pleine » et « CTA bleu ».
- **`next build` non lancé** — le worktree portait le travail non commité de #518.
- **Aucun E2E joué** (consigne). Aucun `data-testid` ajouté/modifié ; `sprint-77-theme-visual.spec.ts`
  ne capture que des écrans anonymes → aucune référence PNG invalidée. Non prouvé par exécution.
- **Suite frontend complète : 1329 pass / 6 fail** au moment du run — les 6 échecs sont
  `TimelineView.test.tsx` → `ReferenceError: toLocalIsoDate is not defined`, causés par le
  travail alors non commité de **#518**. **À rejouer après le commit de #518** (fait par le lead
  en Phase 6). Aucun échec dans le périmètre de #578.
- **`hover` sur un lien actif** non spécifié par la maquette : reste graphite. Choix par défaut.

## Signaux mémoire
- `[MEMORY:pitfall]` Un commentaire de code peut institutionnaliser un écart : `AppShell.tsx`
  documentait sa classe active comme « calquée sur `SettingsShell` », transformant un précédent
  interne non sourcé (#86, `43d9e14`) en référence apparente. Corriger la **source** et la copie
  au même commit ; un commentaire qui cite un composant frère comme source de vérité visuelle
  est un signal de dérive, pas une justification.
- `[MEMORY:pattern]` Un test peut figer l'écart : `AppShell.test.tsx:177` s'intitulait
  « applique la classe active calquée sur SettingsShell » et assertait la classe fautive. Un test
  de conformité visuelle doit nommer la **maquette** dans son intitulé, jamais un composant voisin.
- `[MEMORY:decision]` Point 3 de #578 (casse mono-capitales des libellés de nav) **non traité** —
  #575 arbitre la même question hors de ce sprint ; trancher ici produirait deux arbitrages
  contradictoires. Arbitrage imposé par le lead au briefing.

## Recommandations suite
- `RECOMMAND_FOLLOWUP` : casse et police des libellés de navigation (`AppShell` nav + tablist
  `SettingsShell`) — maquette = mono capitales espacées, produit = sentence case.
  **À rattacher à #575** `[XS | frontend]`.
- `RECOMMAND_TEST_RUNNER` : rejouer la suite frontend après le commit de #518, et faire jouer
  l'E2E par le lead (exclusivité Playwright).
- `RECOMMAND_UI_DESIGN` : œil design sur la pilule graphite pleine en thème **sombre**
  (`#ECEDEF` plein dans une sidebar sombre est visuellement lourd) — conforme à l'énoncé, non
  contrôlé sur pièce.

STATUS: COMPLETED
