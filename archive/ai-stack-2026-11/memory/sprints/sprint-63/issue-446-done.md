# Issue #446 — popover Radix invisible sous les drawers et les sheets

**Vague :** 1 (parallèle avec #447 et #442) | **Taille :** M | **Priorité :** P1
**Commit :** `507cb2d` — 6 fichiers, +352/-51

> **Artefact écrit par le lead**, pas par le subagent : celui-ci a signalé que ses instructions lui
> interdisent d'écrire un fichier de rapport. Les agents #442 et #447 en ont écrit un ;
> divergence de comportement à harmoniser côté skill si la clôture en dépend.

## Objectif

Rendre visible le menu déroulant du formulaire de création d'événement. Conflit de plans
d'empilement : `SelectContent` à `z-50` (`--z-popover`) sous `.mt-drawer` / `.mt-sheet` à
`--z-modal` (70), le drawer étant rendu **en ligne** par `AppShell.tsx:259` — son `z` l'emporte quel
que soit l'ordre du DOM.

## Correctif

Nouveau palier partagé **`--z-popover-over-modal: 75`** dans `spacing.css`, appliqué aux 3 overlays
Radix **portalisés dans `body`** : `ui/select.tsx`, `ui/popover.tsx`, `ui/dropdown-menu.tsx` (×2).
`--z-popover` (50) reste inchangé pour les popovers **en flux**, qui doivent rester sous les
modales.

`docs/adr/ADR-008-echelle-z-popover-modale.md` écrit (173 l., 5 alternatives rejetées) — vérifié
présent par le lead.

## L'écart qui compte : le périmètre de l'issue était incomplet

L'issue affirme « **un seul des 6 consommateurs de `ui/select` est affecté** ». C'est vrai **pour
`ui/select` seulement**, et c'est trompeur : `PopoverPicker` (`ui/popoverPicker.tsx` →
`ui/popover.tsx`) est rendu par `EventEditForm`, monté par `NewEventDrawer.tsx:236` — **cassé par le
même mécanisme, dans le même panneau**. Preuve au pixel : `#ffffff` 46–66 % en clair, `#131519`
45–65 % en sombre.

Corriger le seul `Select` aurait laissé le champ voisin invisible, dans le formulaire qu'on
prétendait réparer.

Cause racine du trou : le `test.fail()` posé au S62 comme marqueur exécutable ne marquait **qu'un
widget**, alors que le défaut est celui d'un **palier partagé**.

## Mesures (sonde de pixel, jamais `elementsFromPoint`)

| | Avant | Après |
|---|---|---|
| Fond du popover, clair | `#ffffff` (panneau du drawer) | `#f3f4f6` |
| Fond du popover, sombre | `#131519` (panneau du drawer) | `#1b1e24` |
| Contraste du contour | — | **5,53:1** clair / **5,92:1** sombre |
| Unanimité des offsets | — | 100 % |

**Contrôle négatif** (16 mesures, hors suite) : palier forcé à 50 en cours de page via
`documentElement.style.setProperty` → le défaut revient **intégralement** sur 2 widgets × 2 surfaces
× 2 thèmes. La garde est donc armée (`PIT-S62-003`).

## Les 2 `test.fail()` — retirés, pas contournés

Remplacés par 2 tests réels **par thème** : desktop `.mt-drawer` + mobile `.mt-sheet`, avec un
oracle de classe qui **refuse le vert si `useMediaQuery` n'a pas basculé** — donc qui ne peut pas
passer par accident sur le mauvais chemin CSS.

*Vérifié par le lead* : `git grep "test\.fail"` rend 3 occurrences dans ce fichier, **toutes en
commentaire** (l.55, 500, 516). Aucune annotation active ne subsiste.

## Tests — exit codes lus

- Chromium complet : **203 passed / 8 skipped / 0 failed**, exit 0
- Spec ciblée chromium + firefox : exit 0
- `vitest` **988/988** ; `tsc` 0 erreur ; `eslint` 0

Un échec unique au 1er run (`timeline-screen` absent, 5 s) = compilation à froid de la route sous
`next dev` ; rejoué isolé → **9 passed**, exit 0. Ligne pré-existante, non touchée.

Environnement : front `:3000` (worktree), backend e2e docker `:8086` (profil `dev,e2e`, CORS :3000).
`:3100` appartient au worktree `sprint-plan-5` — écarté (`PIT-S60-008`).

## Autres écarts déclarés

