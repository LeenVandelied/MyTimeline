import { z } from 'zod'

// #150 — Sync Zod/types sur le contrat DTO events v3 (EventResponse livré par #165).
// Rappels contrat (source de vérité) :
//   - couleurs : champ UNIQUE `color` (bg/border/text supprimés backend, BR-EVE-009).
//   - `recurrenceUnit` : enum canonique MAJUSCULE WEEK/MONTH/YEAR (≠ durationUnit minuscule).
//   - `durationUnit` : minuscule days/weeks/months/years (unité de DURÉE).
//   - `isAllDay` : nom de sérialisation Jackson (pas `allDay`, BR-EVE-010).
//   - `recurrenceEndDate` (date nullable) + `archived` (boolean) exposés (BR-EVE-012/013).
// Pitfall Zod projet : `.nullable()` pour un champ nullable backend, JAMAIS `.nullish()`.

export const recurrenceUnitEnum = z.enum(['WEEK', 'MONTH', 'YEAR'])
export type RecurrenceUnit = z.infer<typeof recurrenceUnitEnum>

export const durationUnitEnum = z.enum(['days', 'weeks', 'months', 'years'])
export type DurationUnit = z.infer<typeof durationUnitEnum>

// #67 — Contrat de la preview de récurrence (POST /api/events/recurrence-preview,
// endpoint livré par #439). TYPAGE FRONTEND UNIQUEMENT : aucune sync DTO backend
// (le contrat est déjà figé côté serveur, on ne fait que le consommer).
//   - Requête : { startDate, recurrenceUnit (enum MAJUSCULE), recurrenceEndDate? }.
//     ⚠ #439 : `recurrenceUnit` est bindé sur l'enum EXACT WEEK/MONTH/YEAR (pas de
//     parsing tolérant) → on réutilise `recurrenceUnitEnum`, jamais les unités de durée.
//   - Réponse 200 : { count, capped }. `capped=true` = série tronquée (horizon 5 ans
//     sans borne, ou plafond MAX_OCCURRENCES=4000 avec borne) → pilote le hint #67.
export type RecurrencePreviewRequest = {
  startDate: string
  recurrenceUnit: RecurrenceUnit
  recurrenceEndDate?: string | null
}

export const recurrencePreviewResponseSchema = z.object({
  count: z.number(),
  capped: z.boolean(),
})

export type RecurrencePreviewResponse = z.infer<typeof recurrencePreviewResponseSchema>

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  durationValue: z.number().nullable().optional(),
  durationUnit: durationUnitEnum.nullable().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceUnit: recurrenceUnitEnum.nullable().optional(),
  recurrenceEndDate: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string(),
  productId: z.string(),
  isAllDay: z.boolean().nullable().optional(),
  color: z.string().nullable().optional(),
  archived: z.boolean(),
  // #absorb (BR-EVE-015) — version optimiste exposée par EventResponse. Relue au
  // chargement du formulaire et renvoyée dans le PATCH pour armer le 409 déterministe.
  // `.nullable().optional()` : défensif (corps 409 enrichi #231 la porte via serverEvent ;
  // rétro-compat d'un GET legacy sans le champ).
  version: z.number().nullable().optional(),
})

export type Event = z.infer<typeof eventSchema>

// #231 (BR-EVE-015) — Corps du 409 optimistic-lock ENRICHI, synchronisé MOT POUR MOT
// avec le backend (GlobalExceptionHandler.handleEventConflict) :
//   { error, serverVersion: number|null, serverEvent: EventResponse }
// `serverEvent` réutilise `eventSchema` (même projection que le GET/PATCH event) → toute
// dérive de champ casse le parse et donc le diff. `.nullable()` sur serverVersion (jamais
// absent, mais défensif). Consommé par EventContent (interception 409) → ConflictDialog
// comparative. Pitfall projet : parse via safeParse (un corps 409 legacy/plat = pas de diff,
// on retombe sur l'action « recharger »).
export const eventConflictBodySchema = z.object({
  error: z.string(),
  serverVersion: z.number().nullable(),
  serverEvent: eventSchema,
})

export type EventConflictBody = z.infer<typeof eventConflictBodySchema>

