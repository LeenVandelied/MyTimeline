# Revue design — Sprint 97 (#709 empilage lanes, #670 ink-faint)

Agent lecture seule, post-implémentation, avant clôture. Réf : readme.md DS
(`frontend/src/styles/ds/readme.md`), `a11y-audit.md` §10, maquette S91
(`docs/memory/sprints/sprint-91/maquette-frise-instant-serie.md`).

## 1 — Pas vertical mobile (35/31 dérivés du rendu réel, pas 24+7 maquette)

APPROUVÉ. `LANE_ROW_PITCH_PX` (`lane-layout.ts:73`) dérive du BARH RENDU (28
portrait / 24 paysage) + VGAP maquette (7), pas des constantes maquette (24+7=31
partout). Fidélité littérale à 24 px créerait un pas (31) < barre réelle
portrait (28) + VGAP → rangées quasi collées, contradiction avec l'intention
maquette (VGAP = espace visuel entre rangées). Le rendu portrait à 28 px (≠
maquette) est un écart DÉJÀ assumé (#594/#63), antérieur à #709 : dériver le
pas de la valeur réelle est cohérent avec ce précédent, pas une invention.

## 2 — Recouvrement cibles 44 px entre rangées adjacentes

APPROUVÉ, non bloquant. WCAG 2.5.8 (Target Size Minimum, AA) : seuil 24×24 CSS
px OU exception d'espacement si sous le seuil. Ici chaque cible fait déjà
44×44 (> 24) : le critère est satisfait par la taille seule, l'exception
d'espacement n'est pas requise même si les zones se touchent/chevauchent de
1-5 px en bordure. Pas de violation WCAG AA. Précédent déjà assumé (lane dense
paysage, débordement 5 px). Centres atteignables prouvé E2E (issue-709-done.md).
Réserve : aucune mesure humaine (issue-709-done.md « non vérifié ») — à
confirmer par `/review-ui` post-merge, pas bloquant ici.

## 3 — Libellé de lane centré verticalement (lane 3+ rangées)

APPROUVÉ. `.mt-tlv__lane-label` / `.mt-tlm__lane-label` (`timeline.css:258,746`)
ont `align-items:center; height:100%` PRÉEXISTANTS (pas de CSS neuf pour #709) :
le centrage sur lane haute est la continuation mécanique d'une règle déjà en
place, pas un choix nouveau à trancher contre la charte. Maquette silencieuse
sur ce point (« ce que la maquette ne traite pas »). Recommandation non
bloquante : le libellé se déplace verticalement à chaque changement de nombre
de rangées (zoom) — mineur, aucune règle de charte ne l'interdit ; si gênant en
usage, geler en haut (row 0) serait une correction ultérieure, pas un défaut
actuel.

## 4 — Réservation `⋯` mobile dans l'empilage (DEC-S97-004)

APPROUVÉ. Sans réservation `trailingPx=44`, le bouton menu de l'occurrence N
chevaucherait l'occurrence N+1 de la même rangée et capterait ses taps —
violation directe de l'affordance clic/tap (pas de critère WCAG numéroté, mais
contredit le principe cible-cliquable-non-ambiguë déjà appliqué au pin+libellé
desktop, maquette §2). Réservation cohérente avec le traitement du pin (100 px)
déjà dans `layoutLane`.

## 5 — Contraste hover `.mt-btn--secondary` / `.mt-iconbtn` / `.mt-select__trigger`

Deux sous-points :

**Pouce de switch → `rule-emphasis`** : APPROUVÉ. `core.css:187`. Indicateur
d'état d'un contrôle → bucket "functional" de la charte (readme.md:86,
"Icons or state indicators of a control take ink-muted or rule-emphasis").
Mesuré 3.70/4.10 sur `surface-2` (a11y-audit.md:482) ≥ 3:1 — conforme WCAG
1.4.11.

**Bordure au survol (3 sélecteurs) → CORRECTION, pas follow-up.**
`core.css:30,50,92` : état repos = `rule-emphasis` (3.97-4.81:1, conforme), état
`:hover` = `ink-faint` (2.56-2.99:1, sous 3:1). C'est le SURVOL — précisément
quand l'utilisateur cible le contrôle — qui fait chuter la limite visible sous
le seuil WCAG 1.4.11 (≥3:1, bucket "functional" du même tableau, readme.md:86-88
"the border IS the affordance"). Le readme (ligne ~199) classe pourtant "hover
borders" en décoratif — cette ligne est en contradiction avec son propre
tableau "Border tiers" (une bordure de contrôle FUNCTIONAL au repos ne devient
pas décorative au survol) ; c'est la table §Border-tiers qui fait foi (règle
structurée) sur la liste en prose. `a11y-audit.md:499` le documente déjà comme
écart connu ("Suivi séparé"). Correction : 1 ligne CSS × 3 sélecteurs
(`border-color:var(--color-ink-faint)` → `var(--color-rule-emphasis)` ou
`var(--color-ink-muted)`), risque de régression nul (pas de layout, pas de
nouveau token), taille XS — ne justifie pas un follow-up séparé vu l'impact
(régression WCAG AA sur 3 contrôles très fréquents : bouton secondaire,
icon-button, select). Ne pas fermer #709/#670 sans ce correctif ou sans
décision explicite du lead de le reporter en connaissance de cause.

## Synthèse

- APPROUVÉ : 1, 2, 3, 4, 5a (switch).
- CORRECTION requise avant clôture : 5b (hover borders, 3 sélecteurs
  `core.css:30,50,92`) — remplacer `ink-faint` par `rule-emphasis` (ou
  `ink-muted`) sur `border-color:hover`. Et amender `readme.md` (~ligne 199) qui
  liste "hover borders" en décoratif — trancher : soit tous les hover borders
  DÉCORATIFS (aucun affordance perdue) sont concernés, soit exclure
  explicitement les 3 contrôles fonctionnels ci-dessus de cette phrase.
