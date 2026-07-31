'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Controller, useForm, ControllerRenderProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { Switch } from './ui/switch'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Spinner } from './ui/spinner'
import { PopoverPicker } from './ui/popoverPicker'
import { DeleteConfirmDialog } from './shared/DeleteConfirmDialog'
import { ConflictDialog } from './shared/ConflictDialog'
import { EventPreviewTimeline } from './events/EventPreviewTimeline'
import type { PreviewEventType } from './events/previewTimeline'
import { useNetworkStatus } from '@/contexts/NetworkStatusContext'
import {
  createEventEditSchema,
  HEX_COLOR_REGEX,
  type Event,
  type EventEditFormValues,
} from '@/types/event'

export type { EventEditFormValues } from '@/types/event'

/**
 * #66 — Formulaire d'événement (création/édition), desktop + mobile portrait/paysage.
 *
 * Schéma Zod : source de vérité UNIQUE `types/event.ts` (`createEventEditSchema(t)`).
 * L'ancien doublon `eventEditSchema` local a été supprimé (#150).
 *
 * BR couvertes (validations inline, avant soumission) :
 *   - BR-EVE-002 : `endDate >= startDate` (`endErr`).
 *   - BR-EVE-003 : titre requis, 1..100 (`titleErr`).
 *   - BR-EVE-006 : `recurrenceUnit` requis si `isRecurring=true` (`seriesErr`).
 *   - BR-EVE-009 : `color` hex valide, modèle 1-couleur `backgroundColor` seul
 *     (design v3 #44 — plus de border/text). `text-white` hardcodé remplacé par
 *     un ink de contraste calculé (AA sur couleurs claires `--evt-*`).
 *
 * `submitState` (piloté par le parent, ex. mutation TanStack) à 4 états :
 *   idle | submitting (spinner + bouton désactivé) | error (message inline) |
 *   conflict (409 optimistic locking). Depuis #77, l'état `conflict` ouvre le
 *   `ConflictDialog` partagé (Dialog DS Radix : role=dialog, focus-trap, Échap) au
 *   lieu d'un bloc inline. Le conteneur du dialog préserve
 *   `data-testid="event-form-conflict"` (tests existants #66). Le contrat 409 #200
 *   étant un corps plat sans serverVersion/yourVersion, seule l'action « recharger »
 *   est proposée (la modale comparative reste un follow-up backend, RECOMMAND_FOLLOWUP).
 *
 * Preview live : recalcul debounce 150 ms (perf, cohérent `--dur-base:200ms`).
 * #315 — le rendu de cet aperçu est délégué à `EventPreviewTimeline` (mini-frise
 * du handoff §6 : règle + TODAY + occurrence fantôme + légende). Ce composant ne
 * lui passe QUE des valeurs débouncées — y brancher les `watch()` bruts
 * recalculerait la géométrie de la frise à chaque frappe.
 *
 * Responsive : le formulaire est rendu dans le drawer/bottom-sheet du parent
 * (`EventContent`, pattern `ProductDrawer.tsx:240-244`). Aucun breakpoint custom :
 * `sm:` (640px) unique — bottom-sheet < 640px (portrait ET paysage), drawer >= 640px.
 */
export type EventSubmitState = 'idle' | 'submitting' | 'error' | 'conflict'

/**
 * #300 — Mode du formulaire. Le composant reste mode-agnostique sur la mécanique
 * (piloté par `defaultValues` + `onSubmit`) ; `mode` ne gouverne QUE les champs dont
 * l'existence dépend du contrat backend (asymétrie create/update, BR-EVE-013/014) :
 *
 *   - `archived`  : PATCH-only (BR-EVE-013 — un event ne peut pas naître archivé,
 *                   le champ est ABSENT d'`EventCreationRequest`).
 *   - `endDate`   : CALCULÉE backend à la création (BR-EVE-003, `Utils.calculateEndDate`).
 *                   L'afficher au create laisserait croire qu'elle est modifiable alors
 *                   qu'elle serait ignorée.
 *   - `recurrenceEndDate` : hors DTO create (BR-EVE-012).
 *
 * Défaut `'edit'` → les consommateurs existants (`EventContent`, `TimelineEditHost`)
 * sont inchangés, aucun champ ne disparaît de l'édition.
 */