// #157 review — Sync Zod ↔ DTO (BR-PRO-001, même classe de désync que #61).
// Backend `EventCreationRequest.name` = `@Size(min = 1, max = 100)`. L'ancien
// `min(3)` rejetait à tort un événement couplé dont le nom dérive du nom produit
// (1-2 car. valides côté serveur) → ZodError générique, produit NON créé.
// Seul consommateur : `productCreateSchema.events` (création couplée).
// #150 — `color` fournissable au create (BR-EVE-014, String nullable, pas de validation hex).
//         `recurrenceUnit` migré vers enum WEEK/MONTH/YEAR + refine conditionnel BR-EVE-006.
export const eventCreationSchema = z
  .object({
    name: z.string().min(1).max(100, "Le nom de l'événement est requis"),
    type: z.enum(['duration', 'single']),
    date: z.date().optional(),
    durationValue: z.number().optional(),
    durationUnit: durationUnitEnum.optional(),
    isRecurring: z.boolean().optional(),
    recurrenceUnit: recurrenceUnitEnum.optional(),
    color: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'duration' && (!data.durationValue || data.durationValue <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La durée doit être supérieure à 0',
        path: ['durationValue'],
      })
    }
    // BR-EVE-006 : recurrenceUnit requis quand isRecurring=true.
    if (data.isRecurring === true && !data.recurrenceUnit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fréquence de récurrence est requise',
        path: ['recurrenceUnit'],
      })
    }
  })

export type EventCreate = z.infer<typeof eventCreationSchema>

export type FullCalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  resourceId: string
  color?: string
  extendedProps: {
    productId: string
    productName: string
    category: string
    type: string
    // #81 (a11y) — récurrence remontée au view-model pour l'`aria-label` agrégé
    // de la frise (BR-EVE-006). AJOUT purement frontend : le contrat Zod/DTO
    // (`eventSchema`) reste inchangé (zod_dto_sync: NON), on ne fait que ne plus
    // JETER `isRecurring`/`recurrenceUnit` au mapping. Optionnels : `undefined`
    // = event non récurrent (annonce vocale silencieuse sur la récurrence).
    isRecurring?: boolean
    recurrenceUnit?: RecurrenceUnit | null
    // #188 — `archived` (soft-delete amorcé, BR-EVE-013) remonté au view-model
    // pour pré-remplir le toggle d'édition. AJOUT frontend : contrat Zod/DTO
    // (`eventSchema.archived`) inchangé, on ne fait que ne plus le JETER au mapping.
    archived?: boolean
    // #230 — durée remontée au view-model, MÊME motif que `archived`/`version` :
    // ne plus JETER des champs qu'`eventSchema` porte déjà (aucun changement de
    // contrat Zod/DTO). SANS eux, `TimelineEditHost` pré-remplissait `durationUnit`
    // à `undefined` alors que `type` valait `'duration'` → le refine BR-EVE-004/006
    // du schéma d'édition rendait le formulaire NON SOUMISSIBLE tant que l'unité
    // n'était pas re-saisie à la main. Devenu BLOQUANT avec le verrou #230 : sur un
    // event archivé les champs sont en lecture seule, l'unité ne PEUT plus être
    // re-saisie, donc le désarchiver depuis la frise serait impossible.
    durationValue?: number | null
    durationUnit?: DurationUnit | null
    // #absorb (BR-EVE-015) — version optimiste propagée au view-model pour la threader
    // dans le PATCH d'édition (409 déterministe). Le formulaire la renvoie telle quelle.
    version?: number | null
  }
}

/**
 * Couleur de repli d'un event sans `color` (BR-EVE-009). #300 : exportée pour
 * pré-remplir le formulaire de création (le champ est optionnel côté DTO).
 * SOURCE UNIQUE — `EventContent.tsx` importe cette constante (#393, fin de la
 * redéclaration locale qui pouvait diverger).
 *
 * #393 — l'ancien défaut `#6366f1` (indigo-500 Tailwind) plafonnait à **4.467:1**
 * (mesuré via `contrastRatio` de `lib/color.ts`, meilleure encre = blanc), sous le
 * seuil WCAG AA de 4.5. Conséquence : `eventLabelReadableInside` renvoyait `false`
 * pour TOUT event créé sans couleur explicite → libellé rejeté À L'EXTÉRIEUR de la
 * barre, à l'état normal et non en cas limite.
 *
 * Retenu : `--evt-cobalt` **#3B62D4** → **5.407:1** (encre blanche), AA franchi.
 * Choisi plutôt que l'indigo-600 `#4f46e5` suggéré par l'issue (6.288:1, conforme
 * lui aussi) parce qu'il appartient à la palette event curated des 12 tons Graphite
 * (`ds/tokens/colors.css`, exposée en `--color-evt-cobalt`) : le projet a déjà
 * purgé ses indigos/violets hors palette (cf. `landing.css` / `landing-palette.test.ts`),
 * réintroduire un indigo Tailwind rouvrait cette dette. Teinte voisine de l'ancienne
 * → décalage visuel minime pour les events existants sans couleur.
 * Garde-fou anti-régression : `lib-a11y.test.ts` asserte
 * `eventLabelReadableInside(DEFAULT_COLOR) === true` sur cette constante importée.
 */
