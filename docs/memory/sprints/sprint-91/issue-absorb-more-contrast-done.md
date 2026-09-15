# Absorption tardive — `⋯` des barres mobiles illisible en sombre (follow-up 1/7 du triage S91)

**Origine :** sonde visuelle du lead (`review-batch.md`) — défaut préexistant mesuré à 1,07:1 ; absorbé avant merge sur décision du dev au triage `/sprint end 91`.
**Agent :** fullstack-dev (opus, high) · **Spawn ref :** `afb4368`

## Commit (vérifié par le lead : voir sortie `git show --stat 48725a8`)
- `48725a8` — contraste du `⋯` mobile. Fichiers déclarés : `frontend/src/styles/ds/components/timeline.css`, `TimelineMobilePortrait.tsx`, `TimelineMobileLandscape.tsx`, leurs deux `.test.tsx`, `frontend/e2e/sprint-91-more-contrast.spec.ts` (neuve). Aucun fichier `docs/` ni `.ai-env/`.

## Résumé
- Une seule règle DS : `.mt-tlm__evt-more{color:var(--color-ink)}` pour TOUS les `⋯` mobiles. Retirés : `style={pin ? undefined : { color: ink }}` dans les deux vues, et la règle `.mt-tlm__evt--pin + .mt-tlm__evt-more` devenue redondante (rendu du pin inchangé). Commentaire FR dans le CSS et les deux TSX.
- `--color-ink-muted` écarté : ≥ 3:1 (~6,1 clair / ~5,9 sombre) mais aurait changé le `⋯` du pin.
- **Contraste mesuré (rendu réel)** : clair `#16181d` sur `#ffffff` = **17,76:1** ; sombre `#ecedef` sur `#131519` = **15,60:1** — identique portrait/paysage, derrière une barre claire `#A7B83A` comme foncée `#1D4ED8`. Avant : **1,07:1** (sombre, barre claire).
- Fonds de lane réels : aucune lane zébrée, survolée ou repliée ne porte de `⋯` (catégorie repliée = en-tête) → fond toujours `--color-surface`.
- Focus visible, cible 44×44 et `aria-label` inchangés.

## Tests (déclarés par l'agent)
- Vitest : 136 fichiers / **1700/1700** ; `tsc`, `prettier --check`, `next lint` : exit 0.
- E2E, liste grep complète des specs citant `timeline-event-more|timeline-mobile|mt-tlm` : `sprint-91-more-contrast` 4/4 · `sprint-91-event-pin` 3/3 · `sprint-91-recurrence-marks` 3/3 · `timeline-mobile` 15/15 · `sprint-85-timeline-group-head` 9/9 · `timeline` 31/31 · `sprint-63-de-overflow-audit` 16/17 en run groupé — l'échec est la **purge post-test** (« création de la catégorie poubelle a rendu 500 »), pas une assertion ; rejouée seule 22/22. → 2e occurrence de PIT-S91-004, suivie par **#705**.
- **Armement** : `style={pin ? undefined : { color: ink }}` réintroduit dans le portrait → portrait/sombre/barre claire ROUGE `#0b0c0e sur #131519 = 1.07:1` (la valeur mesurée par le lead) ; portrait/clair rouge sur la garde « aucune encre inline » ; paysage vert (non muté, attendu). Restauration : shasum `291a09b7…` identique, runs suivants verts.
- Particularité : la spec neutralise la grille `background-image` de la lane avant de mesurer (le helper `readTextRendering` refuse les dégradés), après avoir vérifié que ce dégradé est le seul traversé.

## Fichiers de contexte lus (déclaration de l'agent)
`e2e/support/contrast.ts` l.226-253 (refus des dégradés) ; `e2e/sprint-91-event-pin.spec.ts` (stub + viewports) ; `timeline.css` l.660/729/745-758 ; `tokens/colors.css` l.7-22/60-66/139-145 ; les deux vues l.285-385 et leurs tests.

## Signaux mémoire
- [MEMORY:pitfall] `readTextRendering` (`e2e/support/contrast.ts`) lève sur `.mt-tlm__lane`, dont la grille est un `background-image` : identifier ce dégradé, le passer à `none`, puis mesurer — toute mesure de contraste sur une lane mobile doit le faire. → consolidé en PIT-S91-011.

## Recommandations suite
- Pas de RECOMMAND_TEST_RUNNER car la liste grep complète des specs mobiles a été rejouée.
- Pas de RECOMMAND_UI_DESIGN car la règle retenue est l'encre de page déjà utilisée pour le pin, sans nouveau token.
- Pas de RECOMMAND_FOLLOWUP nouveau car le 500 de purge est déjà suivi par #705.

STATUS: COMPLETED
