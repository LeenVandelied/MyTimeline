# Revue `reviewer` batch — Sprint 86

> Spawnée par le lead le 2026-09-12 sur `d786219...HEAD -- frontend` (16 fichiers, +1097/−371).
> Décompte brut de l'agent : **0 CRITIQUE / 1 MAJEUR / 1 MINEUR**.

## [MAJEUR] `EventFormDrawer.tsx` — perte du verrou de scroll et de l'inertage du fond en ÉDITION
**Constat de l'agent.** Le `Dialog` Radix que #618 a remplacé en édition appliquait `RemoveScroll` (page figée) et
`hideOthers` (`aria-hidden` sur le reste du document). La coque maison `EventFormDrawer` (portail `createPortal`) ne fait ni
l'un ni l'autre. Côté création, aucun verrou n'a jamais existé : pas de régression là.

**Vérification du lead.**
- Confirmé : aucun `RemoveScroll`, `hideOthers`, `inert` ni `overflow:hidden` sur `body` dans `EventFormDrawer.tsx` ;
  aucune autre implémentation de verrou de scroll dans `frontend/src` (seul Radix en fournissait).
- Atténuation partielle déjà présente : le panneau porte `role="dialog"` + `aria-modal="true"` (l.144-145), que les lecteurs
  d'écran récents honorent ; le focus est piégé par `useFocusTrap`. Le défaut réel restant : défilement de la page sous le
  scrim, et fond non inerte pour les technologies qui ignorent `aria-modal`.
- Le rapport de #618 l'avait déclaré (« plus de verrou de scroll de page, comme la création ») ; le briefing du lead
  demandait des surfaces identiques sans exiger de conserver ce comportement → trou du briefing, pas faute de l'agent.
- **Verdict : MAJEUR retenu** (régression d'un comportement modal acquis). Correction dispatchée APRÈS la suite E2E du lead
  (pour ne pas modifier des sources sous `next dev` pendant le run), appliquée aux DEUX modes.

## [MINEUR] `useFocusTrap.ts:41` — garde `e.defaultPrevented` appliquée à tous les consommateurs
**Vérification du lead** (13 consommateurs listés par `grep -rln useFocusTrap frontend/src`). Seuls deux contiennent un
composant Radix imbriqué susceptible de `preventDefault()` sur Échap : `landing/LandingMobileMenu.tsx:157` et
`dashboard/MobileDrawer.tsx:84` (`LanguageSelector`). Avec la garde, Échap sur le sélecteur ouvert ne ferme QUE le sélecteur
— c'est le comportement attendu (avant : sélecteur ET menu fermés d'un coup). Aucun consommateur ne dépend d'un Échap qui
traverse un enfant l'ayant déjà consommé.
**Verdict : sans correction** (amélioration, pas régression).

## [OK] rendus par l'agent
BR-EVE-002/012/017, DEC-S86-001, DEC-S85-006, i18n 4 locales (`products.eventCategory`, `recurrenceCappedHint` cohérent
avec `RecurrenceExpansionServiceImpl`, horizon 5 ans), a11y `EventCategoryField`, garde Échap vérifiée contre la source Radix
(écoute en capture), tokens CSS et propriétés logiques, tests unitaires et E2E alignés sur le seuil 640 → lg, testids couverts.

## Signal mémoire
`[MEMORY:pattern]` Remplacer un `Dialog` Radix par un portail maison : inventorier d'abord ses acquis implicites
(`RemoveScroll`, `hideOthers`, restauration du focus) et les reporter explicitement.