export const DEFAULT_COLOR = '#3B62D4'

export const mapToFullCalendarEvent = (
  event: Event,
  productName: string,
  category: string,
  productId: string,
): FullCalendarEvent => {
  return {
    id: event.id,
    title: event.title,
    start: event.startDate,
    end: event.endDate,
    allDay: event.isAllDay ?? false,
    resourceId: productId,
    color: event.color ?? DEFAULT_COLOR,
    extendedProps: {
      productId: event.productId,
      productName,
      category,
      type: event.type,
      // #81 — propage la récurrence au view-model (BR-EVE-006) pour l'aria-label
      // agrégé de la frise. Ne modifie ni le DTO ni le schéma Zod.
      isRecurring: event.isRecurring,
      recurrenceUnit: event.recurrenceUnit,
      // #188 — propage `archived` pour pré-remplir le toggle d'édition (BR-EVE-013).
      archived: event.archived,
      // #230 — propage la durée : sans elle, le formulaire ouvert depuis la frise
      // naît invalide sur `durationUnit` (BR-EVE-004/006) et refuse le submit.
      durationValue: event.durationValue,
      durationUnit: event.durationUnit,
      // #absorb — propage `version` pour armer le 409 déterministe au PATCH (BR-EVE-015).
      version: event.version,
    },
  }
}

// #150 — schéma unique édition (dédup : ancien doublon dans EventEditForm supprimé).
// `color` unique, `recurrenceUnit` enum WEEK/MONTH/YEAR, `recurrenceEndDate` + `archived`
// (PATCH-only, BR-EVE-013). Refines conditionnels BR-EVE-002 / BR-EVE-006 / BR-EVE-009 / BR-EVE-012.
//
// #66 — validations inline supplémentaires portées côté formulaire :
//   - BR-EVE-002 : `endDate >= startDate` (refine `endErr`).
//   - BR-EVE-009 : format hex valide `#RGB`/`#RRGGBB` (refine `colorErr`). Le backend
//     stocke `color` en String libre (aucune validation format) → la garde est FRONT.
//
// Factory i18n `createEventEditSchema(t)` : messages traduits (convention frontend,
// cf. cp-frontend « create*Schema(t) »). `eventEditSchema` reste exporté (messages FR
// bruts) pour le service et la rétro-compat des tests contrat.

/** Hex #RGB ou #RRGGBB (BR-EVE-009). Validation front — backend accepte String libre. */
export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

type EventEditMessages = {
  titleRequired: string
  titleMax: string
  durationMin: string
  durationUnitRequired: string
  recurrenceUnitRequired: string
  recurrenceEndBeforeStart: string
  endBeforeStart: string
  colorInvalid: string
}

const FR_MESSAGES: EventEditMessages = {
  titleRequired: "Le titre de l'événement est requis",
  titleMax: 'Le titre ne peut dépasser 100 caractères',
  durationMin: 'La durée doit être supérieure à 0',
  durationUnitRequired: "L'unité de durée est requise",
  recurrenceUnitRequired: 'La fréquence de récurrence est requise',
  recurrenceEndBeforeStart: 'La date de fin de récurrence doit être postérieure à la date de début',
  endBeforeStart: 'La date de fin doit être postérieure ou égale à la date de début',
  colorInvalid: 'Couleur invalide (format hexadécimal attendu, ex. #3B82F6)',
}

