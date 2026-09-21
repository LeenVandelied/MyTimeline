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
 *
 * GÉOMÉTRIE (#665) — deux défauts MESURÉS au navigateur (Chromium, `next start`,
 * sonde `sprint-96-palette-geometry.spec.ts`), pas déduits :
 *
 *   1. LIGNE ORPHELINE. Le groupe était un `flex flex-wrap` : le nombre de
 *      pastilles par ligne dépendait de la largeur DISPONIBLE, donc de chaque
 *      surface. Mesures AVANT correction, largeur du `radiogroup` entre
 *      parenthèses : `CategoryDrawer` 11+1 à 1280 px (402 px) — la 12e (graphite)
 *      seule sur sa ligne, exactement le défaut de l'issue ; `ProductDrawer`
 *      11+1 à 1280 ET à 375 px (402 / 400 px) ; `EventEditForm` 10+2 à 1280 px
 *      (377 px). Trois surfaces, trois découpages, aucun voulu.
 *      → `grid-cols-6` + `w-fit` : 6×2 par CONSTRUCTION, à toute largeur. Le
 *      découpage ne dépend plus d'une mesure de layout, donc plus d'une surface.
 *
 *   2. CIBLE TACTILE. Pastilles et bouton « Personnalisé » mesuraient 28×28 px
 *      (`size-7` / `h-7`) — au-dessus du minimum AA 2.5.8 (24 px), sous les
 *      44×44 que `styles/ds/a11y-audit.md` exige (§1 ligne 24, §Mobile Form
 *      lignes 77-78 « Idem swatches couleur : élargir la cible », §4 ligne 140
 *      « Switch / Checkbox / Radio : cible >= 44×44 sur mobile »).
 *      → `size-11` / `h-11` sous le point de rupture `sm` (640 px), `size-7` /
 *      `h-7` au-delà. La TAILLE desktop est donc inchangée au pixel près
 *      (28×28 ; la DISPOSITION, elle, change — cf. point 1). Mesuré par le bloc
 *      « géométrie desktop » de `sprint-96-palette-geometry.spec.ts` (@1280).
 *
 *      ÉCART ASSUMÉ À PAT-S24-002 (`::before` transparent 44×44, motif de
 *      `language-selector` / `theme-toggle` / `.mt-zoom__btn`) : ici la cible
 *      est AGRANDIE au lieu d'être étendue hors flux. Deux raisons mesurables.
 *      (a) Avec un pas de grille de 36 px (28 + `gap-2`), des pseudos de 44 px
 *      se CHEVAUCHERAIENT de 8 px : deux cibles adjacentes se disputeraient les
 *      mêmes pixels, ce qu'aucune tolérance ne rattrape. (b) PIT PAT-S24-002 :
 *      le pseudo déborde du groupe et un ancêtre défilant le clippe en silence
 *      (`overflow-y:auto` force `overflow-x` à `auto`) — les trois surfaces sont
 *      des panneaux défilants. La charte n'impose « conserver le visuel » qu'au
 *      `✕` de fermeture ; pour les swatches elle demande seulement d'« élargir
 *      la cible ». C'est ce que fait la boîte réelle, vérifiable par
 *      `boundingBox()` sans sonde de pseudo-élément.
 *
 * NAVIGATION CLAVIER — inchangée, et volontairement LINÉAIRE (le `radiogroup`
 * APG ne connaît qu'un ordre, pas une grille) : ←/↑ = précédent, →/↓ = suivant,
 * dans l'ordre DOM = l'ordre de lecture de la grille. Conséquence de la grille
 * 6×2 : `ArrowRight` depuis la 6e pastille descend visuellement d'une ligne, et
 * `ArrowDown` avance d'UNE case (pas de six). Aucun roving tabindex nouveau :
 * l'arrêt de tabulation unique reste `tabStop`. Point d'entrée de #702.
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
        // `w-fit` + `grid-cols-6` : les colonnes se dimensionnent sur leur
        // contenu (44 px puis 28 px), jamais sur la largeur disponible — c'est
        // ce qui rend le découpage 6×2 indépendant de la surface (#665).
        //
        // `gap-1.5` en mobile, et non `gap-2` : `w-fit` = `min(max-content,
        // disponible)`. Avec 8 px d'écart, la largeur intrinsèque vaut
        // 6×44 + 5×8 = 304 px, soit 3 px de plus que les 301 px disponibles
        // dans `EventEditForm` à 375 px (MESURÉ) ; les colonnes se compriment
        // alors à 43,5 px et les boutons, eux figés à 44 px, dépassent leur
        // cellule. À 6 px d'écart l'intrinsèque tombe à 294 px : les colonnes
        // valent exactement 44 px sur les TROIS surfaces. Au-delà de `sm`,
        // `sm:gap-2` restitue l'écart de 8 px d'avant #665.
        //
        // CE QUI CHANGE, ET CE QUI NE CHANGE PAS, À DESKTOP — précisé par la
        // review #665, qui a jugé « Desktop inchangé. » trop large pour ne pas
        // finir un jour en argument d'arbitrage :
        //   — la TAILLE est inchangée : pastilles 28×28 (`sm:size-7`), bouton
        //     « Personnalisé » 28 px de haut (`sm:h-7`), écart 8 px
        //     (`sm:gap-2`) ;
        //   — la DISPOSITION change DÉLIBÉRÉMENT : `grid-cols-6` impose 6×2 à
        //     TOUTE largeur, là où le `flex flex-wrap` d'avant rendait 11+1
        //     (`CategoryDrawer`, `ProductDrawer`) et 10+2 (`EventEditForm`) à
        //     1280 px. C'est la correction de #665, pas un effet de bord.
        // Les deux sont mesurées par `sprint-96-palette-geometry.spec.ts`,
        // bloc « #665 — palette, géométrie desktop » (@1280).
        className="grid w-fit grid-cols-6 gap-1.5 sm:gap-2"
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
                // 44×44 en viewport mobile (cible tactile #665), 28×28 au-delà
                // de `sm` — la TAILLE desktop est inchangée (la disposition, elle,
                // passe à 6×2 : cf. le commentaire du `radiogroup` ci-dessus).
                'flex size-11 items-center justify-center rounded-full border transition sm:size-7',
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
                  className="size-5 sm:size-4"
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
            // Hauteur 44 px en mobile (#665) ; la largeur dépasse déjà 44 px
            // partout (libellé + pastille d'aperçu), mesurée 133-153 px.
            'inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition sm:h-7 sm:px-2.5',
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
