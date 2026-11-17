# Sprint 87 — revues `reviewer` (spawnées par le lead)

## Cycle 1 — diff complet du sprint (`af01bb9`, `0a04df6`, `02a1b45`)

**VERDICT : 0 CRITIQUE / 1 MAJEUR / 1 MINEUR**

- **[MAJEUR]** `frontend/e2e/landing-mobile-overflow.spec.ts` (bornage ajouté par #611) — le bord droit visible
  était borné par CHAQUE ancêtre DOM `overflow-x ≠ visible`, sans tenir compte de la chaîne des blocs conteneurs :
  un `position:fixed` (ou `absolute`) qui échappe au rognage mais déborde réellement l'écran aurait été ignoré.
  Faux vert possible sur le garde-fou même que le sprint avait assoupli. → **corrigé (C1, `571375d`)**.
- **[MINEUR]** `frontend/src/styles/__tests__/base-layer.test.ts:357` — le commentaire d'historique du garde-fou
  #340 cite encore `TimelinePreviewSection` (supprimé au sprint). Référence historique exacte ; **accepté sans
  correction**.
- **[OK]** retrait #641 (0 référence orpheline, parité i18n 4 locales vérifiée par script), hero #610 (planchers px
  seulement en `lg:`, `min-w-0`, filet sans ombre #574), frise #611 (`aria-hidden`, 0 élément focusable, `transform`
  seul, `will-change` sur 1 élément, ~110 nœuds, feuille sur la seule route landing), 0 hex en dur, contrôle négatif
  #340 toujours armé.

Hors revue, trouvé par le lead en Phase 6 (même cycle de corrections, **C2**, `6481397`) : la référence visuelle
`landing-hero` n'était pas déterministe (régénérée puis recomparée 1 min plus tard dans l'image noble : 2382 px,
ratio 0.01, uniquement le texte de la piste animée décalé d'~1 px).

## Cycle 2 — commits de correction (`571375d`, `6481397`)

**VERDICT : 0 CRITIQUE / 0 MAJEUR / 2 MINEUR — MAJEUR du cycle 1 : RÉSOLU**

- **[MAJEUR cycle 1] RÉSOLU** — `containingBlockOf` suit la chaîne des blocs conteneurs (ancêtre positionné pour
  `absolute`, créateurs `transform`/`filter`/`contain`/`will-change`/`container-type`/`content-visibility` pour
  `fixed`), sticky/relative en flux normal ; sondes 3-5 vérifiées par mutation (l'ancienne remontée DOM rend `[]`).
  La règle `absolute` de l'agent contredit le briefing du lead : **c'est l'agent qui a raison** (un rogneur non
  positionné situé entre l'élément et son bloc conteneur ne le rogne pas).
- **[MINEUR]** `landing-mobile-overflow.spec.ts:126` — `(s.backdropFilter ?? 'none')` ne rattrape pas une chaîne
  vide (navigateur sans support) → faux bloc conteneur possible ; sans effet sous Chromium. Fix : `|| 'none'`.
  → follow-up.
- **[MINEUR]** `landing-mobile-overflow.spec.ts:181-187` — la remontée s'arrête avant `<html>` : un `overflow-x:hidden`
  posé sur `<html>` ne borne jamais → seul risque = faux positif, jamais faux vert ; mérite une phrase de commentaire.
  → follow-up.
- **[OK]** gel C2 : `FROZEN_MOTION_CSS` injectée dans `prepare()` après la feuille de production, attente par
  `expect.poll` sur la condition (pas de `waitForTimeout`), garde `toHaveCount(1)` sur la piste, contrôle négatif
  d'armement passé par le même `prepare()` donc toujours capable de rougir ; sondes retirées du DOM après mesure.

Pas de 3e cycle (plafond du skill : 1 re-review) — les 2 MINEURS partent en follow-ups.