const buildEventEditSchema = (m: EventEditMessages) =>
  z
    .object({
      // Aligné sur le contrat backend (EventCreationRequest.name min=1, BR-EVE-001/003)
      // et sur eventCreationSchema.name (min(1)) — le client ne surcontraint pas le back.
      title: z.string().min(1, m.titleRequired).max(100, m.titleMax),
      type: z.string(),
      durationValue: z.coerce.number().min(1, m.durationMin).optional(),
      durationUnit: durationUnitEnum.optional(),
      isRecurring: z.boolean().default(false),
      recurrenceUnit: recurrenceUnitEnum.optional(),
      recurrenceEndDate: z.string().nullable().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      archived: z.boolean().optional(),
      // #absorb (BR-EVE-015) — version optimiste threadée dans le PATCH. Portée par le
      // formulaire (non éditable) : lue au chargement, renvoyée telle quelle → le backend
      // détecte un décalage avec la version serveur courante (409 déterministe #231). Sur
      // « garder mes modifications », le parent la réécrit avec la version serveur pour
      // éviter une boucle de 409.
      version: z.number().nullable().optional(),
      // BR-EVE-009 : hex valide si fourni (chaîne vide tolérée → couleur non modifiée).
      color: z
        .string()
        .optional()
        .refine((v) => !v || HEX_COLOR_REGEX.test(v), { message: m.colorInvalid }),
    })
    .superRefine((data, ctx) => {
      // BR-EVE-004/006 (#66 review — parité create/edit) : durationUnit requis
      // quand type='duration'. Le create schema le sous-entendait via durationValue ;
      // l'edit schema laissait passer une durée sans unité. On l'aligne.
      if (data.type === 'duration' && !data.durationUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: m.durationUnitRequired,
          path: ['durationUnit'],
        })
      }
      // BR-EVE-006 : recurrenceUnit requis quand isRecurring=true.
      if (data.isRecurring === true && !data.recurrenceUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: m.recurrenceUnitRequired,
          path: ['recurrenceUnit'],
        })
      }
      // BR-EVE-002 : endDate >= startDate (garde service backend → 400/422).
      if (data.startDate && data.endDate && data.endDate < data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: m.endBeforeStart,
          path: ['endDate'],
        })
      }
      // BR-EVE-012 : recurrenceEndDate >= startDate (garde service backend → 422).
      if (data.recurrenceEndDate && data.startDate && data.recurrenceEndDate < data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: m.recurrenceEndBeforeStart,
          path: ['recurrenceEndDate'],
        })
      }
    })

/** Schéma « brut » (messages FR) — service + tests contrat. */
export const eventEditSchema = buildEventEditSchema(FR_MESSAGES)

/** Factory i18n : messages traduits pour le formulaire (RHF + zodResolver). */
export const createEventEditSchema = (t: (key: string) => string) =>
  buildEventEditSchema({
    titleRequired: t('titleRequired'),
    titleMax: t('titleMax'),
    durationMin: t('durationMin'),
    durationUnitRequired: t('durationUnitRequired'),
    recurrenceUnitRequired: t('recurrenceUnitRequired'),
    recurrenceEndBeforeStart: t('recurrenceEndBeforeStart'),
    endBeforeStart: t('endBeforeStart'),
    colorInvalid: t('colorInvalid'),
  })

export type EventEditFormValues = z.infer<typeof eventEditSchema>

/* ===========================================================================
   #300 — Chemin CREATE (`POST /api/events`). Source UNIQUE du contrat, à côté
   du contrat d'édition (aucun schéma dupliqué dans le composant).
   =========================================================================== */

/**
 * Payload EXACT de `POST /api/events`, synchronisé champ par champ avec le DTO
 * backend `EventCreationRequest` (S15 #168). Les PIÈGES de ce DTO, vérifiés sur
 * le code Java (ne pas « corriger » sans relire `EventCreationRequest.java`) :
 *
 *  1. `name` (PAS `title`) — BR-EVE-001, `@NotBlank @Size(min=1,max=100)`. Le
 *     mismatch sémantique name↔title est documenté (anti-pattern du pack events) :
 *     le backend mappe `EventCreationRequest.name` vers `Event.title`.
 *  2. `date` (PAS `startDate`) — BR-EVE-005 ; absent ⇒ le backend prend
 *     `LocalDate.now()`. Format `YYYY-MM-DD` (LocalDate Java).
 *  3. `durationValue` (`@NotNull`) et `durationUnit` (`@NotBlank`) sont requis
 *     INCONDITIONNELLEMENT — y compris pour `type='single'`, où ils sont pourtant
 *     IGNORÉS par `Utils.calculateEndDate` (qui renvoie `startDate` tel quel,
 *     BR-EVE-003). C'est une asymétrie du DTO, pas une règle métier : les omettre
 *     sur un event ponctuel ⇒ 400. D'où les valeurs neutres de `toEventCreationPayload`.
 *  4. PAS d'`endDate` : calculée BACKEND (BR-EVE-003). Un `endDate` envoyé serait
 *     ignoré → le formulaire de création ne le demande pas (`mode='create'`).
 *  5. PAS d'`archived` (BR-EVE-013) ni de `recurrenceEndDate` (BR-EVE-012) :
 *     PATCH-only. Les exposer au create serait un mensonge d'interface.
 *  6. `recurrenceUnit` requis si `isRecurring=true` (BR-EVE-006/007,
 *     `@AssertTrue isRecurrenceUnitConsistent` → 400).
 *  7. `color` fournissable au create (BR-EVE-014) — String libre côté backend,
 *     le format hex est gardé côté FRONT (BR-EVE-009).
 *  8. `productId` requis + existant, ownership vérifiée (BR-EVE-002/008) → 404/403.
 */
