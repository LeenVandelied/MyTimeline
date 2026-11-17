# Sprint 42 — BLOCKER : la prémisse du sprint est cassée

> Découvert en Vague 2 (#232), vérifié indépendamment (Explore, 3 claims CONFIRMED). 2026-07-13.

## Constat
Le flux que #231/#232 devaient améliorer **n'existe pas de bout en bout** dans l'app routée.

### Gap A — Surface d'édition orpheline (régression probable S17)
- `EventContent` (seul appelant de `updateEvent`, `EventContent.tsx:117`) ← `EventBar` ← `Lane` ←
  barrel `components/timeline/index.ts`. **Aucune `page.tsx` ne rend `Lane`/`EventBar`/`EventContent`.**
- `TimelineCalendar` : **0 importeur**.
- Pages routées (`dashboard`, `products/[productId]`) rendent `TimelineResponsive` → `TimelineView` +
  `EventDrawer` = **LECTURE SEULE** (pas de form, pas de bouton éditer). `timeline/page.tsx` = placeholder.
- `TimelineActionSheet` a un `onEdit` threadé jusqu'à `TimelineResponsive` mais **aucune page ne passe
  `onEditEvent`** → no-op (commentaire du composant le confirme : câblage édition = suivi).

### Gap B — Le 409 optimistic-lock n'est pas déclenchable via l'UI
- `updateEvent` (`eventService.ts:31`) envoie `EventEditFormValues` = **pas de `version`**.
- `EventUpdateRequest` (backend) = **pas de champ `version`**.
- `EventRepositoryJpaImpl.save` (l.69-76) recharge l'entité managée fraîche (`findById`),
  `copyMutableFields` (l.84-98) **ne touche jamais `@Version`** → Hibernate émet toujours
  `UPDATE ... WHERE version = <courant>` = match → jamais de conflit. Un PATCH séquentiel normal ne PEUT
  PAS lever l'OptimisticLock. Seul un vrai race 2-transactions le pourrait.
- L'intégration test force le lock artificiellement (`em.detach` v0 → `em.merge` → `em.flush`), chemin
  qu'aucune requête API n'exerce.

## Conséquence
- **#231** (corps 409 enrichi + modale comparative) = code correct mais **latent/mort** : ni l'edit form
  ni le 409 ne sont atteignables. Pas un bug de #231 — l'issue reposait sur une fausse prémisse.
- **#232** (E2E) = specs écrites, **`test.fixme` (skippées)** — ne peuvent pas s'exécuter tant que A+B
  ne sont pas levés. Le dev a refusé de simuler un vert.
- **GATE skill** : BR-EVE-015 (P1 cross-system) sans E2E métier fonctionnel → Phase 7 bloquée.

## Ce qu'il faudrait pour rendre la feature réelle (non prévu au plan S42)
- (A) Monter la surface d'édition dans une timeline routée (câbler `onEditEvent` + ouvrir `EventEditForm`).
  Ampleur : moyenne-à-grande (régression S17, choix UX drawer/modal). Le plumbing `onEdit` existe déjà partiel.
- (B) Threader `version` : `EventEditFormValues`/`eventEditSchema` → `updateEvent` → `EventUpdateRequest`
  → appliquer la version cliente à l'entité managée avant flush (sinon lock jamais déclenché). Ampleur : S/M.

## Statut
Branche `sprint/42` : 2 commits (0bc144f #231, fcbf64e #232), rien mergé, tree propre.
**Décision utilisateur requise** avant tout merge/PR (ne pas merger du code mort en présentant une feature).
