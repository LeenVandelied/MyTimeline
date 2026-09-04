## Sprint 74 — « Landing & focus polish »

Quatre finitions frontend XS, toutes `epic:design` / `priority:P3`, sur des fichiers
strictement disjoints. Aucune BR impactée, aucune migration, aucun changement backend.

Milestone : **Sprint 74** (#75). Vague unique, les 4 issues traitées en parallèle.

| Issue | Sujet | Commit |
|---|---|---|
| #342 | `<Link>` enveloppant `<DropdownMenuItem>` dans le sélecteur de langue | `3ebb8d6` + `0c26911` |
| #343 | Easing hors DS et import CSS chargé sur toutes les routes | `6365d26` |
| #384 | Double lévitation au survol des cartes Fonctionnalités (−18 px au lieu de −10) | `ecc76c2` |
| #417 | Contour de focus rogné dans `.mt-zoom` et le tablist des réglages | `0c40f9d` + `801dadd` |

---

## Trois énoncés sur quatre étaient faux ou périmés

C'est le fait marquant de ce sprint : les correctifs livrés ne sont pas ceux que les issues
prescrivaient. Chaque écart est justifié par un constat dans le code, pas par une préférence.

**#343 — l'issue s'auto-contredisait.** Elle demandait à la fois d'utiliser `--ease-quart` et
que l'animation reste inchangée. Or le token vaut `cubic-bezier(0.32, 0.72, 0, 1)` et non la
courbe Material `(0.4, 0, 0.2, 1)` qu'il remplace : **+0,54 de progression à 25 % de la
course**, la frise décélère nettement plus tôt. Arbitré avec le développeur en faveur du token
(cohérence du système de motion) ; **le geste de la frise change sur la landing**, c'est
assumé. L'issue visait par ailleurs `app/layout.tsx:5`, alors que ce layout est transparent
depuis #413 — l'import réel était dans `app/[locale]/layout.tsx`.

**#417 — l'énoncé nommait le mauvais composant, et sa piste technique était la mauvaise.** Le
« tablist des réglages » ne passe pas par `.mt-tab` du DS mais par des utilitaires Tailwind
bruts ; corriger le CSS nommé aurait touché les onglets **produits** en laissant le vrai défaut
en place. Et le motif de référence cité (`timeline.css:115`/`:131`) n'existe plus, il est
en `:180`/`:196`. Enfin la piste `outline-offset` négatif s'est révélée mauvaise pour les
contrôles de zoom (voir plus bas).

**#342 — le pattern cité n'était pas transposable.** L'issue prescrivait `<Button asChild>` par
analogie avec #295, mais l'élément est un `DropdownMenuItem` : un `Button` aurait détruit
`role="menuitem"`. Le pattern réellement livré par #295 est « le primitif prend `asChild` », ce
qui donne ici `<DropdownMenuItem asChild><Link/></DropdownMenuItem>`.

---

## #417 — pourquoi le remède a changé en cours de route

La piste de l'énoncé (`outline-offset:-2px`) a été implémentée puis **mesurée au navigateur**,
et elle réalisait le risque que l'issue énonçait elle-même :

- `.mt-zoom__btn` fait **30 × 16,5 px**, l'icône `<svg>` **14 × 14 px**
- un trait inset de 2 px ne laisse que **8,5 px** libres → le trait **croise l'icône** en haut,
  en bas et à gauche
- aucune valeur inset n'y échappe : `-1px` → 10,5 px, `0` → 12,5 px, toujours < 14 px.
  **Le problème est la hauteur du bouton, pas la valeur de l'offset.**

Remède retenu (`801dadd`) : retirer `overflow:hidden` de `.mt-zoom`, l'arrondi étant porté par
les boutons de bord. Le contour du DS (+2 px) peint alors dehors, sur ses 4 côtés, sans toucher
l'icône. **C'est exactement ce que #226 appliquait déjà en contexte `.mt-tlm`** : même cause (le
clip du groupe), même correctif, un seul motif dans le DS au lieu de deux.

Les deux zones de #417 n'ont donc pas le même remède, et c'est délibéré : le tablist des
réglages garde son `outline-offset:-2px` (pastilles `rounded-md` **sans bordure**, trait à 2 px
du bord et 10 px du libellé). L'objection du §8bis de `ds/a11y-audit.md` — « un offset négatif
poserait le trait SUR la bordure porteuse d'état » — tient pour `.mt-tab` et le `<tr>`, pas
pour ces pastilles. Arbitrage consigné au §8ter.

