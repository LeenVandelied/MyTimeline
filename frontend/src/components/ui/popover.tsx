"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

/**
 * PLAN D'EMPILEMENT (Sprint 63, #446 — voir `ADR-008`).
 *
 * `PopoverContent` portait `z-50` (`--z-popover`), le palier des popovers rendus
 * DANS LE FLUX. Or ce contenu est PORTALISÉ dans `body` et son consommateur
 * principal — `PopoverPicker` (sélecteur de couleur) — vit dans `EventEditForm`,
 * lui-même rendu dans `NewEventDrawer` (`.mt-drawer` / `.mt-sheet`, `--z-modal`
 * = 70, rendus EN LIGNE donc insensibles à l'ordre du DOM). MÊME EXPOSITION que
 * `ui/select.tsx`, corrigée dans la même passe : le palier partagé
 * `--z-popover-over-modal` (75) le place au-dessus des drawers/sheets/modales et
 * sous `--z-netbanner` (80).
 *
 * Radix propage cette valeur : `react-popper` recopie le `z-index` CALCULÉ du
 * contenu sur son enveloppe `position:fixed`. Ce `z-index` n'a donc PAS besoin
 * d'un `position` sur `PopoverContent` lui-même — ne pas « corriger » son absence.
 */
const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    {/* `outline-hidden` ci-dessous = SEULE exception du dépôt au contour de focus
        du DS (#383, Sprint 58) : un PANNEAU n'est pas un CONTRÔLE. Radix pose
        `tabIndex=-1` sur le contenu et lui donne le focus à l'ouverture ; le
        contour marquerait alors le conteneur entier, pas la cible que
        l'utilisateur pilote. Les 31 AUTRES sites applicatifs ont été nettoyés de
        leurs `outline-*` et héritent du contour unique. `outline-hidden` et
        jamais `outline-none` : lui seul émet le repli `forced-colors: active`.
        Modèle du commentaire : `ds/tokens/base.css` (bloc `:focus-visible`). */}
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-[var(--z-popover-over-modal)] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
