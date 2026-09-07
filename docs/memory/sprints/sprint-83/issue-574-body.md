=====ISSUE #574
[CHORE] Ombre au repos contre filet 1px : 8 surfaces hors charte sur 3 écrans
---
## Contexte

La charte de design réserve les ombres `shadow-md`/`shadow-lg` aux popovers et aux modales, et impose un filet 1 px sur les surfaces au repos. Le commentaire du token le formule sans ambiguïté (`frontend/src/styles/ds/tokens/spacing.css:3-4,31`) : *« Subtle shadows — the system prefers hairline rules to elevation »*, *« elevation — used sparingly; rules come first »*.

L'audit de conformité aux maquettes Claude Design (7 septembre 2026) a relevé **8 surfaces au repos qui portent `shadow-lg`** sur 3 écrans distincts. Ce n'est donc plus un défaut local comme #505, mais un motif systémique.

Cas particulier à noter : sur `FeaturesSection.tsx:65`, la carte porte `shadow-lg` au repos **et** `hover:shadow-md` — l'ombre *diminue* au survol, l'effet d'élévation est inversé.

## À faire

Remplacer `shadow-lg` par le traitement conforme (filet `border border-rule` + `shadow-xs`/`shadow-sm` si une élévation reste nécessaire) sur les 8 sites listés. Corriger au passage l'inversion de survol de `FeaturesSection`.

Écrans concernés :
- **Landing** — `FeaturesSection.tsx:65`, `TestimonialCard.tsx:42`, `HeroSection.tsx:113`
- **Auth** — `login/page.tsx:68` et les 3 équivalents (`register`, `forgot-password`, `reset-password`), qui portent `shadow-lg` **sans aucune bordure**
- **Pages légales** — `terms/page.tsx:70`, `privacy/page.tsx:95` (ces deux-là ont déjà un `border-rule` : l'ombre est en plus, pas à la place)

Bonus sur le même périmètre : les pages légales portent aussi `rounded-xl` (14 px), au-delà du plafond de 10 px pour une carte (`frontend/src/styles/ds/readme.md:72`).

## BR impactées

Aucune (conformité à la charte de design, pas de règle métier).

## Critères d'acceptation

- [ ] Aucune des 8 surfaces listées ne porte `shadow-lg` au repos
- [ ] Les 4 cartes Auth portent un filet 1 px
- [ ] `FeaturesSection` n'a plus d'ombre qui décroît au survol
- [ ] `rounded-xl` des pages légales ramené à `rounded-lg` (10 px)
- [ ] Rendu vérifié en clair **et** en sombre (les ombres du thème sombre sont bien plus opaques : `rgba(0,0,0,.65)` pour `shadow-lg`)

## Piste technique

- Charte : `frontend/src/styles/ds/readme.md:106-107` ; tokens : `frontend/src/styles/ds/tokens/spacing.css:31-35`
- Correctif de référence : celui appliqué au Sprint 71 sur `TimelineEditHost` (`shadow-md` → `border-b border-rule`)
- ⚠️ `frontend/src/components/settings/` est **indemne** de ce motif : s'en servir comme référence de ce à quoi doit ressembler le résultat.

## Dépendances

Aucune. Recouvre partiellement #505 (même motif, autre fichier) — vérifier avant de fermer si #505 devient redondante.

## Risques techniques

Faible. Purement CSS, aucun changement de structure. Le seul point de vigilance est la perception de profondeur des cartes Auth, qui n'ont aujourd'hui aucune bordure : vérifier qu'elles restent distinctes du fond en thème clair (`--color-bg` #FCFCFD vs `--color-surface` #FFFFFF, différence très faible).

## Estimation

S — 8 remplacements de classes, mais répartis sur 3 écrans et à revérifier en 2 thèmes.

## Origine

Audit de conformité maquettes ↔ production du 7 septembre 2026 (motif transversal 1/4), par confrontation du code au handoff écrit du projet Claude Design « Refonte graphique MyTimeline ».