export type EventFormMode = 'create' | 'edit'

type ColorField = ControllerRenderProps<EventEditFormValues, 'color'>

interface EventEditFormProps {
  defaultValues: EventEditFormValues
  onSubmit: (data: EventEditFormValues) => Promise<void>
  onCancel: () => void
  /** #300 — `'create'` masque les champs PATCH-only. Défaut `'edit'` (non-cassant). */
  mode?: EventFormMode
  /** État de soumission (idle/submitting/error/conflict). Défaut `idle`. */
  submitState?: EventSubmitState
  /**
   * Rechargement (état `conflict`) : recharge/invalide l'événement à jour.
   * Déclenché par le bouton « recharger » du `ConflictDialog` partagé (#77).
   */
  onReload?: () => void
  /**
   * Fermeture du `ConflictDialog` sans recharger (bouton annuler / Échap /
   * overlay). Le parent DOIT réinitialiser `submitState` à `idle` pour que le
   * dialog puisse se refermer (l'ouverture est dérivée de `submitState`). Défaut
   * no-op → si omis, le dialog reste ouvert tant que le parent n'a pas changé
   * l'état (RECOMMAND : toujours fournir ce callback). */
  onConflictDismiss?: () => void
  /**
   * #231 — Modale comparative : état serveur GAGNANT (corps 409 enrichi) + valeurs
   * locales soumises. Fournis ensemble → le `ConflictDialog` bascule en mode comparatif
   * (diff champ par champ + « garder mes modifications » / « prendre la version serveur »).
   * Absents → mode legacy (bouton « recharger »).
   */
  conflictServerEvent?: Event
  conflictLocalValues?: EventEditFormValues
  /** #231 — « Garder mes modifications » : re-soumet les valeurs locales. */
  onKeepMine?: () => void
  /** #231 — « Prendre la version serveur » : abandonne le local + rafraîchit. */
  onTakeServer?: () => void
  /** Mode édition : supprime l'événement (ouvre le dialog de confirmation). */
  onDelete?: () => Promise<void>
  /** Récurrence de l'événement édité → warning suppression « seul cet événement ». */
  isRecurring?: boolean
}

/**
 * #300 — Pont enum récurrence (MAJUSCULE, `recurrenceUnit`) → clés i18n des unités
 * (minuscule, `products.add.event.units.*`). Les deux vocabulaires sont distincts par
 * contrat (cf. `types/event.ts`) : ne pas les confondre avec `durationUnit`.
 */
const RECURRENCE_UNIT_KEY = { WEEK: 'weeks', MONTH: 'months', YEAR: 'years' } as const

