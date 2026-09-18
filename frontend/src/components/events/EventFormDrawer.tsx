'use client'

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { hideOthers } from 'aria-hidden'
import { RemoveScroll } from 'react-remove-scroll'

import { useFocusTrap } from '@/components/timeline/useFocusTrap'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useMobileKeyboard } from '@/hooks/useMobileKeyboard'
import { cn } from '@/lib/utils'

/**
 * #618 — COQUE UNIQUE du formulaire d'événement (handoff §Drawers, maquette S86 §A).
 *
 * Avant #618, deux surfaces divergentes : la création (`NewEventDrawer`, vrai
 * `.mt-drawer--form` au token 452px) et l'édition (`TimelineEditHost`, `Dialog` shadcn
 * stylé en panneau, `sm:w-[480px]` en dur). Cette coque est désormais la SEULE
 * implémentation : scrim, panneau, en-tête, nœud d'aperçu épinglé, corps défilant,
 * nœud de pied, focus-trap, Échap, évitement du clavier virtuel. Les deux appelants
 * n'y apportent que leur CONTENU (sélecteur de produit + formulaire en création,
 * formulaire + machine à conflit en édition).
 *
 * Surfaces (reprises telles quelles de la création, #300 / #79 / #326) :
 *   - `>= lg` : drawer latéral `.mt-drawer.mt-drawer--form` (largeur `--drawer-width-form`) ;
 *   - `< lg`  : bottom sheet `.mt-sheet`, fermer tactile 44×44, pied sticky (#79).
 *   L'aperçu n'est épinglé qu'en drawer : sur la sheet la hauteur visible est rare (#326).
 *
 * CONTENU EN RENDER-PROP : l'appelant reçoit les nœuds de portail DÉJÀ résolus
 * (`null` quand la variante n'en a pas) et les passe tels quels à `EventEditForm`.
 * Aucun appelant ne recalcule la variante → aucun second seuil de bascule possible.
 *
 * PORTAIL vers `document.body` : le panneau est `position:fixed`. Monté en ligne sous
 * la frise, un ancêtre à `transform`/`filter` le recadrerait ; le `Dialog` Radix
 * qu'il remplace portalisait déjà. Le focus-trap interroge le panneau par ref, la
 * position DOM est donc sans effet sur lui.
 */
export interface EventFormDrawerSlots {
  /** Variante bottom sheet (`< lg`). */
  isCompact: boolean
  /** Aperçu réduit : sheet ET clavier virtuel ouvert sous le seuil (#79). */
  compact: boolean
  /** Nœud d'aperçu épinglé, `null` hors drawer ou sans formulaire (#326). */
  previewPortalNode: HTMLElement | null
  /** Nœud de pied sticky, `null` hors sheet ou sans formulaire (#79). */
  footerPortalNode: HTMLElement | null
}

export interface EventFormDrawerProps {
  open: boolean
  onClose: () => void
  /** Titre de l'en-tête, aussi nom accessible du dialog. */
  title: string
  /** Ligne sous le titre (aide en création, événement ciblé en édition). */
  subtitle?: ReactNode
  /**
   * Racine des `data-testid` : le panneau porte `testId`, les parties `testId-overlay`,
   * `-close`, `-preview`, `-footer`. Préserve `shell-new-event-drawer*` (création) et
   * `timeline-edit-dialog*` (édition), cités par les specs E2E.
   */
  testId: string
  /**
   * Un formulaire est rendu dans le corps. Sans lui (chargement, aucun produit),
   * ni hôte d'aperçu ni pied : ils resteraient orphelins (liseré + padding vides).
   */
  hasForm: boolean
  /** #79 — transition « clavier virtuel ouvert » (sheet uniquement). */
  onKeyboardShow?: () => void
  /** #79 — transition inverse. */
  onKeyboardHide?: () => void
  children: (slots: EventFormDrawerSlots) => ReactNode
}

