# Traitement des signaux `RECOMMAND_*` — Sprint 74

> Écrit par le lead après la vague. Répond aux signaux remontés dans les `issue-*-done.md`,
> que `check-sprint-completeness.sh 74` listait comme non traités.

## `RECOMMAND_UI_DESIGN` — 4 signaux

### #384 — négation, pas un signal

Le fullstack-dev a écrit « RECOMMAND_UI_DESIGN : **non** » : aucune valeur visuelle n'est
changée par rapport à l'intention de l'issue (−10 px était déjà la cible). Le hook le compte
comme actionnable parce qu'il cherche le motif `Pas de RECOMMAND_X car …` — c'est un faux
positif de forme, pas un signal ouvert.

### #343 — arbitré par le développeur, pas par un specialist

L'écart de courbe (`--ease-quart` = `cubic-bezier(0.32, 0.72, 0, 1)` contre la Material
`(0.4, 0, 0.2, 1)`, +0,54 de progression à 25 % de la course) a été **porté au développeur avec
les chiffres**, qui a tranché en faveur du token pour la cohérence du système de motion. Le
geste de la frise change sur la landing : c'est un choix, pas un oubli. Alternative écartée :
ajouter un `--ease-standard` au DS (élargit le DS hors du périmètre XS de l'issue).

### #417 — devenu sans objet

Le signal portait sur l'arbitrage `-2px` vs `-1px` du contour sur un bouton de 30 px. La mesure
au navigateur a montré qu'**aucune valeur inset ne convient** (icône de 14 px dans un bouton de
16,5 px) et le remède a changé : déclippage du groupe, contour du DS à +2 px à l'extérieur. La
question posée n'existe plus. Le nouveau remède est vérifié desktop + mobile, deux thèmes,
0 côté rogné, contrastes 6,08 / 6,48:1.

### #342 — spawn `ui-design` (le seul vrai signal restant)

**Verdict : APPROUVÉ SOUS RÉSERVE.** Aucun risque structurel identifié par lecture :

- l'encre est posée en **utilitaire** (`text-accent-ink` actif / `text-popover-foreground`
  hérité), donc indépendante du nœud porteur — la conversion `asChild` ne la déplace pas hors
  de la cascade (`language-selector.tsx:176-187`) ;
- la règle `a { color: var(--color-accent) }` est layerisée `@layer base`
  (`ds/tokens/base.css:126-127`) et les utilitaires vivent dans `@layer utilities`, posé après
  → **elle ne peut pas repeindre l'ancre en accent** (`ds/styles.css:6-13`) ;
- `DropdownMenuItem` pose `focus:bg-accent-soft` via la pseudo-classe `focus:`, pas via
  `data-[highlighted]` : Radix appelle `.focus()` sur le ref forwardé par `Slot`, donc sur
  l'`<a>` fusionné — le sélecteur suit le nœud qui reçoit réellement le focus DOM, pas de
  régression (`dropdown-menu.tsx:136-157`) ;
- la cible tactile 44×44 est posée sur le `<Button>` **déclencheur**, nœud distinct de l'item
  converti — non affectée (`language-selector.tsx:169`) ;
- `DEC-S58-001` respecté : aucun `ring-*`, `outline-none` ni `outline-hidden` vivant.

**La réserve est levée.** `ui-design` la fondait sur « la spec E2E est écrite mais pas
exécutée » — c'est inexact. `e2e/landing-mobile-menu.spec.ts:293` (« sélecteur de langue : la
locale active reste lisible (repos, survol, souris+clavier) ») a tourné **dans les deux
thèmes** :

- run local du lead : positions 89/267 (light) et 91/267 (dark), **pas dans les échecs** ;
- CI de la PR #523 : job `e2e` **vert** (8 min 47).

Cette spec assert le contour `:focus-visible` (style ≠ `none`, épaisseur 2 px) et les couples de
contraste des états repos / survol / souris+clavier. Les 3 états visés par le signal sont donc
couverts par une exécution réelle, pas par une lecture.

## `RECOMMAND_TEST_RUNNER` — 2 signaux

### #342 — traité

Le signal demandait de rejouer `landing-mobile-menu.spec.ts` après la correction des 2 locators.
Fait deux fois : run local complet (**257 passés**, spec incluse) et job `e2e` de la CI (vert).
Aucun subagent `test-runner` n'a été spawné — le lead a exécuté la suite lui-même, conformément
à la note mémoire qui déconseille cette délégation sur ce dépôt (4 faux « E2E impossible »
rendus par des `test-runner` successifs, dont un au S73).

### #384 — négation

« RECOMMAND_TEST_RUNNER : **non** » — même faux positif de forme que ci-dessus.

## `RECOMMAND_SECURITY` — 1 signal

### #384 — négation

« RECOMMAND_SECURITY : **non**. Aucune donnée, aucun endpoint, aucun état d'auth touché — 1
attribut `className` et des commentaires CSS. » Vérifiable sur le diff : le sprint ne touche
aucun fichier backend, aucun service, aucun schéma. Le job `security` de la CI est `pass`, le
`secret-scan` aussi.

## Ce qui reste ouvert après ce traitement

- La **fluidité** de la transition de #384 (interpolation non observée de façon fiable).
- Le **palier responsive `-5px` sous 768 px** de #384 (règle présente, non mesurée à ce
  viewport).
- #417 en **`:hover` simultané au focus** et en **`forced-colors: active`**.

Aucun de ces points n'est un défaut constaté : ce sont des vérifications non faites, listées
pour ne pas être confondues avec des vérifications réussies.
