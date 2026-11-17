# Issue #227 — RETOUR

RETOUR :
- commits: [0a0d1c3caf77783a3f0fbacb2ed4dedbf176b1ef]
- resume: Option B actée (aide timeline hover/focus-only). `.claude/rules-jit/ux-patterns.md` modifié — §5 titre (retiré `(sauf ?)`), ligne table `| ? | ... [PRÉVU] |` supprimée, paragraphe `?` reformulé en décision actée (tooltip `.mt-tlv__help-pop` = surface d'aide, `?` PAS un raccourci), §9 entrée reformulée RÉSOLU (plus de RECOMMAND_FOLLOWUP, plus de "câbler OU acter"). Mentions `aria-describedby`/`#timeline-region-desc` (§1) INTACTES. AUCUN code timeline touché.
- confirmation UI: grep `frontend/src/components/timeline/` — 0 `aria-keyshortcuts`, 0 `case '?'`. `shortcuts[]` (TimelineView.tsx:415) = [T, [ ], + −, F, Échap], PAS de `?`. Le bouton `?` toolbar est un trigger tooltip hover/focus, pas un raccourci clavier. Doc↔code↔UI cohérents. Rien à changer côté UI.
- [MEMORY:decision] DEC-S41-227: Contexte=raccourci `?` listé mais jamais câblé (écart doc↔code). Décision=OPTION B — aide frise reste hover/focus-only via tooltip `.mt-tlv__help-pop` (role=tooltip, aria-describedby). Why=`?` non implémenté au clavier, tooltip déjà fonctionnel et conforme ; on aligne le référentiel sur le code plutôt que d'ajouter un handler. `?` retiré de la liste des raccourcis.
- recommandations suite: aucune

STATUS: COMPLETED
