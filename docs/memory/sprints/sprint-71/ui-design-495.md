# UI-design — issue #495 (aperçu épinglé, surface ÉDITION)

verdict: APPROUVE_AVEC_RESERVES

methode: LECTURE DE CODE SEULE — aucun outil navigateur dispo dans cet agent (pas de
mcp Chrome/chrome-devtools chargé). Aucun pixel mesuré, aucun contraste mesuré.
Confiance: haute sur structure/tokens (code lu ligne à ligne), nulle sur rendu réel.

## Constats

[OK] TimelineEditHost.tsx:211,240-244 — pattern PAT-S70-001 respecté : nœud hôte DANS
bloc déjà `sticky top-0 z-10`, aucun nouveau sticky/z-index, `empty:hidden` posé.
[OK] EventEditForm.tsx:382-384 + timeline.css:347 — `.mt-drawer__label` est sélecteur
de classe nu (pas de combinateur ancêtre) : son usage hors `.mt-drawer` est valide,
comme affirmé dans le commentaire.
[OK] TimelineEditHost.tsx:77 + timeline.css:366 — seuil 640px réutilise une convention
déjà en place ailleurs (TimelineResponsive), pas inventé ad hoc.
[OK] grep `<EventEditForm` reconfirmé indépendamment (3 monteurs réels : NewEventDrawer,
TimelineEditHost, EventContent) — l'inventaire "3 surfaces" du done.md est bien faux,
EventDrawer/ConflictDialog ne montent pas le form.
[MAJEUR] TimelineEditHost.tsx:211 vs timeline.css:303,342 — divergence de GRAMMAIRE
visuelle avec la création. Création = 2 filets hairline `border-bottom:1px solid
var(--color-rule)` (`.mt-drawer__header` puis `.mt-drawer__preview`) pour séparer
titre/aperçu/corps. Édition = titre+aperçu FUSIONNÉS dans un seul bloc `bg-surface`
SANS filet interne, frontière avec le corps marquée par `shadow-md` au lieu d'un
hairline. readme.md:106 réserve `md/lg` à l'élévation du modal LUI-MÊME (déjà porté
par `shadow-xl` sur `DialogContent:206`) — un second `shadow-md` interne pour un rôle
que la création traite en hairline est une technique différente pour le même rôle
fonctionnel. Fix : remplacer `shadow-md` par `border-b border-rule` sur le bloc
d'en-tête (206→211), et ajouter un filet interne équivalent entre titre et nœud
d'aperçu pour retrouver le double-filet de la création.
[MINEUR] TimelineEditHost.tsx:240 — aucune hauteur max sur le bandeau (même lacune
que #326 gap 3, non mesurée ici non plus, sous 700px de haut).
[MINEUR] Pré-existant (non introduit par #495) — `DialogContent` sans
`DialogDescription`, déjà signalé par l'agent lui-même, hors mandat #495.

## Seuil 640px

Verdict: acceptable. Le handoff §6 NE fixe AUCUN breakpoint pixel pour cet écran
(seule cote donnée : "drawer latéral 452px" desktop). 640px = `sm:` Tailwind par
défaut, déjà utilisé ailleurs dans ce projet pour un comportement de layout comparable
(timeline.css:366). Pas une valeur inventée. Non mesuré visuellement si le passage
bottom-sheet/panneau tombe juste autour de 639-641px.

## Cohérence création vs édition

DIVERGENTE sur 1 point structurel (grammaire de séparation hairline vs shadow,
ci-dessus) — tout le reste (pattern portail, `previewPortalNode`, classe de libellé
partagée via le même composant, repli en flux <640px) est identique par construction
(même `EventEditForm`, mêmes branches de code).

## Non vérifié

Rendu réel clair/sombre, contraste du bloc fusionné, hauteur du bandeau <700px,
locales hors `fr`, effet visuel réel shadow-md vs hairline (nécessite navigateur).

## Recommandations suite

RECOMMAND_UI_DESIGN — re-mesurer en navigateur après correctif du [MAJEUR] ci-dessus
(hairline vs shadow-md), clair+sombre, >=640px et <640px, hauteur <700px.
Pas de RECOMMAND_DB_EXPERT car aucune donnée ni migration concernée ici.
Pas de RECOMMAND_SECURITY car changement 100% présentationnel sans surface réseau nouvelle.

STATUS: COMPLETED