/**
 * PORTÉE — ce schéma est la SOURCE DE TYPE du payload (`z.infer` ci-dessous), pas un
 * validateur d'exécution : `toEventCreationPayload` construit l'objet et personne ne
 * le `parse()`. Ne PAS y remettre de `superRefine` « miroir du backend » : il ne
 * s'exécuterait jamais et laisserait croire à une garde qui n'existe pas (revue PR #313).
 *
 * Où les règles sont RÉELLEMENT appliquées :
 *  - BR-EVE-006 (`recurrenceUnit` requis si `isRecurring`) → refine `seriesErr` de
 *    `buildEventEditSchema`, au niveau du FORMULAIRE (message par champ, testé) ;
 *  - BR-EVE-002 (`productId` requis) → garde de `NewEventDrawer` avant submit ;
 *  - filet ultime → `@Valid` backend (400).
 *
 * Un `parse()` ici serait piégeux en l'état : `toEventCreationPayload` est évalué DANS
 * le `try` de `handleSubmit`, dont le `catch` s'appuie sur `createEvent.isError` pour
 * afficher l'erreur ; une `ZodError` levée avant `mutateAsync` laisserait `isError` à
 * false → submit silencieusement sans effet. Restructurer la gestion d'erreur d'abord.
 */
export const eventCreationPayloadSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['duration', 'single']),
  durationValue: z.number().int(),
  durationUnit: durationUnitEnum,
  isRecurring: z.boolean(),
  recurrenceUnit: recurrenceUnitEnum.optional(),
  date: z.string().optional(),
  color: z.string().optional(),
  productId: z.string().uuid(),
})

export type EventCreationPayload = z.infer<typeof eventCreationPayloadSchema>

/**
 * Valeurs neutres pour `durationValue`/`durationUnit` quand `type='single'` (piège 3
 * ci-dessus). `0 days` est SANS effet métier : `calculateEndDate` court-circuite sur
 * `!"duration".equals(type)` et renvoie `startDate` → `endDate = startDate`, ce
 * qu'exige BR-EVE-003 pour un event ponctuel. Ces valeurs n'existent que pour
 * satisfaire `@NotNull`/`@NotBlank`.
 */
const SINGLE_NEUTRAL_DURATION = { value: 0, unit: 'days' as const }

/**
 * Traduit les valeurs du FORMULAIRE (`EventEditFormValues`, partagé avec l'édition)
 * + le produit ciblé en payload `POST /api/events`. C'est le SEUL endroit qui connaît
 * les renommages title→name / startDate→date : le composant n'en sait rien.
 *
 * `endDate`, `archived`, `recurrenceEndDate` et `version` du formulaire sont
 * volontairement JETÉS ici (points 4/5 : non exposés au create).
 */
export const toEventCreationPayload = (
  values: EventEditFormValues,
  productId: string,
): EventCreationPayload => {
  const isDuration = values.type === 'duration'
  return {
    name: values.title,
    type: isDuration ? 'duration' : 'single',
    durationValue: isDuration ? (values.durationValue ?? 0) : SINGLE_NEUTRAL_DURATION.value,
    durationUnit: isDuration ? (values.durationUnit ?? 'days') : SINGLE_NEUTRAL_DURATION.unit,
    isRecurring: values.isRecurring ?? false,
    // BR-EVE-006 : n'envoyer l'unité QUE si la récurrence est active (sinon bruit).
    recurrenceUnit: values.isRecurring ? values.recurrenceUnit : undefined,
    date: values.startDate || undefined,
    // BR-EVE-014/009 : hex validé FRONT ; chaîne vide ⇒ omis (pas de couleur imposée).
    color: values.color || undefined,
    productId,
  }
}
