=====ISSUE #578
[BUG] Nav active : le précédent interne a remplacé la maquette (cause racine)
---
## Contexte

Les maquettes montrent l'état de navigation actif comme une **pilule graphite pleine à texte blanc**, avec le libellé en mono capitales espacées. Le produit rend une **pilule bleu pâle à texte bleu** (`bg-accent-soft text-accent`), libellé en sentence case.

L'origine est traçable, et c'est ce qui rend cette issue différente des trois autres motifs :

- Le motif naît dans `frontend/src/components/settings/SettingsShell.tsx:93`, introduit le **5 juillet 2026** par le commit `43d9e14` (#86, « Réglages desktop 4 chapitres »). Rien dans ce commit ne le rattache à une maquette.
- `AppShell.tsx:222-224` l'a ensuite recopié, et le **documente explicitement** en commentaire (`AppShell.tsx:91-93`) : la classe est *« calquée sur `SettingsShell` »*. La maquette n'est pas mentionnée.

Autrement dit : un écran s'est aligné sur son voisin interne plutôt que sur la référence, puis le suivant a hérité de l'écart. C'est le mécanisme qui explique une bonne part des autres constats de l'audit — et il continuera de produire de la dérive tant qu'il n'est pas nommé.

Deux faits aggravants relevés au même endroit :
- Le CTA « Nouvel événement » de la sidebar est en `bg-primary` (graphite) là où la maquette le veut en bleu accent — les deux couleurs sont exactement **inverties** par rapport à la maquette (`AppShell.tsx:190-200`, commentaire `:93`).
- Le projet de maquettes Claude Design n'a pas été modifié depuis le **24 juin 2026**, soit une vingtaine de sprints : la référence a cessé d'être consultée *et* d'être mise à jour.

## À faire

1. Aligner l'état actif de la navigation sur la maquette : pilule graphite pleine, texte `--color-primary-ink`, dans `AppShell` **et** dans `SettingsShell` (corriger la source, pas seulement la copie).
2. Rétablir le bleu accent sur le CTA « Nouvel événement » de la sidebar.
3. Trancher le libellé de navigation : mono capitales espacées (maquette) ou sentence case (produit actuel) — voir Dépendances, ce point interagit avec #575.

## BR impactées

Aucune.

## Critères d'acceptation

- [ ] `SettingsShell.tsx:93` et `AppShell.tsx:222-224` partagent le même état actif, conforme à la maquette
- [ ] Le commentaire `AppShell.tsx:91-93` est mis à jour : il ne doit plus désigner `SettingsShell` comme référence
- [ ] Le CTA sidebar est en bleu accent
- [ ] Contraste AA vérifié sur la pilule graphite dans les deux thèmes (elle s'inverse en sombre : `--color-primary` passe à `#ECEDEF`)

## Piste technique

- `frontend/src/components/layout/AppShell.tsx:190-200,222-224` et son commentaire `:91-93`
- `frontend/src/components/settings/SettingsShell.tsx:93` (la source du motif)
- Tokens : `--color-primary` / `--color-primary-ink` (`frontend/src/styles/ds/tokens/colors.css`)

## Dépendances

- **#575** (titre avalé par l'eyebrow) touche la même question de casse et de police pour les libellés — traiter les deux ensemble évite deux arbitrages contradictoires.
- Le point 3 (casse des libellés de navigation) demande une décision, pas seulement un correctif.

## Risques techniques

Faible techniquement. Le vrai risque est de ne corriger que `AppShell` en laissant `SettingsShell` intact : la source du motif resterait en place et pourrait réessaimer au prochain écran.

## Estimation

S — deux fichiers, mais une décision de casse à trancher au préalable.

## Origine

Audit de conformité maquettes ↔ production du 7 septembre 2026 (motif transversal 4/4). Ce motif est la **cause racine** identifiée par l'audit, les trois autres en étant en partie des symptômes.

Piste de fond, hors périmètre de cette issue : rien dans le processus actuel n'oblige à confronter un nouvel écran à sa maquette. Une entrée de mémoire projet ou une étape de revue pointant le handoff (`design_handoff_mytimeline/README.md` du projet Claude Design `e8ce9db5-cc08-42a5-8585-76e13a43f2f8`) éviterait la reproduction du motif.

