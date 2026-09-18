# Issue #74 — audit des débordements en locale `de` (issue re-scopée)

**Vague :** 4 | **Taille :** S → audit | **Commit :** `de6864f` — 3 fichiers, +976/-1

Livrable principal : `docs/memory/audits/sprint-63-debordements-de.md` (462 l.), lisible seul.
Livrable exécutable : `frontend/e2e/sprint-63-de-overflow-audit.spec.ts` (495 l.).

## Résultat

**165 mesures**, image `mcr.microsoft.com/playwright:v1.61.1-jammy`, `--workers=1`, 22/22 vert.
Après correctif : **0 débordement partout** — 3 écrans × 4 locales × 12 largeurs.

| Écran | fr | en | es | de |
|---|---|---|---|---|
| timeline / event-form / settings / create-form | 0 | 0 | 0 | 0 |

**Un seul débordement réel trouvé, et corrigé** : `ui/footer-app.tsx`, en `de` uniquement — deux
liens de 367 px insécables, **+24 px à 320 px**, +4 px à 359/360, avec défilement horizontal réel
(`maxScrollX` 24/4). `fr`/`en`/`es` à 0. Correctif : `flex space-x-4` →
`flex flex-wrap justify-center gap-x-4 gap-y-1`. *Vérifié par le lead à `footer-app.tsx:35`.*
Contrôle négatif joué (ancien `className` remis → garde rouge ; correctif → verte).

**Changement visible** : en `de` sous ~384 px, les 2 liens du pied de page passent sur 2 lignes
centrées. Rien d'autre.

## L'échantillon a été choisi par le risque, pas par commodité

C'était la consigne issue de `ci-green-is-not-page-correct` (S53 : une vérification **verte** avait
raté 28 titres parce que l'échantillon était choisi par facilité). Largeurs retenues :
320 / **359** / **360** / 375 / 390 / 414 / **640** / **641** / 768 / **1023** / **1024** / 1280.

Les paires sont le cœur de la méthode :
- **359/360** — frontière `max-[360px]` découverte par #423 (Tailwind v4 compile `width < N`)
- **640/641** — **bascule `matchMedia` JS de la frise : deux arbres DOM distincts.** La grille de la
  spec existante y était aveugle. Trouvé par l'agent, pas hérité du plan.
- **1023/1024** — apparition de la sidebar

Le header n'a **pas** été re-mesuré à l'aveugle : les chiffres de #423 ont été repris.

## La découverte qui dépasse l'issue

**La création d'événement est injoignable sous 1024 px.**

*Vérifié indépendamment par le lead* : l'**unique** appelant de `setShowCreate(true)` dans tout le
dépôt est `AppShell.tsx:152`, situé dans un `<aside className="… hidden … lg:flex">`. Sous le
palier `lg`, l'aside n'est pas rendu — aucun autre déclencheur n'existe.

C'est **la même découverte que le 3ᵉ follow-up de #446** (« `NewEventDrawer` a une variante
`.mt-sheet` sans aucun déclencheur mobile »), trouvée **indépendamment par un second agent, par une
autre voie**. La variante feuille existe, elle est mesurée à 0 débordement — il manque seulement le
bouton pour l'atteindre.

Tracé en `RECOMMAND_FOLLOWUP` triage **M**, non corrigé : hors périmètre d'un audit de débordement.

## Troncature silencieuse

**Aucune** sur 164 mesures. 4 faux positifs `.sr-only` écartés. Deux cas **latents** tracés
(ellipsis sans `title`) : `Lane.tsx:32`, `SessionList.tsx:83,91` — non déclenchés aujourd'hui.

## Re-scopage : confirmé, avec deux nuances honnêtes

L'agent a **re-vérifié les 0 appelant** plutôt que de les prendre pour argent comptant. Confirmé.
Deux corrections apportées au relevé que j'avais transmis :

- **`.mt-btn` existe vraiment** comme classe (`core.css:16-39`) — ce que j'avais dit
  (« n'apparaît qu'en commentaire ») valait pour les `.tsx`, pas pour le CSS. Ma formulation était
  imprécise.
- **`.mt-tabs` *est* rendu** (`ui/tabs.tsx:61`) — c'est la variante `--collapsible` qui est inerte,
  pas la classe de base.

Le fond du re-scopage tient : les utilitaires visés par l'issue d'origine n'ont pas de prise.

## Sort des 7 sections inertes de `i18n.css` — documenté, non tranché

