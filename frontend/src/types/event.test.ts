import { describe, it, expect } from 'vitest'
import {
  eventSchema,
  eventCreationSchema,
  eventEditSchema,
  mapToFullCalendarEvent,
  type Event,
} from './event'

// #150 — Sync Zod/types sur le contrat EventResponse v3 (#165).
// Couvre : color unique, recurrenceUnit WEEK/MONTH/YEAR, isAllDay, archived,
// recurrenceEndDate nullable, refines conditionnels.

const baseResponse = {
  id: 'e1',
  title: 'Event 1',
  type: 'duration',
  durationValue: 3,
  durationUnit: 'days',
  isRecurring: true,
  recurrenceUnit: 'WEEK',
  recurrenceEndDate: '2026-12-31',
  startDate: '2026-01-01',
  endDate: '2026-01-04',
  productId: 'p1',
  isAllDay: false,
  color: '#123456',
  archived: false,
}

describe('eventSchema (EventResponse v3)', () => {
  it('parse le contrat complet (color unique, recurrenceUnit MAJUSCULE, isAllDay, archived)', () => {
    const parsed = eventSchema.parse(baseResponse)
    expect(parsed.color).toBe('#123456')
    expect(parsed.recurrenceUnit).toBe('WEEK')
    expect(parsed.isAllDay).toBe(false)
    expect(parsed.archived).toBe(false)
    expect(parsed.recurrenceEndDate).toBe('2026-12-31')
  })

  it('accepte les champs nullable backend à null (color, recurrenceUnit, recurrenceEndDate, isAllDay, durationValue/Unit)', () => {
    const parsed = eventSchema.parse({
      ...baseResponse,
      color: null,
      recurrenceUnit: null,
      recurrenceEndDate: null,
      isAllDay: null,
      durationValue: null,
      durationUnit: null,
    })
    expect(parsed.color).toBeNull()
    expect(parsed.recurrenceUnit).toBeNull()
    expect(parsed.isAllDay).toBeNull()
  })

  it('rejette recurrenceUnit minuscule (ancien contrat)', () => {
    expect(() => eventSchema.parse({ ...baseResponse, recurrenceUnit: 'weeks' })).toThrow()
  })

  it('rejette les anciens champs si passés en recurrenceUnit invalide MONTH ok', () => {
    expect(eventSchema.parse({ ...baseResponse, recurrenceUnit: 'MONTH' }).recurrenceUnit).toBe(
      'MONTH',
    )
    expect(eventSchema.parse({ ...baseResponse, recurrenceUnit: 'YEAR' }).recurrenceUnit).toBe(
      'YEAR',
    )
  })

  it('archived est requis (toujours présent dans EventResponse)', () => {
    const noArchived: Record<string, unknown> = { ...baseResponse }
    delete noArchived.archived
    expect(() => eventSchema.parse(noArchived)).toThrow()
  })
})

describe('mapToFullCalendarEvent', () => {
  it('lit isAllDay (pas allDay) et color unique', () => {
    const ev: Event = eventSchema.parse(baseResponse)
    const mapped = mapToFullCalendarEvent(ev, 'Prod', 'cat', 'p1')
    expect(mapped.allDay).toBe(false)
    expect(mapped.color).toBe('#123456')
  })

  it('fallback color par défaut si null', () => {
    const ev: Event = eventSchema.parse({ ...baseResponse, color: null, isAllDay: null })
    const mapped = mapToFullCalendarEvent(ev, 'Prod', 'cat', 'p1')
    expect(mapped.color).toBe('#6366f1')
    expect(mapped.allDay).toBe(false)
  })
})

describe('eventCreationSchema', () => {
  it('accepte color au create (BR-EVE-014)', () => {
    const parsed = eventCreationSchema.parse({
      name: 'X',
      type: 'single',
      color: '#abcdef',
    })
    expect(parsed.color).toBe('#abcdef')
  })

  it('recurrenceUnit requis quand isRecurring=true (BR-EVE-006)', () => {
    const res = eventCreationSchema.safeParse({
      name: 'X',
      type: 'single',
      isRecurring: true,
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('recurrenceUnit'))).toBe(true)
    }
  })

  it('recurrenceUnit accepte WEEK/MONTH/YEAR', () => {
    const res = eventCreationSchema.safeParse({
      name: 'X',
      type: 'single',
      isRecurring: true,
      recurrenceUnit: 'MONTH',
    })
    expect(res.success).toBe(true)
  })
})