/** Valeur debouncée (perf preview live, BR-EVE-009 — 150 ms). */
function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export const EventEditForm: React.FC<EventEditFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  mode = 'edit',
  submitState = 'idle',
  onReload,
  onConflictDismiss,
  conflictServerEvent,
  conflictLocalValues,
  onKeepMine,
  onTakeServer,
  onDelete,
  isRecurring: eventIsRecurring = false,
}) => {
  const t = useTranslations('products.add.event.form')
  const tUnits = useTranslations('products.add.event.units')
  const tTypes = useTranslations('products.add.event.types')
  const tDetails = useTranslations('products.details')
  const tCommon = useTranslations('common')
  const tErr = useTranslations('validation.event')
  const tNet = useTranslations('network')
  // #76 — hors ligne : on désactive les actions mutantes (submit/suppression)
  // pour éviter une soumission « dans le vide ». La bannière réseau explique le pourquoi.
  const { isOnline } = useNetworkStatus()

  const form = useForm<EventEditFormValues>({
    resolver: zodResolver(createEventEditSchema((key) => tErr(key))),
    defaultValues,
    mode: 'onTouched', // validations inline dès qu'un champ est touché (sans submit).
  })

  const [isColorOpen, setIsColorOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const submitting = submitState === 'submitting'
  const isEdit = Boolean(onDelete)
  // #300 — champs gouvernés par l'asymétrie du contrat create/update (cf. `EventFormMode`).
  const isCreate = mode === 'create'

  const handleColorChange = (color: string, field: ColorField) => {
    field.onChange(color)
  }

  // Preview live : couleur + type/durée debouncés à 150 ms (perf).
  const rawColor = form.watch('color')
  const rawTitle = form.watch('title')
  const rawType = form.watch('type')
  const rawDurationValue = form.watch('durationValue')
  const rawDurationUnit = form.watch('durationUnit')
  const previewColor = useDebounced(rawColor)
  const previewTitle = useDebounced(rawTitle)
  const previewType = useDebounced(rawType)
  const previewDurationValue = useDebounced(rawDurationValue)
  const previewDurationUnit = useDebounced(rawDurationUnit)

  const validPreviewColor = previewColor && HEX_COLOR_REGEX.test(previewColor) ? previewColor : undefined

  // #review S46 — `eventEditSchema.type` reste `z.string()` (le backend n'a AUCUNE
  // contrainte d'enum sur `type` : toute valeur hors `duration` est traitée comme
  // `single`, cf. br-events §1). L'aperçu, lui, expose le domaine FERMÉ : on normalise
  // ici, à la frontière, plutôt que d'élargir le type du composant (ni de caster).
  const previewEventType: PreviewEventType = previewType === 'duration' ? 'duration' : 'single'

  const isRecurringWatch = form.watch('isRecurring')

  // #315 — dates débouncées elles aussi : la mini-frise recalcule sa fenêtre à
  // partir de `startDate`/`endDate`, une saisie non débouncée la ferait glisser
  // à chaque frappe (BR-EVE-009, cf. `useDebounced`).
  const previewStartDate = useDebounced(form.watch('startDate'))
  const previewEndDate = useDebounced(form.watch('endDate'))

  // #300 — libellé de récurrence, composé de clés i18n EXISTANTES (`form.recurring`
  // + `units.*`) → aucune clé nouvelle, parité 4 locales préservée par construction.
  // #315 — désormais rendu DANS la légende de la mini-frise (testid inchangé).
  const rawRecurrenceUnit = form.watch('recurrenceUnit')
  const previewIsRecurring = useDebounced(isRecurringWatch)
  const previewRecurrenceUnit = useDebounced(rawRecurrenceUnit)
  const previewRecurrence =
    previewIsRecurring && previewRecurrenceUnit
      ? `${t('recurring')} · ${tUnits(RECURRENCE_UNIT_KEY[previewRecurrenceUnit])}`
      : null

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid="event-form"
        >
          {/* #review S42 (BR-EVE-015) — `version` optimiste rendue EXPLICITE : champ
              registered (Controller) plutôt que survie via `defaultValues` non-enregistré.
              Robuste à un futur `reset()`/`setValue`. Non éditable (hidden), Controller
              conserve le type (number|null) sans coercion DOM → threadée telle quelle
              dans le PATCH (arme le 409 déterministe #231). */}
          <Controller
            control={form.control}
            name="version"
            render={({ field }) => (
              <input
                type="hidden"
                name={field.name}
                ref={field.ref}
                value={field.value ?? ''}
                readOnly
                data-testid="event-form-version"
              />
            )}
          />
          <Card className="bg-surface border-rule shadow-md">
            <CardContent className="space-y-4 p-4">
              {/* Titre — BR-EVE-003 (required, 1..100). */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-ink">{t('name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('namePlaceholder')}
                        data-testid="event-form-title-input"
                        {...field}
                        className="bg-surface-2 text-ink border-rule-emphasis"
                      />
                    </FormControl>
                    <FormMessage data-testid="event-form-title-error" />
                  </FormItem>
                )}
              />

              {/* Type. */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-ink">{t('type')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger
                          className="bg-surface-2 text-ink border-rule-emphasis"
                          data-testid="event-form-type-trigger"
                        >
                          <SelectValue placeholder={t('typePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface-2 text-ink border-rule-strong">
                        <SelectItem value="duration">{tTypes('duration')}</SelectItem>
                        <SelectItem value="single">{tTypes('single')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {rawType === 'duration' && (
                <div className="flex space-x-4">
                  <FormField
                    control={form.control}
                    name="durationValue"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-ink">{t('durationValue')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            data-testid="event-form-duration-value"
                            {...field}
                            value={field.value ?? ''}
                            className="bg-surface-2 text-ink border-rule-emphasis"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="durationUnit"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-ink">{t('durationUnit')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-surface-2 text-ink border-rule-emphasis">
                              <SelectValue placeholder={t('durationUnitPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-surface-2 text-ink border-rule-strong">
                            <SelectItem value="days">{tUnits('days')}</SelectItem>
                            <SelectItem value="weeks">{tUnits('weeks')}</SelectItem>
                            <SelectItem value="months">{tUnits('months')}</SelectItem>
                            <SelectItem value="years">{tUnits('years')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Dates début/fin — BR-EVE-002 (endErr). Champs optionnels : si les
                  deux sont renseignés, la garde `endDate >= startDate` s'applique.
                  #300 — `endDate` MASQUÉE au create : le backend la CALCULE depuis
                  `type`+durée (BR-EVE-003) et ignore toute valeur envoyée. La saisir
                  serait sans effet. `startDate` reste offerte (BR-EVE-005 : absente ⇒
                  `LocalDate.now()` backend) et occupe alors toute la largeur. */}
              <div className="flex space-x-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-ink">{t('startDate')}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          data-testid="event-form-start-date"
                          {...field}
                          value={field.value ?? ''}
                          className="bg-surface-2 text-ink border-rule-emphasis"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isCreate && (
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-ink">{t('endDate')}</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="event-form-end-date"
                            {...field}
                            value={field.value ?? ''}
                            className="bg-surface-2 text-ink border-rule-emphasis"
                          />
                        </FormControl>
                        <FormMessage data-testid="event-form-end-error" />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Récurrence — BR-EVE-006 (seriesErr) + recurrenceEndDate (BR-EVE-012). */}
              <div className="border-rule space-y-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="event-form-recurring-toggle"
                          className="data-[state=checked]:bg-accent"
                        />
                      </FormControl>
                      <FormLabel className="text-ink cursor-pointer font-normal">
                        {t('recurring')}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {isRecurringWatch && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recurrenceUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ink">{t('recurrenceUnit')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger
                                className="bg-surface-2 text-ink border-rule-emphasis"
                                data-testid="event-form-recurrence-trigger"
                              >
                                <SelectValue placeholder={t('recurrenceUnitPlaceholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-surface-2 text-ink border-rule-strong">
                              {/* #331 — testid dérivé de la `value` (jamais du libellé i18n,
                                  qui change avec la locale). Radix ne répercute pas `value`
                                  sur le DOM : sans cet attribut, les specs ciblent par index. */}
                              <SelectItem value="WEEK" data-testid="recurrence-unit-option-WEEK">
                                {tUnits('weeks')}
                              </SelectItem>
                              <SelectItem value="MONTH" data-testid="recurrence-unit-option-MONTH">
                                {tUnits('months')}
                              </SelectItem>
                              <SelectItem value="YEAR" data-testid="recurrence-unit-option-YEAR">
                                {tUnits('years')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage data-testid="event-form-series-error" />
                        </FormItem>
                      )}
                    />

                    {/* #300 — hors DTO create (BR-EVE-012 : `recurrenceEndDate` PATCH-only). */}
                    {!isCreate && (
                      <FormField
                        control={form.control}
                        name="recurrenceEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-ink">{t('recurrenceEndDate')}</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                data-testid="event-form-recurrence-end-date"
                                {...field}
                                value={field.value ?? ''}
                                className="bg-surface-2 text-ink border-rule-emphasis"
                              />
                            </FormControl>
                            <p className="text-ink-muted text-xs">{t('recurrenceEndHint')}</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Couleur unique (design v3 #44) + validation hex (BR-EVE-009). */}
              <div className="border-rule space-y-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <FormLabel className="text-ink m-0 font-medium">
                        {tDetails('color')}
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <PopoverPicker
                          isOpen={isColorOpen}
                          color={field.value ?? ''}
                          onChange={(color) => handleColorChange(color, field)}
                          onToggle={(isOpen) => setIsColorOpen(isOpen)}
                        />
                        <input
                          type="text"
                          value={field.value ?? ''}
                          onChange={(e) => handleColorChange(e.target.value, field)}
                          onBlur={field.onBlur}
                          data-testid="event-form-color-input"
                          className="bg-surface-2 text-ink border-rule-emphasis flex-1 rounded-md border px-3 py-2 text-sm focus:border-transparent"
                        />
                      </div>
                      <FormMessage data-testid="event-form-color-error" />
                    </FormItem>
                  )}
                />

                {/* #315 — Preview live (debounce 150 ms) : MINI-FRISE du handoff §6
                    (règle + TODAY + occurrence fantôme pointillée + légende
                    « prochaine occurrence »). Remplace le bloc coloré simple du
                    Sprint 44 (écart assumé DEC-S44-002). Les testids
                    `event-form-preview` et `event-form-preview-recurrence` sont
                    PRÉSERVÉS (tests #66/#300, E2E #314). */}
                <div>
                  <div className="text-ink mb-2 text-sm">{tDetails('preview')}</div>
                  <EventPreviewTimeline
                    title={previewTitle}
                    color={validPreviewColor}
                    type={previewEventType}
                    durationValue={previewDurationValue}
                    durationUnit={previewDurationUnit}
                    startDate={previewStartDate}
                    endDate={previewEndDate}
                    isRecurring={previewIsRecurring}
                    recurrenceUnit={previewRecurrenceUnit}
                    recurrenceLabel={previewRecurrence}
                  />
                </div>
              </div>

              {/* Archivage — BR-EVE-013 (archived PATCH-only). #300 : MASQUÉ au create,
                  le champ est absent d'`EventCreationRequest` (un event ne peut pas
                  naître archivé) ; l'afficher promettrait une option inexistante. */}
              {!isCreate && (
                <div className="border-rule space-y-4 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="archived"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-y-0 space-x-3">
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onChange={(e) => field.onChange(e.target.checked)}
                            data-testid="event-form-archived-toggle"
                          />
                        </FormControl>
                        <FormLabel className="text-ink cursor-pointer font-normal">
                          {t('archived')}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Erreur générique 4xx/5xx (le 409 optimistic ouvre le ConflictDialog). */}
              {submitState === 'error' && (
                <p role="alert" className="text-destructive text-sm" data-testid="event-form-error">
                  {tErr('submitError')}
                </p>
              )}

              <div className="border-rule flex items-center justify-between border-t pt-4">
                {isEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleteOpen(true)}
                    disabled={submitting || !isOnline}
                    title={!isOnline ? tNet('offline.hint') : undefined}
                    data-testid="event-form-delete"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {tCommon('buttons.delete')}
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-rule-emphasis text-ink-muted hover:bg-surface-2"
                    onClick={onCancel}
                    disabled={submitting}
                  >
                    {tCommon('buttons.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    className="bg-accent hover:bg-accent-hover text-accent-ink"
                    disabled={submitting || !isOnline}
                    title={!isOnline ? tNet('offline.hint') : undefined}
                    data-testid="event-form-submit"
                  >
                    {submitting && (
                      <Spinner label={tCommon('loading.saving')} className="text-current" />
                    )}
                    {/* #300 — libellé create : clé EXISTANTE `form.submit`
                        (« Ajouter l'événement »), déjà traduite dans les 4 locales. */}
                    {submitting
                      ? tCommon('loading.saving')
                      : isCreate
                        ? t('submit')
                        : tCommon('buttons.save')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Suppression (mode édition) — réutilise DeleteConfirmDialog #65, variante event. */}
      {isEdit && onDelete && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          variant="event"
          isRecurring={eventIsRecurring}
          onConfirm={onDelete}
        />
      )}

      {/* Conflit d'édition concurrente (409 optimistic, #77) — Dialog DS partagé.
          Ouverture dérivée de `submitState`. Fermeture (Échap/annuler/après reload)
          → `onConflictDismiss` pour que le parent repasse `submitState` à idle.
          `testId` préservé = `event-form-conflict` (tests existants #66). */}
      <ConflictDialog
        open={submitState === 'conflict'}
        onOpenChange={(next) => {
          if (!next) onConflictDismiss?.()
        }}
        onReload={() => onReload?.()}
        serverEvent={conflictServerEvent}
        localValues={conflictLocalValues}
        onKeepMine={() => onKeepMine?.()}
        onTakeServer={() => onTakeServer?.()}
        isSubmitting={submitting}
        testId="event-form-conflict"
      />
    </>
  )
}

export default EventEditForm