---

## Tests et vérifications

| Suite | Résultat |
|---|---|
| Unitaires frontend | **1187 / 1187**, 107 fichiers |
| `npm run build` (lint CI) | exit 0 |
| E2E Playwright | **257 passés**, 1 échec, 9 ignorés |

Backend non exécuté : aucun fichier backend dans le diff.

**Vérifications navigateur** (serveur webpack en worktree, focus armé au clavier réel, les deux
thèmes) — c'est ce qui a permis de retourner #417 :

- `.feature-card` au survol : `transform: matrix(1, 0, 0, 1, 0, -10)`, `translate: none`
  → **−10 px exactement**, le cumul à −18 px est supprimé
- `.hero-timeline*` : **5 sélecteurs + 2 keyframes** servis sur `/fr`, **0** sur `/fr/login` et
  `/fr/register` (chunks CSS réellement inspectés)
- contours de focus : **0 côté rogné sur 4**, desktop et mobile, dans les deux thèmes ;
  contrastes **4,95 à 6,48:1** (seuil WCAG 1.4.11 = 3:1)
- deux **contre-épreuves par mutation** : rétablir l'ancien offset positif sur le tablist
  reproduit bien le rognage sur 3 côtés ; remplir un bouton de zoom d'une couleur franche et
  l'agrandir 8× montre que le fond suit l'arrondi — le `overflow:hidden` retiré ne gardait
  rien qui ne soit couvert autrement

Détail complet : `docs/memory/audits/sprint-74-test-coverage.md`.

### L'échec E2E

`[chromium] sprint-62-select-focus-indicator.spec.ts:551` → `locator.evaluate: Test timeout of
30000ms exceeded`. Écarté du périmètre par faisceau : **3 des 4 variantes du même test
passent**, le diff ne touche aucun sélecteur de cet arbre, le symptôme est un timeout et non
une assertion de peinture, la CI de `dev` est verte, et le rejeu ciblé du fichier donne 25/25.

⚠ **Ce faisceau n'est pas une démonstration.** Le rejeu ciblé est vert *en isolation*, ce qui
retire la charge. Le contre-test décisif — rejouer ce spec sur `origin/dev` dans les mêmes
conditions — n'a pas été fait. La CI de cette PR tranchera.

---

## Ce qui n'est pas vérifié

- **#343 « animation inchangée visuellement »** : structurellement inatteignable, l'issue
  s'auto-contredit. Le geste change, c'est arbitré et documenté.
- **Fluidité de la transition de #384** : `transition-property: all` et `duration: 0.3s` sont
  bien calculés sur l'élément, mais le panneau navigateur rendait des lectures de transition
  instables — l'interpolation elle-même n'a pas été observée de façon fiable.
- **Palier responsive `-5px` sous 768 px** (#384) : règle présente et correctement conditionnée,
  non mesurée à ce viewport.
- **#417 en `:hover` simultané au focus** (le fond passe à `--color-surface-2`) et en
  `forced-colors: active`.

## Écarts de procédure

- **Aucun plan `/sprint plan` n'existait** : le milestone #75 et le label `sprint-74` avaient
  été créés côté GitHub, sans entrée `sprint-history.md` ni `architect-plans.md`. Les vagues
  ont été dérivées par recon directe du code, pas d'un rapport architect.
- **Le worktree de départ pointait sur `main`** (`d8b4f53`), branche divergente sans `docs/`,
  `.ai-env/`, `.claude/hooks/` ni `scripts/`. `sprint/74` a été recréée depuis `origin/dev`.

## Follow-ups proposés

- `dropdown-menu.tsx:26-30` — le pavé cite comme « cas vivant » une imbrication que #342 vient
  de supprimer. [XS | frontend/doc]
- `landing-mobile-menu.spec.ts:265-270` — commentaire d'ancrage décrivant une structure à deux
  nœuds. [XS | frontend/e2e]
- `.mt-tab` (onglets produits, `core.css:260`, `outline-offset:3px`) — non vérifié au
  navigateur, potentiellement rogné selon son conteneur ; son remède ne peut pas être l'offset
  négatif (recouvrement du soulignement d'accent). [XS | frontend/a11y]

Traite #342, #343, #384, #417 — fermeture manuelle au `/sprint end` (un `Closes #N` ne ferme
rien sur une PR dont la base est `dev`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
