# Mini-plans architect — Sprint 86

> Généré par /sprint plan (architect, 2026-09-07). Lu par /sprint start Phase 4.1.

> **⚠ CORRECTIONS DU LEAD AU DÉMARRAGE (2026-09-12) — PRIMENT SUR LE TEXTE CI-DESSOUS**
> 1. **ADR tranché : DEC-S86-001 — catégorie DÉRIVÉE du produit, non surchargeable.** Tout le
>    volet backend de `issue_617` (Event.java, commands, DTO, mapper, entité, migration) est
>    **ANNULÉ**. #617 = frontend seul, taille S.
> 2. « V10, dernière = V9 » est **faux** (tri lexical de `ls`) : dernière = V15. Sans objet
>    désormais (aucune migration).
> 3. Lignes décalées : 480px en dur à `TimelineEditHost.tsx:210` ; hint à `EventEditForm.tsx:798`.
> 4. Vagues révisées : V1 = #618 ∥ #646 (fichiers disjoints) · V2 = #617 (après #618).

**Thème :** Formulaire d'événement : surface unifiée et champ Catégorie
**Cohésion :** 0.45 (domaines : formulaire, frise, catégories, backend)
**Effort :** 7 points (**probablement sous-estimé — voir risque #617**)
**Dépend de :** Sprint 84 (#617 a besoin de la palette unique). #618 avant tout le reste
du formulaire (dépendance explicite de l'audit de conformité).

**Vagues :**
- V1 (parallèle) : #618 (frontend) ∥ #617-backend (domain + DTO + migration, zéro fichier frontend)
- V2 : #617-frontend (après #618, sinon le champ est ajouté deux fois)
- V3 : #646 (après V2, même fichier `EventEditForm.tsx`)

> **PRÉCONDITION BLOQUANTE DU SPRINT** — ADR à écrire avant la première ligne de #617 :
> le handoff veut `category` **dérivé du produit par défaut et surchargeable**. Trancher
> la nullabilité de la colonne et le lieu de la règle de repli (domaine, pas mapper).

```yaml
issue_618:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineEditHost.tsx"   # :208 'sm:w-[480px] sm:max-w-[480px]' <- LE 480px en dur
    - "frontend/src/components/EventEditForm.tsx"               # surface d'ÉDITION (racine de components/)
    - "frontend/src/components/events/NewEventDrawer.tsx"       # surface de CRÉATION (déjà conforme)
    - "frontend/src/styles/ds/tokens/spacing.css"               # :62 --drawer-width-form: 452px
    - "frontend/src/styles/ds/components/timeline.css"          # :347 .mt-drawer--form
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "TimelineEditHost monte le formulaire dans un Dialog Radix plein écran en mobile ; basculer sur .mt-drawer--form doit préserver le comportement paysage couvert par sprint-66-mobile-* et TimelineEditHost.test.tsx (13.6K)."
  ordre_ecriture: "Remplacer le 480px par --drawer-width-form dans TimelineEditHost -> factoriser la surface commune -> vérifier E2E sprint-42-events + sprint-71-edit-preview-pinned"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Le 480px en dur n'est PAS dans components/events/ : unique occurrence à
    TimelineEditHost.tsx:208. La surface de création est déjà conforme au token
    (--drawer-width-form: 452px, spacing.css:62 ; .mt-drawer--form, timeline.css:347),
    et NewEventDrawer.tsx:27,40-43 le documente. L'écart est côté ÉDITION seulement.
  ecart_enonce_issue: "CHEMIN FAUX dans l'issue — corriger le briefing avant spawn."

issue_617:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/domain/models/Event.java"
    - "backend/src/main/java/com/matimeline/eventmanager/domain/models/EventCreateCommand.java"
    - "backend/src/main/java/com/matimeline/eventmanager/domain/models/EventUpdateCommand.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventUpdateRequest.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventResponse.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/mappers/EventMapper.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java"
    - "backend/src/main/resources/db/migration/V10__event_category.sql"   # À CRÉER (dernière existante = V9)
    - "frontend/src/lib/schemas/"                                          # schéma zod événement
    - "frontend/src/components/events/NewEventDrawer.tsx"
    - "frontend/src/components/EventEditForm.tsx"
  couches_touchees: ["frontend", "backend", "domain", "application", "infrastructure"]
  strategie_test: "unit+E2E"
  risque_regression: |
    Le handoff veut `category` DÉRIVÉ du produit par défaut et SURCHARGEABLE. Une
    colonne NOT NULL casserait tous les événements existants ; une colonne nullable
    impose une règle de repli (null -> catégorie du produit) qui doit vivre dans le
    domaine, pas dans le mapper.
  ordre_ecriture: "1) ADR (dérivation vs surcharge, nullabilité) 2) V10 nullable + backfill depuis le produit 3) domain Event + commands 4) DTO/mapper/entity 5) zod 6) champ dans les DEUX surfaces (après #618) 7) E2E"
  zod_dto_sync: "OUI"
  possibly_done: false
  etat_reel_du_code: |
    `grep -n categor` sur NewEventDrawer.tsx : 0 occurrence. Côté backend, aucun des
    fichiers Event*.java n'apparaît dans la liste des fichiers contenant « categor » :
    la catégorie est portée par Product uniquement (ProductResponse, ProductMapper,
    CategoryController...). Le contrat est réellement à étendre. Dernière migration
    présente = V9__neutralize_invalid_recurrence_unit.sql.
  reclassement_taille: |
    Classée M, mais 9 fichiers backend + migration Flyway + 2 surfaces frontend.
    Prévoir un reclassement en L si l'ADR retient la surcharge. Risque de déborder S86.
  rappel_convention_projet: |
    Création domaine : `new Event(null, ...)` obligatoire (@Version + @GeneratedValue
    rejettent un id pré-assigné sur persist Postgres) ; getReference pour les
    associations. Des tests em.persist ont déjà masqué ce bug par le passé.
```

_#646 : XS, pas de mini-plan. **Écart d'énoncé :** le hint vit dans
`frontend/src/components/EventEditForm.tsx:785` (racine de `components/`, **pas** sous
`components/events/`), piloté par `frontend/src/hooks/useRecurrencePreview.ts`. Le 61 est
documenté côté backend : `RecurrenceExpansion.java:50` (« mensuel 4000/~333 ans → 61/5
ans ») ; `MAX_OCCURRENCES = 4000` (`:35`) n'est pas la borne effective, l'horizon 5 ans
l'est. Spec E2E existante à mettre à jour :
`frontend/e2e/sprint-82-recurrence-capped-hint.spec.ts`._

**Reste du lot formulaire au backlog** (#619, #620, #622, #639) : même fichier. Reprises
naturelles du sprint suivant, une fois la surface unifiée par #618.
