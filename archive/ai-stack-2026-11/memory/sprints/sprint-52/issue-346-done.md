commits: [dc2b76ef1a3c71fa0820ac54d334b74c9be82d01]
pack_lu: OUI — cp-frontend.md §Design system « Graphite » (`src/styles/ds/`)

resume: 5 occurrences `focus:bg-accent focus:text-accent-foreground` → `focus:bg-accent-soft` seul, dans `frontend/src/components/ui/dropdown-menu.tsx` (:77 :95 :131 :214) et `frontend/src/components/ui/select.tsx` (:121). Ajout MESURÉ, hors énoncé de l'issue : `text-popover-foreground` posé en utilitaire sur l'item (voir prémisses infirmées). Garde-fou `frontend/src/components/landing/landing.hover-pairing.test.ts` élargi — préfixe `focus:`, périmètre `components/ui/`, raisonnement état par état, 3 témoins ajoutés. Vérifié ROUGE sur exactement les 5 lignes avant correctif, vert après (preuve de non-cécité). Branches `data-[variant=destructive]:focus:*` et `data-[state=open]:*` non touchées (arbitrages distincts) ; le détecteur ne lit que le `focus:`/`hover:` en tête de classe, donc ne les signale pas. `SelectContent` non touché.

verification_navigateur: FAITE. Chrome réel, dev server :3000 + Storybook :6006, `getComputedStyle` + composition des fonds, ratios CALCULÉS (jamais déduits des classes).
- DropdownMenuItem au focus clavier (landing, sélecteur de langue) : clair **14,44:1** (#16181d sur #dbe9fc), sombre **13,06:1** (#ecedef sur #16263a). Repos 17,76:1 / 15,60:1.
- SelectItem au focus (Storybook `ui-select--default`, via Playwright) : clair **14,44:1**, sombre **13,06:1**.
- Perceptibilité du focus (delta de SURFACE repos→focus) : **1,23:1 clair / 1,19:1 sombre**. C'était 4,71:1 / 6,94:1 avec `focus:bg-accent`. Le focus reste visible mais l'indicateur est nettement affaibli — aucun anneau ne le compense.
- ⚠ Item de locale ACTIVE (`ui/language-selector.tsx:65`, hors périmètre) : **1,23:1 clair / 1,28:1 sombre** au focus ET au survol (Radix focalise au `pointermove`). Régression VIVANTE introduite par ce correctif.

tests: `./scripts/test-quiet.sh frontend` → 92 fichiers / **825 tests passed**, 0 failed. `npx tsc --noEmit` → 0 erreur. `SKIP_DELEGATION=1 npx playwright test e2e/landing-mobile-menu.spec.ts -g "sélecteur de langue" --project=chromium --no-deps` → **2 failed** (1,23:1 et 1,28:1 contre seuil 4,5). Reste de l'E2E NON exécuté (le projet `setup` exige le backend, non démarré).

premisses_infirmees:
1. « l'encre restant `text-ink` » — FAUX en l'état. `DropdownMenuContent` porte `text-popover-foreground`, mais c'est une valeur HÉRITÉE : un item enveloppé dans un `<Link>` (cas vivant de `language-selector.tsx`) hérite du `color` de l'élément `<a>`, soit `--color-accent`. Mesuré : `#1170e4` sur `#dbe9fc` = **3,83:1** en clair, sous le seuil — exactement le ratio du défaut du Sprint 49. Le seul retrait de la paire ne suffisait donc pas ; j'ai posé `text-popover-foreground` en utilitaire sur les 5 items. Effet de bord visuel assumé : les items du sélecteur de langue passent de bleu lien à encre de repos.
2. « défaut LATENT, aucun consommateur ne le déclenche » — FAUX. `language-selector.tsx:65` est un consommateur vivant qui pose `bg-accent text-accent-foreground` ; le `focus:bg-accent` du composant de base masquait le désaccord. Le retirer le démasque immédiatement (1,23:1 / 1,28:1), sur la landing publique.
3. Numéros de ligne de l'issue : EXACTS au HEAD `473ed65`, aucune correction nécessaire.

non_couvert:
- Suite E2E complète : NON exécutée (backend requis pour `auth.setup.ts`).
- Suite backend : NON exécutée (aucun fichier Java touché).
- `DropdownMenuCheckboxItem` / `DropdownMenuRadioItem` / `DropdownMenuSubTrigger` : classes corrigées et couvertes par le garde-fou AST, mais **jamais rendues au navigateur** — aucun consommateur trouvé dans le dépôt. Ratios non mesurés pour ces trois-là.
- Thèmes forcés en basculant la classe `dark` sur `<html>` (pas via le vrai bouton `next-themes`).
- `frontend/.eslintcache` apparaît supprimé dans le working tree partagé : pas mon fait, ni committé ni reverté.
- Console dev : un avertissement d'hydratation Radix (`useId`) et des `404 /auth/me` observés — préexistants (backend absent), non attribués à ce correctif, non investigués.
- Renommage du fichier de garde-fou (il dit encore « landing » et « hover ») : non fait, `git mv` risqué avec 3 agents dans le même working tree.

[MEMORY:pitfall] Contexte : un `text-*` posé sur le conteneur d'un composant Radix est HÉRITÉ, donc perdu dès qu'un consommateur enveloppe l'item dans un `<a>`/`<Link>` — l'élément `<a>` réimpose sa propre couleur au milieu de la chaîne d'héritage. Solution : poser l'encre en utilitaire sur l'ÉLÉMENT dont on garantit le ratio, pas sur son ancêtre. Prévention : mesurer `getComputedStyle(el).color` sur l'élément lui-même, jamais raisonner sur la classe du conteneur.

[MEMORY:decision] Contexte : `--color-accent-foreground` (alias shadcn) vs `--color-accent-ink` (jeton DS). Décision : le garde-fou ne sanctionne QUE `text-accent-ink`. Pourquoi : seul le jeton DS a un ratio mesuré ; rien ne garantit que l'alias continue de le suivre.

recommandations suite:
- **RECOMMAND_FOLLOWUP (bloquant, issue #353)** — `frontend/src/components/ui/language-selector.tsx:65` : l'item de locale active impose `text-accent-foreground` et dépendait du `focus:bg-accent` de la base. Correctif d'un jeton, mesuré nécessaire : remplacer `'bg-accent text-accent-foreground font-medium'` par `'bg-accent text-accent-foreground focus:bg-accent font-medium'` (la surface au focus redevient l'accent, la paire sanctionnée du DS redevient cohérente). Fichier NON touché ici : déclaré hors périmètre par le briefing.
- **RECOMMAND_FOLLOWUP** — indicateur de focus affaibli : le delta de surface tombe à 1,23:1 / 1,19:1. Envisager un anneau (`focus:ring-2 focus:ring-ring`) sur les items de menu, arbitrage DS.
- **RECOMMAND_FOLLOWUP** — renommer `landing.hover-pairing.test.ts` (périmètre et nom désormais désaccordés).
- Pitfall subtil pour la revue : le détecteur ignore volontairement les variantes COMPOSÉES (`data-[…]:focus:*`, `dark:…:hover:*`). Un futur couplage écrit sous ces formes passerait au vert.

BLOQUE_SUR: garde-fou E2E `e2e/landing-mobile-menu.spec.ts` (« sélecteur de langue ») ROUGE à cause de ce correctif — 1,23:1 clair / 1,28:1 sombre sur l'item de locale active de la landing publique. Cause dans `ui/language-selector.tsx`, hors périmètre par briefing (issue #353) ; correctif d'un jeton donné ci-dessus. Ne pas fusionner #346 sans lui.
STATUS: PARTIAL

---

## RÉSOLUTION DU BLOCAGE — addendum du lead (2026-07-29)

Le rapport ci-dessus est conservé **tel quel** : au moment où il a été écrit, le blocage était réel
et le `STATUS: PARTIAL` justifié.

Le blocage est **fermé** par le commit `df93b63` (agent de suivi), rendu détaillé dans
`issue-346-followup-done.md`.

- Correctif appliqué sur `frontend/src/components/ui/language-selector.tsx` :
  `text-accent-foreground` → `text-accent-ink` + `focus:bg-accent-hover`.
- **La piste proposée par ce rapport (`focus:bg-accent`) a été écartée après mesure** : elle
  donnait 4,71:1 en clair (marge 0,21 sur le seuil) et surtout un **delta de surface repos→focus
  nul (1,00:1)** — l'item actif devenait indistinguable au focus. La solution retenue mesure
  **6,08:1 en clair / 8,78:1 en sombre**, avec un delta de surface de 1,29:1 / 1,27:1.
- **Une prémisse de ce rapport est infirmée** : « aucun anneau ne compense » est faux.
  `frontend/src/styles/ds/tokens/base.css:51-55` pose `:focus-visible { outline: 2px solid … }`
  **hors de tout `@layer`** (vérifié par le lead : le bloc `@layer base` ne couvre que les
  lignes 44-47), donc l'anneau bat `outline-hidden`. Mesuré au navigateur sur l'item concerné.
- Les 2 E2E « sélecteur de langue » sont **vertes** ; spec entière 21/21 ; suite frontend 825/825.

> ⚠ **Conséquence pour l'issue #339** (layerisation de `base.css`, non planifiée dans ce sprint) :
> la règle `:focus-visible` non-layerisée est **porteuse d'accessibilité**. La layeriser en bloc
> ferait perdre à l'anneau de focus sa priorité sur `outline-hidden`. À traiter explicitement
> quand #339 sera planifiée.

STATUS: COMPLETED
