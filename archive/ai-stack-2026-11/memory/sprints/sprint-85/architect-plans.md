# Mini-plans architect — Sprint 85

> Généré par /sprint plan (architect, 2026-09-07). Lu par /sprint start Phase 4.1.

**Thème :** Frise : sidebar de catégories et barre d'outils
**Cohésion :** 0.70 (domaines : frise, catégories)
**Effort :** 7 points
**Dépend de :** Sprint 84 (#601 consomme la palette de catégorie unifiée par #577)

**Vagues :**
- V1 : #592 (pose la dérivation catégorie → couleur / compteur / état de filtre)
- V2 : #601 (consomme cette dérivation)
- V3 : #602

> **SPRINT MONO-FICHIER — chemin critique en série.** Les trois issues écrivent dans
> `frontend/src/components/timeline/TimelineView.tsx` (58 Ko). Zéro parallélisme :
> **ne pas affecter 3 agents à ce sprint.** Seule fraction isolable : le montage de
> `NewEventDrawer` requis par #602, sous `components/events/`.

```yaml
issue_592:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"      # aucun sélecteur sidebar/filter/legend aujourd'hui
    - "frontend/src/styles/ds/components/timeline.css"         # .mt-tlv__* existants
    - "frontend/public/locales/fr/common.json"                 # + en/es/de
    - "frontend/e2e/timeline.spec.ts"                          # 90.9K, spec principale
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: |
    TimelineView virtualise les lanes (LANE_VIRTUALIZATION_MIN_ROWS, navLanes:576) et
    le commentaire :593 signale DÉJÀ que navLanes rétrécit quand une catégorie
    au-dessus se replie. Un filtre de catégorie décale les mêmes index de navigation
    clavier (#81) : les coordonnées 'indexDeLane:indexDEvent' cassent si le filtre
    n'est pas appliqué EN AMONT de navLanes. C'est le risque le plus concret du plan.
  ordre_ecriture: "1) dériver l'état de filtre AVANT navLanes/virtualisation 2) sidebar (accordéons + légende + pliage global) 3) i18n 4 locales 4) E2E filtre + navigation clavier sous filtre"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Zéro occurrence de sidebar/filter/legend dans TimelineView.tsx (seul match :235
    est un `.filter(Boolean)` sans rapport). Le pliage EXISTE mais par PRODUIT/lane
    (:429-430) et par catégorie (TimelineGroupHead) — pas de pliage global.

issue_601:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"   # TimelineGroupHead, :276-300
    - "frontend/src/styles/ds/components/timeline.css"      # :195 .mt-tlv__group-head, :439 variante mobile .mt-tlm__group-head
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Le group-head est un <button> sticky à largeur imposée (railWidth). Y ajouter pastille + compteur peut faire déborder le rail sur les libellés longs en allemand (cas mesuré par sprint-63-de-overflow-audit.spec.ts)."
  ordre_ecriture: "pastille + compteur dans TimelineGroupHead -> résumé compact à l'état plié -> répercuter sur .mt-tlm__group-head (mobile) -> E2E DE overflow"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    TimelineGroupHead (TimelineView.tsx:276-300) rend ChevronRight + `{category}`,
    avec aria-expanded correct. Ni pastille ni compteur. À l'état plié, aucun résumé
    n'est rendu — conforme au constat de l'issue.
  ecart_enonce_issue: |
    L'en-tête de catégorie EXISTE et son a11y est correcte. Manquent la pastille, le
    compteur et le résumé plié. Ce n'est pas une création de composant.
```

_#602 : XS, pas de mini-plan. **Écart d'énoncé :** la barre d'outils EXISTE
(`TimelineView.tsx:1179`, `.mt-tlv__toolbar`) et contient déjà zoom −/+, minimap, plein
écran et aide. Les deux boutons manquants (Aujourd'hui, Nouvel événement) s'y insèrent —
la barre n'est pas à créer._

**Reste du lot frise au backlog** (#593, #594, #595, #596, #597, #598, #599, #600, #647) :
toutes dans le même `TimelineView.tsx`. Les répartir sur plusieurs sprints garantirait des
reprises. #597 est déjà localisée : `TimelineView.tsx:1216-1228`, `toggleFullscreen`.
