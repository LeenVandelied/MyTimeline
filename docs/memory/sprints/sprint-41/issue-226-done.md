# Issue #226 — a11y cible tactile ≥44px zoom mobile

RETOUR :
- commits: [85d1d30e6cf6f53caf57afec3a81df99054a358b]
- resume:
  - Objectif: `.mt-zoom__btn` cible tactile ≥44×44px WCAG 2.5.5 sur mobile touch, desktop inchangé.
  - Fichier clé REEL: `frontend/src/styles/ds/components/timeline.css` (~l.172, section #63 mobile). NB: chemin briefing `components/timeline/timeline.css` PERIME.
  - Approche CSS: override scoped `.mt-tlm .mt-zoom__btn{position:relative; min-height:44px;}` + `::before` 44×44 centré hors flux (PAT-S24-002). Icône font-size inchangée, flex du groupe intact.
  - Portée: `.mt-tlm` = racine portrait ET paysage (`TimelineMobileLandscape` = `class="mt-tlm mt-tlm--landscape"`) → couvre les 2 vues mobiles d'une seule règle.
  - Desktop inchangé: `TimelineView` (desktop) n'a AUCUN ancêtre `.mt-tlm`; `.mt-zoom__btn` global (l.58) reste 30px. Vérifié par lecture des 3 composants.
  - Non-chevauchement: les 2 hitboxes 44px séparées par `.mt-zoom__level` (centres ~15px et ~95px → gap ~36px, pas d'overlap mutuel). Débord latéral ~7px dans padding toolbar (espace vide, non interactif).
  - Tests: `./scripts/test-quiet.sh frontend` → 62 fichiers / 446 tests OK. Pseudo-élément non testable jsdom (vérif par inspection CSS, conforme note PAT-S24-002).
- [MEMORY:*] signaux:
  - [MEMORY:pitfall] Context: briefing #226 pointait `frontend/src/components/timeline/timeline.css`. Solution: fichier réel = `frontend/src/styles/ds/components/timeline.css`. Prevention: le CSS timeline vit dans le DS (`src/styles/ds/components/`), pas à côté des .tsx.
- recommandations suite: aucune
- STATUS: COMPLETED