Conformément à la consigne. §6 de l'audit : l'option A (câbler) répondrait à un besoin **non
constaté** par les 165 mesures, et `.mt-seg` / `.mt-tabs--collapsible` sont des chantiers de
restructuration ; l'option B (supprimer) perdrait les arbitrages écrits en §7/§8 (notamment RTL).
C'est une décision produit, laissée au dev.

## Écarts au plan

1. **La recette docker `host.docker.internal` est inutilisable sur les écrans authentifiés** —
   403 CORS mesuré (le backend fige `localhost:3000`) contre 400 via forwarder. Les audits landing
   des sprints précédents ne rencontraient pas ce cas. Parade : forwarder TCP.
2. `event-drawer-edit` est **desktop-only** ; le chemin mobile est `timeline-event-more` →
   `timeline-actionsheet-edit`.
3. **Un « débordement » de 50-53 px du formulaire était sa propre fixture** : `unique()`
   (`support/products.ts:40`) produit un jeton de 16 chiffres insécable, rendu dans un `h1`.
   L'agent l'a démasqué par le bon signal — **le défaut n'était pas corrélé à la locale**. Il aurait
   pu « corriger » un bug inexistant, comme au S62.
4. Aucune création d'événement possible sous 1024 px (ci-dessus).

## Non vérifié — déclaré par l'agent

- **`jammy` ≠ `ubuntu-latest` GitHub** — limite de fond, commune à tout le sprint.
- **Aucune inspection visuelle** : que des nombres.
- **Portrait seul** — `TimelineMobileLandscape` non mesuré.
- **7 des 8 pages portant le footer non mesurées.**
- États dynamiques non couverts (messages d'erreur, `Select` ouvert).
- `next build` non lancé (`PIT-S62-009`).
- **La nouvelle spec n'est PAS dans la CI** — elle ne protégera rien tant qu'elle n'y entre pas.

## Signaux mémoire

- `[MEMORY:pitfall]` — recette docker jammy avec `host.docker.internal` : **403 CORS** sur tout
  écran authentifié (le backend fige `localhost:3000`). Parade : forwarder TCP
  `127.0.0.1:3000 → host.docker.internal:3000`. Invisible pour les audits de landing.
- `[MEMORY:pitfall]` — balayage `rect.right > clientWidth` : exclure les défileurs horizontaux
  légitimes (la frise produit 9-16 faux positifs par largeur) **mais surtout pas `<body>`** — le
  scroll-lock Radix y déclare tout le document comme « contenu » et masque l'élément fautif.
- `[MEMORY:pitfall]` — `unique()` (`support/products.ts:40`) produit un jeton de 16 chiffres
  **insécable** ; rendu dans un `h1`, il fabrique un faux débordement. Signal de reconnaissance :
  le défaut **n'est pas corrélé à la locale**.
- `[MEMORY:decision]` — spec conservée **armée** (`expectNoPageOverflow`), vue rouge par contrôle
  négatif : « un verrou qui ne peut pas rougir est un décor ».

## Recommandations suite

- `RECOMMAND_FOLLOWUP:` **création d'événement injoignable sous 1024 px** (`AppShell.tsx:152`).
  Le `NewEventDrawer` a sa variante feuille, mesurée à 0 débordement — il manque le déclencheur.
  [triage **M** | domaine design] — *converge avec le 3ᵉ follow-up de #446.*
- `RECOMMAND_FOLLOWUP:` `h1` du titre produit (`ProductDetailView.tsx:302`) sans `break-words` : un
  jeton insécable déborde, **dans toutes les locales**. [triage XS | design]
- `RECOMMAND_FOLLOWUP:` `title` manquant sur `Lane.tsx:32`, `SessionList.tsx:83,91`. [triage XS | design]
- `RECOMMAND_TEST_RUNNER:` faire entrer cette spec dans la CI e2e, **et** rejouer la suite complète
  (seuls `landing-*` et cette spec ont tourné).

Négations : pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` — diff CSS/spec/doc, 0 fichier de
locale touché, 0 couche backend.

## Environnement — énoncé comme fait horodaté, pas comme garantie

2026-08-31 12:42:53 : front `:3000` = 200, backend `:8086` = 401.
Relance depuis `frontend/` :
`NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8086 npx next dev -p 3000`
(webpack — `npm run dev` casse en worktree, `PIT-S61-007`).

*L'agent a appliqué la consigne issue de la correction de #442 : donner une commande de relance et
un fait daté, jamais une promesse d'état.*

STATUS: COMPLETED
