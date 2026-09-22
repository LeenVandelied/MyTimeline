import React, { useCallback } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export const PopoverPicker = ({
  color,
  onChange,
  isOpen,
  onToggle,
  disabled = false,
  children,
}: {
  color: string
  onChange: (color: string) => void
  isOpen: boolean
  onToggle?: (isOpen: boolean) => void
  /**
   * #230 — Déclencheur inerte. Le trigger est un `<div>`, pas un contrôle de
   * formulaire : ni l'attribut `disabled` ni un `<fieldset disabled>` ancêtre ne
   * l'atteignent. On coupe donc l'ouverture À LA SOURCE (`open` forcé à false,
   * `onOpenChange` neutralisé) plutôt que de le masquer visuellement seulement.
   * `aria-disabled` (et non `disabled`) : l'élément reste dans l'arbre a11y avec
   * son état annoncé, comme les autres champs verrouillés du formulaire.
   */
  disabled?: boolean
  /**
   * #577 — Déclencheur fourni par l'appelant (rendu via `asChild`), en remplacement
   * du carré `<div>` par défaut. Sert au bouton « Personnalisé » de
   * `PaletteColorPicker` : un VRAI `<button>` (focusable, nom accessible, état
   * `aria-pressed`) là où le `<div>` historique n'est atteignable qu'à la souris.
   * Absent → rendu historique inchangé.
   */
  children?: React.ReactElement
}) => {
  const handlePickerMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleColorChange = useCallback(
    (newColor: string) => {
      onChange(newColor)
    },
    [onChange],
  )

  return (
    <Popover open={disabled ? false : isOpen} onOpenChange={disabled ? undefined : onToggle}>
      <PopoverTrigger asChild disabled={disabled}>
        {children ?? (
          <div
            className={
              disabled
                ? 'h-6 w-6 cursor-not-allowed rounded-lg border border-white opacity-60'
                : 'h-6 w-6 cursor-pointer rounded-lg border border-white'
            }
            aria-disabled={disabled || undefined}
            style={{ backgroundColor: color }}
            onMouseDown={disabled ? undefined : handlePickerMouseDown}
          />
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border-none bg-transparent p-0 shadow-none"
        onMouseDown={handlePickerMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div onMouseDown={handlePickerMouseDown}>
          <HexColorPicker color={color} onChange={handleColorChange} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
