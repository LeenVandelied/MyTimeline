# S41 — Correction review (#226 MAJEUR + #228 #195 MINEURs)

RETOUR :

- commits: 8de39ce95d0e1170cbd8975fad9773b37920aa41

- resume:
  - [MAJEUR #226] `timeline.css` l.180-206. BUG confirmé : `::before` 44×44 centré
    sur bouton 30px déborde de 7px/côté ; le groupe `.mt-zoom` a `overflow:hidden`
    (arrondi desktop) → 7px extérieurs des boutons de BORD (1er=gauche, dernier=droit)
    clippés → cible réelle ~37×44px. Fix retenu : `.mt-tlm .mt-zoom{overflow:visible}`
    (scopé mobile uniquement, desktop reste `overflow:hidden`) + réarrondi
    `:first-child`/`:last-child` à `--radius-md` (7px) pour préserver silhouette
    (sinon fond hover carré déborde). `::before` transparent → aucun rendu nouveau.
    Vérif géométrique : bouton W=30, `::before` W=44 → +7px/côté = 44px pleine
    largeur des DEUX boutons libérée. Bord gauche : `::before` left ≈ tlm_inner
    + padding `--space-3`(12) + border groupe(1) − 7 = tlm_inner + 6px → reste
    DANS `.mt-tlm` → pas de re-clip par `overflow:hidden` de `.mt-tlm`. Bord droit :
    groupe `inline-flex` (largeur contenu), loin du bord droit de `.mt-tlm` → OK.
    Commentaire trompeur "les deux hitboxes ne se chevauchent pas" remplacé par la
    vraie cause (clip extérieur) + note PIT.
  - [MINEUR #228] `EventPill.tsx` l.98-107. Commentaire réécrit : l'`aria-label` du
    bouton prime TOUJOURS → démasquer le span ne change pas l'annonce (pas de double
    lecture dans les 2 cas) ; la bascule sert la cohérence sémantique DOM (texte
    visible non masqué à tort) + Label-in-Name WCAG 2.5.3. Code inchangé.
  - [MINEUR #195] `TimelineView.tsx` l.629. Chevron produit `size={12}` → `size={13}`
    (= chevron catégorie, cohérence accordéon mirroré).

- Tests : `./scripts/test-quiet.sh frontend` → 62 fichiers, 456/456 verts (0 régression).
  `::before` non calculable jsdom → MAJEUR vérifié par inspection CSS/géométrie ci-dessus.

- [MEMORY:pitfall] Context: PAT-S24-002 (hitbox a11y `::before` 44×44 hors flux).
  Solution: un ancêtre avec `overflow:hidden` (ex `.mt-zoom` arrondi) CLIPPE le
  débordement du `::before` sur les éléments de bord → cible tactile réelle < 44px.
  Prevention: quand PAT-S24-002 s'applique dans un conteneur clippé, passer le
  conteneur en `overflow:visible` (scopé) + réarrondir les coins des enfants de bord
  pour garder l'arrondi visuel ; vérifier géométriquement que le débordement tient
  dans le padding des ancêtres clippants restants.

- recommandations suite: aucune.

STATUS: COMPLETED