export const EventFormDrawer: React.FC<EventFormDrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  testId,
  hasForm,
  onKeyboardShow,
  onKeyboardHide,
  children,
}) => {
  const tCommon = useTranslations('common')
  const tHelp = useTranslations('dashboard.timeline.help')
  const panelRef = useRef<HTMLDivElement>(null)

  // `< lg` (1024px) : même seuil que la sidebar du shell (`hidden lg:flex`).
  const isCompact = useMediaQuery('(max-width: 1023px)')

  /**
   * `useFocusTrap` liste `onEscape` en dépendance d'effet : un callback instable
   * relance le piège à chaque rendu et VOLE le focus vers le premier focusable
   * (BUG-S44-001). L'édition passe un `onClose` recréé à chaque rendu (il dépend de
   * l'objet renvoyé par `useEventEditConflict`) : on le stabilise ICI, une fois pour
   * tous les appelants, plutôt que d'exiger un `useCallback` parfait de chacun.
   */
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  const handleClose = useCallback(() => onCloseRef.current(), [])

  useFocusTrap(panelRef, open, handleClose)

  /**
   * Revue S86 (MAJEUR) — FOND INERTE. Le `Dialog` Radix que #618 a remplacé en édition
   * posait `aria-hidden` sur tout le reste du document (`hideOthers`, même paquet et
   * même version que Radix) ; `aria-modal` seul n'est pas honoré partout. Appliqué aux
   * DEUX modes (la création ne l'avait jamais eu).
   *
   * `hideOthers` photographie les frères AU MOMENT de l'appel : un portail Radix ouvert
   * ensuite depuis le panneau (liste de `Select`, `DeleteConfirmDialog`,
   * `ConflictDialog`) n'est donc jamais masqué. Dépendance `[open]` seule : le panneau
   * est le MÊME nœud en drawer et en sheet (seule sa classe change), relancer l'effet
   * à la bascule de variante masquerait un portail déjà ouvert. Les éléments
   * `[aria-live]` (toasts) sont préservés par la bibliothèque.
   */
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    return hideOthers(panel)
  }, [open])

  /** #79 — armé UNIQUEMENT sheet ouverte : no-op strict sur le drawer. */
  const { keyboardOpen, compact, availableHeight, offsetTop } = useMobileKeyboard({
    enabled: open && isCompact,
    onKeyboardShow,
    onKeyboardHide,
  })

  /**
   * Nœuds de portail portés par un STATE (ref callback), pas un `useRef` : lu au
   * premier rendu, `ref.current` vaut `null` et sa mutation ne re-rend rien — le
   * formulaire resterait en flux (#79 / #326).
   */
  const [footerNode, setFooterNode] = useState<HTMLDivElement | null>(null)
  const [previewNode, setPreviewNode] = useState<HTMLDivElement | null>(null)

  if (!open || typeof document === 'undefined') return null

  const showPinnedPreview = !isCompact && hasForm
  const showSheetFooter = isCompact && hasForm

  const slots: EventFormDrawerSlots = {
    isCompact,
    compact: isCompact && compact,
    previewPortalNode: showPinnedPreview ? previewNode : null,
    footerPortalNode: showSheetFooter ? footerNode : null,
  }

  return createPortal(
    <>
      <div
        className={isCompact ? 'mt-sheet__overlay' : 'mt-drawer__overlay mt-drawer__overlay--form'}
        onClick={handleClose}
        data-testid={`${testId}-overlay`}
      />
      {/* Revue S86 (MAJEUR) — VERROU DE DÉFILEMENT, repris du `Dialog` Radix remplacé
          par #618 (`RemoveScroll`, même paquet et même version). `forwardProps` : aucun
          nœud ajouté, le verrou s'accroche au panneau lui-même (ref fusionnée). Hors du
          panneau (scrim compris) molette et glisser tactile sont annulés et `body` est
          figé ; `.mt-drawer__body` / `.mt-sheet__body` défilent toujours. Un `Select`
          ou une confirmation Radix ouverts depuis le panneau empilent leur propre verrou
          (pile partagée, une seule copie du paquet) : leur liste reste défilable. */}
      <RemoveScroll ref={panelRef} enabled allowPinchZoom forwardProps>
        <div
          className={isCompact ? 'mt-sheet' : 'mt-drawer mt-drawer--form'}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-testid={testId}
          /* #79 — état observable du clavier (oracle E2E), ABSENT sur le drawer. */
          data-keyboard={isCompact ? (keyboardOpen ? 'open' : 'closed') : undefined}
          data-compact={slots.compact ? 'true' : undefined}
          /* #79 — borne le `max-height:80vh` du DS à la hauteur visible ; clavier fermé
           → `undefined`, retour intégral à la feuille de style. */
          style={
            isCompact && keyboardOpen && availableHeight !== null
              ? { maxHeight: `${availableHeight}px`, top: `${offsetTop}px` }
              : undefined
          }
        >
          <div className={isCompact ? 'mt-sheet__header' : 'mt-drawer__header'}>
            <div className="min-w-0">
              <h2 className={isCompact ? 'mt-sheet__title' : 'mt-drawer__title'}>{title}</h2>
              {subtitle ? (
                <p className={isCompact ? 'mt-sheet__subtitle' : 'mt-drawer__subtitle'}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="mt-drawer__header-actions">
              {/* Puce « Échap » de la maquette : indication clavier, drawer seulement (la
                sheet sert le tactile). Décorative : la fermeture est portée par le
                bouton, déjà nommé pour les technologies d'assistance. */}
              {!isCompact && (
                <kbd className="mt-drawer__kbd" aria-hidden="true">
                  {tHelp('escapeKey')}
                </kbd>
              )}
              <button
                type="button"
                className={cn(
                  isCompact ? 'mt-sheet__close' : 'mt-drawer__close',
                  isCompact && 'mt-drawer__close--touch',
                )}
                onClick={handleClose}
                aria-label={tCommon('buttons.close')}
                data-testid={`${testId}-close`}
              >
                <X size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* #326 — Aperçu épinglé : HORS du corps (seul élément à `overflow:auto`), donc
            immobile pendant le défilement sans `position:sticky` ni z-index. */}
          {showPinnedPreview && (
            <div
              ref={setPreviewNode}
              className="mt-drawer__preview"
              data-testid={`${testId}-preview`}
            />
          )}

          <div className={isCompact ? 'mt-sheet__body' : 'mt-drawer__body'}>{children(slots)}</div>

          {/* #79 — Pied sticky de la sheet : hors du corps, visible au-dessus du clavier. */}
          {showSheetFooter && (
            <div
              ref={setFooterNode}
              className="mt-sheet__footer"
              data-testid={`${testId}-footer`}
            />
          )}
        </div>
      </RemoveScroll>
    </>,
    document.body,
  )
}

export default EventFormDrawer