- **`.mt-actionsheet` hors risque démontré, pas supposé** : `TimelineActionSheet.tsx` en est
  l'unique porteur et n'importe **aucun** overlay Radix. Le critère d'acceptation « statués : soit
  corrigés, soit démontrés hors risque » est donc tenu par la démonstration.
- **`ui/dropdown-menu` aligné sans défaut mesuré** : son seul consommateur (`language-selector`) vit
  dans des panneaux `z-50` où le portail gagnait déjà **par ordre du DOM** — « chance, pas
  invariant ». L'agent l'écrit tel quel dans le code.
- **Ordre du plan non respecté, et signalé** : le mini-plan demandait de reproduire au pixel **avant**
  modification ; l'agent a mesuré **après**, par forçage runtime du token à 50. Équivalent en
  pouvoir de preuve, mais ce n'est pas ce qui était demandé.
- **`--z-toast` (60) est un token mort** : 0 consommateur, `react-hot-toast` pose `zIndex:9999` en
  ligne (vérifié dans son `dist`). Aucune régression toast possible.

## Non vérifié — déclaré par l'agent

- `next build` **non lancé** : il réécrit `frontend/.next`, partagé, et aurait tué le `next dev` des
  agents voisins (`PIT-S62-009`). **Le lint bloquant de `next build` n'a donc pas été exercé** —
  `eslint` ciblé l'a été.
- Firefox : seulement la spec ciblée (c'est le `testMatch` du projet). WebKit hors harnais.
- **Aucun test rejouable ne verrouille** : la valeur du token, le `Popover` du picker, le
  `DropdownMenu`, ni `.mt-actionsheet`. Vérifiés au navigateur ce sprint, **pas en CI**.
- CI non jouée.

## Signaux mémoire

- `[MEMORY:bug]` — popover Radix invisible dans un drawer non portalisé. Cause : `z-50` du template
  shadcn sous `--z-modal` (70) d'un panneau rendu en ligne. Règle générale : **tout overlay
  portalisé dans `body` doit vivre au-dessus du palier modal** ; à `z` égal il ne « marche » que par
  l'ordre du DOM, ce qui n'est pas un invariant.
- `[MEMORY:decision]` — `ADR-008` : deux natures de popover dans l'échelle `z` du DS (en flux 50 /
  portalisé 75). Rejeté : remonter `--z-popover` (casse 3 popovers en flux devant rester sous les
  modales) ; portaliser le drawer (déplace le défaut vers le focus-trap et les animations).
- `[MEMORY:pattern]` — prouver un correctif de superposition par **contrôle négatif runtime** :
  forcer le token à son ancienne valeur en cours de page et re-mesurer. Coût nul, pas de commit
  intermédiaire, pas de fixture supprimée (anti-`PIT-S62-003`).
- `[MEMORY:pitfall]` — un `test.fail()` laissé comme marqueur exécutable de dette rend le périmètre
  de l'issue suivante **incomplet par construction** : il ne marque qu'un widget alors que le défaut
  est celui d'un palier partagé. Grepper les **frères du composant** (`ui/popover`,
  `ui/dropdown-menu`) avant d'accepter le périmètre d'une issue de superposition.

## Recommandations suite

- `RECOMMAND_FOLLOWUP:` `ui/dialog.tsx` porte encore `z-50` alors que c'est une **surface modale** —
  sa place est `--z-modal` (70). Non corrigé ici : le remonter inverserait le rapport
  `Select`/`Dialog` dont dépendent `ProductDrawer` et `DeleteConfirmDialog`, donc exige une mesure
  dédiée. [triage S | domaine design]
- `RECOMMAND_FOLLOWUP:` `--z-toast` (60) token mort — le brancher ou le supprimer. [triage XS | design]
- `RECOMMAND_FOLLOWUP:` `NewEventDrawer` a une variante `.mt-sheet` **sans aucun déclencheur
  mobile** (`shell-sidebar-new-event-button` est `lg:flex`) : atteignable seulement par
  redimensionnement. [triage S | design]

Négations explicites : pas de `RECOMMAND_TEST_RUNNER` (suites exécutées, exit codes lus), pas de
`RECOMMAND_SECURITY` ni `RECOMMAND_DB_EXPERT` (périmètre CSS + E2E, zéro endpoint, zéro BR, zéro
schéma), pas de `RECOMMAND_UI_DESIGN` (aucune surface visuelle nouvelle, seule l'échelle `z` bouge).

STATUS: COMPLETED