describe('eventEditSchema', () => {
  it('color unique + recurrenceEndDate/archived typés', () => {
    const parsed = eventEditSchema.parse({
      title: 'Titre long',
      type: 'duration',
      durationUnit: 'days',
      color: '#000000',
      recurrenceEndDate: '2026-06-01',
      archived: true,
    })
    expect(parsed.color).toBe('#000000')
    expect(parsed.archived).toBe(true)
    expect(parsed.recurrenceEndDate).toBe('2026-06-01')
  })

  it('recurrenceEndDate nullable', () => {
    const parsed = eventEditSchema.parse({
      title: 'Titre long',
      type: 'duration',
      durationUnit: 'days',
      recurrenceEndDate: null,
    })
    expect(parsed.recurrenceEndDate).toBeNull()
  })

  it('refine BR-EVE-006 : recurrenceUnit requis si isRecurring', () => {
    const res = eventEditSchema.safeParse({
      title: 'Titre long',
      type: 'duration',
      isRecurring: true,
    })
    expect(res.success).toBe(false)
  })

  it('refine BR-EVE-012 : recurrenceEndDate >= startDate', () => {
    const res = eventEditSchema.safeParse({
      title: 'Titre long',
      type: 'duration',
      startDate: '2026-05-10',
      recurrenceEndDate: '2026-05-01',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('recurrenceEndDate'))).toBe(true)
    }
  })

  it('recurrenceEndDate == startDate accepté (>=)', () => {
    const res = eventEditSchema.safeParse({
      title: 'Titre long',
      type: 'duration',
      durationUnit: 'days',
      startDate: '2026-05-10',
      recurrenceEndDate: '2026-05-10',
    })
    expect(res.success).toBe(true)
  })

  // #66 — BR-EVE-002 : endDate >= startDate.
  it('refine BR-EVE-002 : rejette endDate < startDate', () => {
    const res = eventEditSchema.safeParse({
      title: 'Titre',
      type: 'duration',
      startDate: '2026-05-10',
      endDate: '2026-05-01',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('endDate'))).toBe(true)
    }
  })

  it('refine BR-EVE-002 : endDate == startDate accepté (>=)', () => {
    const res = eventEditSchema.safeParse({
      title: 'Titre',
      type: 'duration',
      durationUnit: 'days',
      startDate: '2026-05-10',
      endDate: '2026-05-10',
    })
    expect(res.success).toBe(true)
  })

  // #66 — BR-EVE-003 : titre 1..100.
  it('refine BR-EVE-003 : rejette titre vide', () => {
    const res = eventEditSchema.safeParse({ title: '', type: 'single' })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('title'))).toBe(true)
    }
  })

  it('refine BR-EVE-003 : rejette titre > 100 caractères', () => {
    const res = eventEditSchema.safeParse({ title: 'x'.repeat(101), type: 'single' })
    expect(res.success).toBe(false)
  })

  // #66 — BR-EVE-009 : format hex.
  it('refine BR-EVE-009 : rejette une couleur hex invalide', () => {
    const res = eventEditSchema.safeParse({ title: 'T', type: 'single', color: 'bleu' })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('color'))).toBe(true)
    }
  })

  it('refine BR-EVE-009 : accepte #RGB et #RRGGBB', () => {
    expect(eventEditSchema.safeParse({ title: 'T', type: 'single', color: '#fff' }).success).toBe(
      true,
    )
    expect(
      eventEditSchema.safeParse({ title: 'T', type: 'single', color: '#3B82F6' }).success,
    ).toBe(true)
  })

  it('BR-EVE-009 : couleur vide tolérée (couleur non modifiée)', () => {
    expect(eventEditSchema.safeParse({ title: 'T', type: 'single', color: '' }).success).toBe(true)
  })

  // #66 review (MINEUR 6) — parité create/edit : durationUnit requis si type='duration'.
  it('refine BR-EVE-004 : rejette type=duration sans durationUnit', () => {
    const res = eventEditSchema.safeParse({
      title: 'Titre',
      type: 'duration',
      durationValue: 3,
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('durationUnit'))).toBe(true)
    }
  })

  it('refine BR-EVE-004 : accepte type=duration avec durationUnit', () => {
    const res = eventEditSchema.safeParse({
      title: 'Titre',
      type: 'duration',
      durationValue: 3,
      durationUnit: 'days',
    })
    expect(res.success).toBe(true)
  })

  it('refine BR-EVE-004 : type=single n’exige pas durationUnit', () => {
    expect(eventEditSchema.safeParse({ title: 'T', type: 'single' }).success).toBe(true)
  })
})
