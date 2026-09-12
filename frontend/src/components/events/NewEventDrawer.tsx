'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EventEditForm, type EventEditFormValues } from '@/components/EventEditForm'
import { EventFormDrawer } from '@/components/events/EventFormDrawer'
import { useAuth } from '@/hooks/useAuth'
import { useCreateEvent } from '@/hooks/useCreateEvent'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { DEFAULT_COLOR, toEventCreationPayload } from '@/types/event'
import type { EventSubmitState } from '@/components/EventEditForm'

/**
 * #300 — Drawer de CRÉATION d'événement (handoff §6, 452px).
 *
 * Remplace le Dialog placeholder du shell (#210). Composition, zéro duplication :
 *   - la SURFACE (scrim, panneau drawer/sheet, en-tête, aperçu épinglé, pied sticky,
 *     focus-trap, Échap, clavier virtuel) est `EventFormDrawer` (#618), partagée avec
 *     l'édition (`TimelineEditHost`) — une seule implémentation ;
 *   - le formulaire est `EventEditForm` en `mode="create"` (mode-agnostique : piloté
 *     par `defaultValues` + `onSubmit`) — les champs PATCH-only (`archived`,
 *     `endDate`, `recurrenceEndDate`) y sont masqués par le mode, pas par ce composant ;
 *   - le sélecteur de produit vit ICI, HORS du formulaire : `productId` n'existe que
 *     sur le chemin create (BR-EVE-002) ; l'ajouter à `EventEditFormValues` polluerait
 *     le contrat d'édition, où le produit n'est pas modifiable.
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
  /**
   * #79 — Notifié à la TRANSITION « clavier virtuel ouvert » dans la variante
   * bottom sheet (jamais sur desktop, où le hook n'est pas armé). Optionnel :
   * l'évitement du clavier ne DÉPEND pas de ces callbacks, ils exposent l'état à
   * un parent (ex. mettre en pause une animation de fond).
   */
  onKeyboardShow?: () => void
  /** #79 — Transition inverse (clavier refermé). */
  onKeyboardHide?: () => void
}

/** Date du jour en `YYYY-MM-DD` LOCAL. `toISOString()` serait en UTC → décalerait
 *  d'un jour en soirée pour les fuseaux UTC+. */
const todayLocalIso = (): string => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const NewEventDrawer: React.FC<NewEventDrawerProps> = ({
  open,
  onClose,
  onKeyboardShow,
  onKeyboardHide,
}) => {
  const t = useTranslations('shell.createDrawer')
  const { user } = useAuth()

  const productsQuery = useProductsWithEvents(user?.id)
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])

  const [productId, setProductId] = useState<string>('')
  const [productError, setProductError] = useState(false)

  const createEvent = useCreateEvent()

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
  /** Aperçu épinglé et pied n'ont de sens que si le formulaire est rendu. */
  const showForm = !productsQuery.isLoading && hasProducts

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
    <EventFormDrawer
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={t('subtitle')}
      testId="shell-new-event-drawer"
      hasForm={showForm}
      onKeyboardShow={onKeyboardShow}
      onKeyboardHide={onKeyboardHide}
    >
      {({ compact, previewPortalNode, footerPortalNode }) =>
        productsQuery.isLoading ? (
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
                    <SelectItem
                      key={product.id}
                      value={product.id}
                      data-testid={`product-option-${product.id}`}
                    >
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
              /* #79 / #326 — nœuds résolus par la coque : `null` là où la variante
                 n'en a pas (pied hors sheet, aperçu hors drawer) → rendu en flux. */
              compact={compact}
              footerPortalNode={footerPortalNode}
              previewPortalNode={previewPortalNode}
            />
          </>
        )
      }
    </EventFormDrawer>
  )
}

export default NewEventDrawer
