'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Check, Pipette } from 'lucide-react'

import { cn } from '@/lib/utils'
import { swatchGlyphInkVar } from '@/lib/color'
import { EVENT_PALETTE, findPaletteEntry } from '@/lib/event-palette'
import { PopoverPicker } from './popoverPicker'

/**
 * #577 — Sélecteur de couleur « palette curatée + repli Personnalisé » du handoff
 * (§6 Formulaire : « palette curatée + repli « Personnalisé » avec picker »).
 *
 * UN SEUL composant pour toutes les surfaces qui choisissent une couleur de
 * donnée : catégorie (`CategoryDrawer`), événement (`EventEditForm`), produit
 * (`ProductDrawer`). Il reprend le motif né dans `CategoryDrawer` (12 pastilles +
 * `PopoverPicker`), désormais adossé aux tokens `--evt-*` via `EVENT_PALETTE`.
 *
 * CONTRAT DE NON-RÉÉCRITURE (DEC-S84-001) : le composant n'appelle `onChange`
 * QUE sur une action de l'utilisateur (clic, flèche, glisser dans le picker) —
 * jamais au montage, jamais pour « ramener » une valeur vers la palette. Une
 * couleur stockée hors palette (ancienne `CATEGORY_SWATCHES`, hex libre) s'affiche
 * « Personnalisé » ACTIF, aucune pastille cochée, valeur intacte.
 *
 * ACCESSIBILITÉ :
 *   - les 12 pastilles forment un `radiogroup` (motif APG) : UN arrêt de
 *     tabulation (la pastille cochée, sinon la première), flèches / Début / Fin
 *     pour se déplacer ET sélectionner ;
 *   - nom accessible = rôle traduit (« Rouge », « Sarcelle »…), jamais le hex seul ;
 *   - « Personnalisé » est un bouton HORS du groupe, `aria-pressed` = une couleur
 *     hors palette est active. Pas un 13e `radio` : il ouvre un popover, et
 *     `aria-expanded`/`aria-haspopup` (posés par Radix) ne sont pas autorisés sur
 *     le rôle `radio` ;
 *   - la sélection d'une pastille est portée par `aria-checked` ; la bordure
 *     `border-foreground` et le glyphe de coche (#416) en sont la traduction
 *     visuelle, indépendante de la couleur ;
 *   - focus : contour `:focus-visible` du DS, aucune utilitaire locale (#383).
 *
 * PEINTURE : `background-color: var(--evt-*)` et non le hex JS — c'est le token
 * qui est peint, le hex n'est que la valeur émise vers le formulaire. Les deux
 * sont verrouillés l'un sur l'autre (cf. `lib/event-palette.ts`).
 */
export interface PaletteColorPickerProps {
  /** Couleur stockée. `null`/`undefined`/`''` = aucune (rien de coché). */
  value: string | null | undefined
  /** Émis UNIQUEMENT sur action utilisateur — cf. contrat de non-réécriture. */
  onChange: (hex: string) => void
  /** Nom accessible du groupe de pastilles (en général le libellé du champ). */
  label: string
  /** Préfixe des testids : `<prefix>-swatch-<HEX>` et `<prefix>-color-custom`. */
  testIdPrefix: string
  disabled?: boolean
  /**
   * Couleur de départ du picker libre quand `value` est vide (ex. couleur héritée
   * de la catégorie pour un produit). Défaut : première couleur de la palette.
   */
  customInitialColor?: string | null
  /** Id d'un texte explicatif (ex. note de verrouillage d'un archivé). */
  describedBy?: string
}

export function PaletteColorPicker({
  value,
  onChange,
  label,
  testIdPrefix,
  disabled = false,
  customInitialColor,
  describedBy,
}: PaletteColorPickerProps) {
  const t = useTranslations('categories.palette')
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const radiosRef = React.useRef<Array<HTMLButtonElement | null>>([])

  const selected = findPaletteEntry(value)
  const isCustom = Boolean(value) && selected === undefined
  const selectedIndex = selected ? EVENT_PALETTE.indexOf(selected) : -1
  // Arrêt de tabulation unique du groupe : la pastille cochée, sinon la première
  // (y compris quand « Personnalisé » est actif — aucun radio n'est alors coché).
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0

  const pickerColor = value || customInitialColor || EVENT_PALETTE[0].hex

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = EVENT_PALETTE.length - 1
    let next: number
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = index === last ? 0 : index + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = index === 0 ? last : index - 1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = last
        break
      default:
        return
    }
    event.preventDefault()
    radiosRef.current[next]?.focus()
    onChange(EVENT_PALETTE[next].hex)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label={label}
        aria-describedby={describedBy}
        className="flex flex-wrap items-center gap-2"
      >
        {EVENT_PALETTE.map((entry, index) => {
          const checked = index === selectedIndex
          const name = t(`roles.${entry.role}`)
          return (
            <button
              key={entry.token}
              ref={(node) => {
                radiosRef.current[index] = node
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={name}
              title={name}
              tabIndex={index === tabStop ? 0 : -1}
              data-testid={`${testIdPrefix}-swatch-${entry.hex}`}
              disabled={disabled}
              onClick={() => onChange(entry.hex)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                // Aucune utilitaire de focus : l'indicateur est le contour
                // `:focus-visible` du DS, qui suit le `rounded-full` (#383).
                // La SÉLECTION est portée par `border-foreground` + le glyphe
                // (#416 : la bordure seule tombe à 1,81:1 contre l'ambre en sombre).
                'flex size-7 items-center justify-center rounded-full border transition',
                checked ? 'border-foreground' : 'border-rule',
                disabled && 'cursor-not-allowed opacity-50',
              )}
              style={{ backgroundColor: `var(${entry.token})` }}
            >
              {/* Décoratif : l'état est porté par `aria-checked`. Encre = token de
                  PALETTE brut calculé sur le remplissage (`swatchGlyphInkVar`,
                  ≥ 4.43:1 sur les 12 — cf. `ds/a11y-audit.md` §9). */}
              {checked && (
                <Check
                  className="size-4"
                  aria-hidden="true"
                  style={{ color: swatchGlyphInkVar(entry.hex) }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Repli « Personnalisé » : picker libre (react-colorful). Le bouton est le
          déclencheur du popover (`asChild`) ; il est ACTIF (`aria-pressed`) dès
          que la couleur stockée n'appartient pas à la palette. */}
      <PopoverPicker
        color={pickerColor}
        onChange={onChange}
        isOpen={pickerOpen}
        onToggle={setPickerOpen}
        disabled={disabled}
      >
        <button
          type="button"
          aria-pressed={isCustom}
          aria-describedby={describedBy}
          data-testid={`${testIdPrefix}-color-custom`}
          disabled={disabled}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition',
            isCustom ? 'border-foreground text-ink' : 'border-rule-emphasis text-ink-muted',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <span
            aria-hidden="true"
            className="border-rule flex size-4 shrink-0 items-center justify-center rounded-full border"
            // Aperçu de la couleur personnalisée : donnée utilisateur, pas un token.
            style={isCustom && value ? { backgroundColor: value } : undefined}
          >
            {!isCustom && <Pipette className="size-3" />}
          </span>
          {t('custom')}
          {isCustom && <Check className="size-3.5" aria-hidden="true" />}
        </button>
      </PopoverPicker>
    </div>
  )
}
