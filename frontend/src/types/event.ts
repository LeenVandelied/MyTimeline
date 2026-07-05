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
})

export type Event = z.infer<typeof eventSchema>

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
  }
}

const DEFAULT_COLOR = '#6366f1'

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
