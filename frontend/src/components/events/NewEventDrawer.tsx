'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EventEditForm, type EventEditFormValues } from '@/components/EventEditForm'
import { useFocusTrap } from '@/components/timeline/useFocusTrap'
import { useAuth } from '@/hooks/useAuth'
import { useCreateEvent } from '@/hooks/useCreateEvent'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { cn } from '@/lib/utils'
import { DEFAULT_COLOR, toEventCreationPayload } from '@/types/event'
import type { EventSubmitState } from '@/components/EventEditForm'

/**
 * #300 — Drawer de CRÉATION d'événement (handoff §6, 452px).
 *
 * Remplace le Dialog placeholder du shell (#210). Composition, zéro duplication :
 *   - le formulaire est `EventEditForm` en `mode="create"` (mode-agnostique : piloté
 *     par `defaultValues` + `onSubmit`) — les champs PATCH-only (`archived`,
 *     `endDate`, `recurrenceEndDate`) y sont masqués par le mode, pas par ce composant ;
 *   - le sélecteur de produit vit ICI, HORS du formulaire : `productId` n'existe que
 *     sur le chemin create (BR-EVE-002) ; l'ajouter à `EventEditFormValues` polluerait
 *     le contrat d'édition, où le produit n'est pas modifiable ;
 *   - le focus-trap/Échap/restauration réutilise `useFocusTrap` (#63, déjà extrait
 *     d'`EventDrawer`) — aucune 3e copie du pattern.
 *
 * Surfaces (décisions Designer) :
 *   - `>= lg` : drawer latéral droit `.mt-drawer.mt-drawer--form` (452px via le token
 *     `--drawer-width-form`). `.mt-drawer` (420px, drawer de DÉTAIL) reste INTACT.
 *   - `< lg`  : bottom sheet `.mt-sheet` + bouton fermer tactile 44×44
 *     (`.mt-drawer__close--touch`), cohérent avec le détail mobile. Pas de 452px
 *     plein écran. NB : le bouton déclencheur du shell est aujourd'hui `lg`-only ;
 *     la variante sheet couvre le redimensionnement et les futurs déclencheurs mobiles.
 *
 * Récurrence : parité FONCTIONNELLE avec l'édition (WEEK/MONTH/YEAR du schéma).
 * DIVERGENCE ASSUMÉE vs le mock §6, qui n'affiche qu'Aucune/Mensuelle/Annuelle :
 * omettre l'hebdomadaire retirerait une unité pourtant supportée par le backend
 * (enum `RecurrenceUnit`) et créerait une asymétrie create/edit injustifiable.
 *
 * CYCLE DE VIE — le parent monte ce drawer CONDITIONNELLEMENT (`AppShell.tsx`) : c'est
 * ce qui le démonte à la fermeture et purge son état interne (produit choisi, erreur
 * produit, état de la mutation), donc chaque ouverture repart vierge sans `reset()`
 * manuel. Le `if (!open) return null` ci-dessous n'est qu'un filet : rendre `null` ne
 * démonte PAS un composant (React garde l'instance et ses hooks vivants). Si un futur
 * appelant le monte en permanence, l'état résiduel réapparaîtra (revue PR #313).
 */
export interface NewEventDrawerProps {
  open: boolean
  onClose: () => void
}

/** Date du jour en `YYYY-MM-DD` LOCAL. `toISOString()` serait en UTC → décalerait
 *  d'un jour en soirée pour les fuseaux UTC+. */
