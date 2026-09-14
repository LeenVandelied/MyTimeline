# Issue #594 — Frise : l'événement ponctuel rendu en pin + libellé (desktop et mobile)

**Vague :** 1 (en parallèle de #676) · **Agent :** fullstack-dev (opus, xhigh) · **Spawn ref :** `1c3f612`
**Périmètre :** élargi par arbitrage dev aux 3 frises (desktop, mobile portrait, mobile paysage).

## Commit (vérifié par le lead)
- `9b8cd6e` — :bug: fix(timeline): rendre l'événement ponctuel en pin + libellé sur les 3 frises (#594)
- `git show --stat` : 19 fichiers, +1105/−80. Aucun fichier de #676. `git branch --contains` = `sprint/91`.
- Dépôt principal non pollué ; harnais sain après la vague (`/api/auth/me` 401, `/fr/login` 200).
- Modifie 2 specs existantes (`sprint-85-timeline-group-head.spec.ts` +/−21, `timeline.spec.ts` +/−27) → justification auditée par le lead, voir § Audit du lead.

## Audit du lead — specs existantes modifiées (lu par `rtk proxy git diff 18c4176 9b8cd6e`)
- `sprint-85-timeline-group-head.spec.ts` : la géométrie ATTENDUE du trait de résumé est recalculée pour un ponctuel (pin centré : `x + 5 − 3`, largeur 6) au lieu de lire `style.width` — `widthPx` n'y est plus une durée. Le branchement se fait sur `data-event-kind` ; la branche durée est inchangée. **Justifié.**
- `timeline.spec.ts` (a) : le fixture de `timeline-event-outside-label` passe de `single` à `duration` 1 jour, commentaire à l'appui — le libellé de secours est un garde-fou de BARRE ; semé en `single`, le test ne testerait plus rien. **Justifié**, l'assertion n'est pas affaiblie.
- `timeline.spec.ts` (b) : `pillOffsetFromViewportLeft` rend la demi-largeur du pin pour un ponctuel ; la grandeur épinglée par #392/#451/#477 (le JOUR ancré) est inchangée. **Justifié.**
- Vérifié aussi : la prod n'a qu'une hauteur de lane fixe (`laneHeight`, `TimelineView.tsx:713`) — aucun empilage en rangées. Confirme la prémisse corrigée par l'agent.

## Résumé
- Ponctuel = pin 10 px centré sur la date + libellé à droite en `--color-ink`, sur les 3 frises ; durée = barre inchangée. Corps partagé `EventPin.tsx` (`EventPinContent`).
- BR-EVE-009 : le garde-fou contraste (`readableInside` / libellé extérieur) ne vaut plus que pour les barres ; un pin n'a jamais de libellé de secours.
- **Sémantique de `widthPx` (décision) :** `leftPx` = date ; `widthPx` = **emprise réservée**, pas la largeur peinte — ponctuel 100 px desktop / 90 px mobile, constant quel que soit le zoom ; durée inchangée. L'intervalle réel passe par `eventTrackExtent` (inclut le demi-pin à gauche), consommé par la virtualisation et `ensureVisible`.
- Cible 44 px portée par le bouton lui-même (44 px de haut, ≥ 44 px de large). En paysage la lane fait 34 px : le bouton déborde de 5 px de chaque côté, z-index 1.
- Résumé de catégorie repliée : un ponctuel y est un trait de 6 px centré sur sa date.
- Hook de test : attribut `data-event-kind`, aucun nouveau `data-testid`.
- **Prémisse fausse du briefing du lead :** `TimelineView.tsx:864` est `ensureVisible`, pas un empilage — la prod **n'empile pas** les événements en rangées.

## Rendu du pin par vue (pour #595)
- desktop `EventPill.tsx:94` · portrait `TimelineMobilePortrait.tsx:291` · paysage `TimelineMobileLandscape.tsx:299`
- résumé replié `TimelineView.tsx:389`
- CSS `.mt-tlv__evt--pin`, `.mt-evt-pin*`, `.mt-tlm__evt--pin` dans `frontend/src/styles/ds/components/timeline.css`

## Tests (déclarés par l'agent)
- Vitest `test-quiet.sh frontend-unit` : 134 fichiers / 1670 passés.
- `tsc` exit 0 ; `prettier --check` (19 fichiers) exit 0 ; `next lint --no-cache` exit 0.
- E2E, 13 specs de la liste (sans `timeline-mobile`) : 95 passés / 0 échec.
- E2E `sprint-91-event-pin` + `timeline-mobile` + `sprint-63-de-overflow-audit` : 39 passés / 1 échec — `sprint-63:397` (en · 12 largeurs), rejoué 2 fois : assertions vertes, la **purge post-test** prend un 500 backend (`duplicate key uq_categories_owner_name` sur `zz-purge`). Imputation au sprint NON tranchée → A/B sur la base à faire en Phase 6.
- Version finale de `sprint-91-event-pin` : 3/3.
- **Contrôle négatif (spec neuve rouge sur l'ancien code) : non joué.**
- `test-quiet.sh frontend` jamais lancé (correction du lead reçue en cours de route).

## Fichiers de contexte lus (déclaration de l'agent)
- `sprint-91/maquette-frise-instant-serie.md` en entier (§ 2 pin `x − 5` / libellé `x + 11`).
- `br-events.md` l.92 BR-EVE-009, l.16-17 types.
- `pit-frontend.md` : PIT-S46-001 l.1502, S63-014 l.629, S64-009 l.676, S85-004 l.1252, S61-003 l.483.
- `rules-jit/frontend.md` et `rules-jit/ux-patterns.md` en entier (§2 roving, §8).
- `playwright.config.ts` `assertWebServerEnv` l.52-79 ; `e2e-local-runbook.md` en entier.
- `sprint-85/maquette-vue-timeline.md` §C l.99-104 seulement.

## Écarts visuels connus (vs maquette)
- Pin mobile 28 px de haut (paysage 24 px), maquette mobile 24 px.
- Libellé plafonné à 240 px avec ellipse ; la maquette ne tronque pas.
- Pas de point de statut sur un pin.
- Archivé : pointillé posé sur le pin seul.
- **Pas d'empilage `layoutLane`** : un libellé de pin peut chevaucher l'événement suivant de la même lane.
- Barre de durée : plancher 6 px ; maquette 12 px desktop / 14 px mobile.
- Centrage du trait de résumé à 6 px : déduit, non lu dans le `.dc.html`.

## Signaux mémoire
- [MEMORY:pitfall] Lanes mobiles en `position:relative` : une cible absolue qui déborde est recouverte par la lane suivante, et la hitbox `::before` des barres mobiles est rognée par `overflow:hidden`. Parade : z-index sur le wrap. Prévention : mesurer une cible tactile avec `elementFromPoint`, pas `boundingBox`.
- [MEMORY:pitfall] Purge E2E : `GET /categories` ne voit pas `zz-purge`, le POST viole `uq_categories_owner_name` → 500 (cause exacte non vérifiée, catégorie archivée supposée).

## Recommandations suite
- RECOMMAND_FOLLOWUP : mobile — les événements des ~120 premiers px de la piste passent sous la colonne sticky (#392 n'a corrigé que le desktop).
- RECOMMAND_FOLLOWUP : `frontend/e2e/support/seed-cleanup.ts:208` — la recherche de la catégorie poubelle rate une catégorie existante (→ 500 à la purge).
- RECOMMAND_FOLLOWUP : empilage en rangées des événements qui se chevauchent dans une lane (`layoutLane` de la maquette), absent de la prod.
- Pas de RECOMMAND_DB_EXPERT car aucun schéma touché.
- Pas de RECOMMAND_SECURITY car aucune surface auth ou donnée personnelle touchée.
- Pas de RECOMMAND_TEST_RUNNER car le lead joue lui-même la suite complète en Phase 6.
- RECOMMAND_UI_DESIGN : écarts visuels ci-dessus à arbitrer en review de fin de sprint (pin mobile 28 px, troncature 240 px, plancher 6 px).

STATUS: COMPLETED
