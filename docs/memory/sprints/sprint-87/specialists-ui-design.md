# Sprint 87 — revue `ui-design` post-implémentation (spawnée par le lead)

Périmètre : hero de la landing après #610 (`0a04df6`), #611 (`02a1b45`), #641 (`af01bb9`). Sources : extrait de
maquette `maquette-landing-hero.md` (lu par le lead dans `Landing.dc.html`), `docs/design/graphite-handoff.md`,
`frontend/src/styles/ds/`. Track PUBLIC.

**VERDICT : 5 CONFORME / 2 ÉCART acceptable / 0 À CORRIGER / 0 INDÉTERMINÉ**

| # | Point | Statut | Preuve / raison |
|---|---|---|---|
| 1 | Panneau | CONFORME + ÉCART acceptable | `border-rule-strong` (DS : « decorative emphasised, nested panels », mesuré `#D1D3D9`) ; `rounded-xl` = `--radius-xl` 14 px (maquette 14 px). **Absence d'ombre** = écart à la maquette (`shadow-md`) assumé : #574, surface au repos = filet ; consigné `HeroSection.tsx` + `issue-610-done.md`, verrou unitaire `not /shadow-/`. |
| 2 | Barre de chrome | CONFORME + ÉCART acceptable | Pastilles `size-[9px] bg-rule-strong rounded-full` = maquette. Libellé mono 10 px `.1em` uppercase = maquette. **Couleur `ink-muted` au lieu d'`ink-faint`** (2,82:1 → 6,11:1 clair / 5,85:1 sombre) : même arbitrage que #592. |
| 3 | Frise | CONFORME | Règle mono 9 px ; en-têtes de lane display 13 px semibold + mono 8 px `.08em` ; zébrure `color-mix(ink 2.6%)` ; barres `.mt-evt` réutilisées (26 px, rayon 6, 600 12 px, `shadow-sm`, `↻`) ; pin 10×16 rayon 3 ; libellé de ponctuel net +16 px ; curseur TODAY `.mt-tlv__today(-badge)` accent, mono 9 px `.12em`. |
| 4 | Encre des barres | CONFORME | Écart maquette (blanc → sombre sur rouge, pervenche, orange, teal) justifié : le blanc maquette est SOUS 4,5:1 sur `#E5484D` (3,91) et `#6C7BE0` (3,79) ; `contrastInk` = règle BR-EVE-009 de la frise de l'application. |
| 5 | Accent réservé à *today/active* | CONFORME | Seul le curseur TODAY porte `--color-accent` dans le panneau ; barres sur la palette `--evt-*`. |
| 6 | Clair / sombre, 0 hex | CONFORME | Aucun hex hors commentaires ; `--mt-evt`/`--mt-evt-ink` → `--gray-0`/`--gray-950` (identiques aux 2 thèmes, voulu) ; filets et encres suivent `colors.css .dark`. |
| 7 | Mobile | CONFORME | Lanes 40 px sous `md`, 46 px au-delà ; panneau 320 px : `34 + 6×40 = 274 ≤ 278` ; 0 troncature, 0 débordement, 4 locales × 4 paliers (mesures `issue-611-done.md`). |

Notes non bloquantes :
- `--evt-orchid` (`#AE55A6`, DEC-S84-003) ≠ hex maquette `#B056A8` : décision antérieure, pas un écart du sprint.
- L'audit est statique : il ne couvre pas le diff visuel Linux (traité par le lead, `6f8f6f4`).

Observation du lead (capture de référence noble, 1280 px) : le panneau de 420 px laisse ~70 px vides sous la 6e lane
(34 + 6×46 = 310 px de contenu pour ~378 px de zone). Conforme à la maquette (viewport 373 px, contenu 264 px — elle
laisse elle-même plus de vide) : non retenu comme écart.