const todayLocalIso = (): string => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const NewEventDrawer: React.FC<NewEventDrawerProps> = ({ open, onClose }) => {
  const t = useTranslations('shell.createDrawer')
  const tCommon = useTranslations('common')
  const { user } = useAuth()
  const panelRef = useRef<HTMLDivElement>(null)

  // `< lg` (1024px) : même seuil que la sidebar du shell (`hidden lg:flex`).
  const isCompact = useMediaQuery('(max-width: 1023px)')

  const productsQuery = useProductsWithEvents(user?.id)
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])

  const [productId, setProductId] = useState<string>('')
  const [productError, setProductError] = useState(false)

  const createEvent = useCreateEvent()

  useFocusTrap(panelRef, open, onClose)

  const handleSubmit = useCallback(
    async (values: EventEditFormValues) => {
      // BR-EVE-002 : `productId` requis. Gardé ICI (hors schéma du formulaire) → un
      // submit sans produit ne part PAS en 400 backend, l'erreur est inline.
      if (!productId) {
        setProductError(true)
        return
      }
      setProductError(false)
      try {
        await createEvent.mutateAsync(toEventCreationPayload(values, productId))
        onClose()
      } catch {
        // L'état d'erreur est porté par la mutation (`isError`) → `submitState='error'`
        // affiche le message inline du formulaire. Le service a déjà loggé (safeErrorMessage).
      }
    },
    [createEvent, onClose, productId],
  )

  if (!open) return null

  const submitState: EventSubmitState = createEvent.isPending
    ? 'submitting'
    : createEvent.isError
      ? 'error'
      : 'idle'

  const hasProducts = products.length > 0

  const defaultValues: EventEditFormValues = {
    title: '',
    type: 'duration',
    durationValue: 1,
    durationUnit: 'days',
    isRecurring: false,
    recurrenceUnit: undefined,
    // Champs PATCH-only : neutres, et de toute façon masqués + jetés par le mapper.
    recurrenceEndDate: null,
    endDate: undefined,
    archived: false,
    version: null,
    // BR-EVE-005 : pré-rempli à aujourd'hui (le backend ferait le même défaut si absent).
    startDate: todayLocalIso(),
    color: DEFAULT_COLOR,
  }

  return (
    <>
      <div
        className={isCompact ? 'mt-sheet__overlay' : 'mt-drawer__overlay'}
        onClick={onClose}
        data-testid="shell-new-event-drawer-overlay"
      />
      <div
        ref={panelRef}
        className={cn(isCompact ? 'mt-sheet' : 'mt-drawer mt-drawer--form')}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        data-testid="shell-new-event-drawer"
      >
        <div className={isCompact ? 'mt-sheet__header' : 'mt-drawer__header'}>
          <div>
            <h2 className={isCompact ? 'mt-sheet__title' : 'mt-drawer__title'}>{t('title')}</h2>
            <p className={isCompact ? 'mt-sheet__subtitle' : 'mt-drawer__subtitle'}>
              {t('subtitle')}
            </p>
          </div>
          <button
            type="button"
            className={cn(
              isCompact ? 'mt-sheet__close' : 'mt-drawer__close',
              isCompact && 'mt-drawer__close--touch',
            )}
            onClick={onClose}
            aria-label={tCommon('buttons.close')}
            data-testid="shell-new-event-drawer-close"
          >
            <X size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <div className={isCompact ? 'mt-sheet__body' : 'mt-drawer__body'}>
          {productsQuery.isLoading ? (
            <div
              className="flex items-center gap-2"
              role="status"
              aria-live="polite"
              data-testid="shell-new-event-drawer-loading"
            >
              {/* Spinner purement visuel : la live-region est portée par ce div (texte
                  visible complet) → une seule annonce, et l'état reste annoncé. Le
                  `aria-hidden` seul, SANS live-region sur le wrapper, rendrait le
                  chargement muet (pattern complet : ExportDataFlow.tsx:138-148). */}
              <Spinner label={t('loadingProducts')} aria-hidden="true" className="text-ink-muted" />
              <span className="text-ink-muted text-sm">{t('loadingProducts')}</span>
            </div>
          ) : !hasProducts ? (
            /* BR-EVE-002 : sans produit, aucun event n'est créable (le DTO exige un
               `productId` existant). On l'explique plutôt que d'afficher un formulaire
               condamné à échouer. */
            <p className="text-ink-muted text-sm" data-testid="shell-new-event-drawer-empty">
              {t('emptyProducts')}
            </p>
          ) : (
            <>
              {/* Sélecteur de produit — Select shadcn/Radix EXISTANT (aucun combobox
                  nouveau : hors charte). */}
              <div className="mt-drawer__field">
                <label className="mt-drawer__label" id="new-event-product-label">
                  {t('product')}
                </label>
                <Select
                  value={productId}
                  onValueChange={(value) => {
                    setProductId(value)
                    setProductError(false)
                  }}
                >
                  <SelectTrigger
                    className="bg-surface-2 text-ink border-rule-emphasis"
                    aria-labelledby="new-event-product-label"
                    aria-invalid={productError || undefined}
                    data-testid="shell-new-event-drawer-product-trigger"
                  >
                    <SelectValue placeholder={t('productPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-2 text-ink border-rule-strong">
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {productError && (
                  <p
                    role="alert"
                    className="mt-drawer__error"
                    data-testid="shell-new-event-drawer-product-error"
                  >
                    {t('productRequired')}
                  </p>
                )}
              </div>

              <EventEditForm
                mode="create"
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                onCancel={onClose}
                submitState={submitState}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default NewEventDrawer
