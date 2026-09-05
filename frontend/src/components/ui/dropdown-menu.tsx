"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * APPARIEMENT FOND/ENCRE À LA PRISE DE FOCUS — invariant du DS (Sprint 52, #346).
 *
 * Les items posaient `focus:bg-accent focus:text-accent-foreground`. Les deux
 * moitiés vivent dans des clés `tailwind-merge` DIFFÉRENTES (`bg` vs `text`) :
 * un consommateur qui ne redéfinit que le fond (`className="focus:bg-autre"`)
 * garde l'encre de l'accent et rend le libellé de la couleur exacte du fond.
 * C'est le défaut mesuré à 1.00:1 sur les CTA de la landing au Sprint 49
 * (`24f44a3`), transposé à `focus:`. Radix focalise l'item au `pointermove` :
 * ici `focus:` est l'état de SURVOL effectif, pas un cas clavier marginal.
 *
 * INVARIANT POSÉ : le focus ne change que la SURFACE (`focus:bg-accent-soft`,
 * le seul tint de la palette prévu pour un aplat de fond). L'encre de repos
 * reste en place, donc il n'y a plus de paire à casser à moitié.
 *
 * POURQUOI `text-popover-foreground` EST POSÉ SUR L'ITEM et pas seulement sur
 * le `Content` — MESURÉ AU NAVIGATEUR, pas déduit. `DropdownMenuContent` porte
 * déjà `text-popover-foreground`, mais c'est une valeur HÉRITÉE : un item
 * enveloppé dans un `<Link>` hérite en réalité du `color` de l'élément `<a>`,
 * soit `--color-accent`. ⚠ L'exemple d'origine (`language-selector.tsx`) N'EST
 * PLUS un cas vivant depuis #342 (Sprint 74) : l'imbrication y a été inversée en
 * `<DropdownMenuItem asChild><Link/></DropdownMenuItem>`, l'ancre EST l'item et
 * porte l'utilitaire. Le mode d'échec décrit reste possible pour tout appelant
 * qui envelopperait un item — c'est bien ce contre quoi l'utilitaire protège. Sur
 * `accent-soft`, cette encre-là mesurait **3.83:1 en thème clair** — sous les
 * 4.5:1 de WCAG 1.4.3 AA, exactement le ratio du défaut du Sprint 49.
 * ⚠ CE RATIO EST HISTORIQUE : le couple `accent` / `accent-soft` a été porté à
 * **4.94:1 en clair** au FU1 du Sprint 57 (`--color-accent` descendu de
 * `blue-500` à `blue-600` dans `styles/ds/tokens/colors.css`), donc l'encre
 * héritée ne serait plus fautive aujourd'hui. La raison de poser l'utilitaire
 * TIENT QUAND MÊME, et c'est pour cela qu'elle n'est pas retirée : elle rend
 * l'encre indépendante de l'appelant, ce qu'aucun réglage de token ne fait. Poser
 * l'encre EN UTILITAIRE sur l'item la rend indépendante de ce que l'appelant
 * enveloppe autour ; un consommateur qui veut une autre encre l'écrit
 * lui-même et `tailwind-merge` la lui donne (même clé `text`).
 *
 * PLAN D'EMPILEMENT (Sprint 63, #446 — voir `ADR-008`).
 *
 * `DropdownMenuContent` et `DropdownMenuSubContent` passent de `z-50` au palier
 * PARTAGÉ `--z-popover-over-modal` (75), avec `ui/select.tsx` et `ui/popover.tsx`
 * — mêmes overlays Radix portalisés dans `body`.
 *
 * ⚠ HONNÊTETÉ SUR LE PÉRIMÈTRE : contrairement au `Select` de `NewEventDrawer`,
 * AUCUN défaut n'a été mesuré ici. Le seul consommateur (`language-selector.tsx`)
 * vit dans `MobileDrawer` et `LandingMobileMenu`, deux panneaux `z-50` rendus EN
 * LIGNE : le portail, ajouté plus tard dans `body`, gagnait DÉJÀ par l'ordre du
 * DOM, à `z` égal. C'est exactement le mécanisme qui a fait passer `ProductDrawer`
 * et `DeleteConfirmDialog` à travers le défaut de #414 — une chance, pas un
 * invariant. Le passage à 75 conserve le comportement observé ET le rend
 * indépendant de l'ordre du DOM : le jour où un `DropdownMenu` est posé dans un
 * `.mt-drawer` (`--z-modal` = 70, rendu en ligne), il n'aurait plus été peint.
 *
 * CE QUI RESTE VOLONTAIREMENT APPARIÉ, hors périmètre de #346 :
 *  - `data-[variant=destructive]:focus:*` (surface `destructive/10`, encre
 *    `destructive`) : la surface est un voile à 10 %, l'encre n'y prend jamais
 *    la couleur du fond ;
 *  - `data-[state=open]:bg-accent` + `data-[state=open]:text-accent-foreground`
 *    du sous-menu : c'est la paire sanctionnée du DS (encre prévue POUR
 *    l'accent, sur l'accent), la seule dont le ratio ait été mesuré.
 *
 * Garde-fou : `components/landing/landing.hover-pairing.test.ts` (scan AST de
 * `components/landing/` + `components/ui/`, préfixes `hover:` et `focus:`).
 *
 * ⚠ CONSOMMATEUR À SURVEILLER : tout appelant qui pose lui-même une encre fixe
 * sur un item doit AUSSI reprendre la main sur la surface au focus, sinon son
 * encre se retrouve sur `accent-soft`. Ce n'est pas théorique :
 * `ui/language-selector.tsx` (item de locale active, encre `accent-ink`) est
 * tombé à 1.23:1 en clair / 1.28:1 en sombre dès ce changement livré, sur la
 * landing PUBLIQUE. Corrigé depuis par `focus:bg-accent-hover` posé côté
 * appelant — voir l'en-tête de ce fichier-là pour les ratios mesurés.
 *
 * ⚠ LE GARDE-FOU AST NE COUVRE PAS CE CAS. Il raisonne par `className` ; ici la
 * surface (`focus:bg-accent-soft`, ce fichier) et l'encre (`text-accent-ink`,
 * l'appelant) vivent dans deux fichiers, donc dans deux `className` distincts.
 * Aucune analyse statique par attribut ne peut les rapprocher. Le seul filet sur
 * ce couplage-là est la mesure au navigateur (`e2e/landing-mobile-menu.spec.ts`).
 */

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[var(--z-popover-over-modal)] max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "text-popover-foreground focus:bg-accent-soft data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "text-popover-foreground focus:bg-accent-soft relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "text-popover-foreground focus:bg-accent-soft relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "text-popover-foreground focus:bg-accent-soft data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm select-none data-[inset]:pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[var(--z-popover-over-modal)] min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
