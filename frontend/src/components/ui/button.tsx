import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * INVARIANT — aucun variant ne pose d'utilitaire `hover:text-*`.
 *
 * Défaut corrigé (#337 / Sprint 49) : `outline` et `ghost` portaient la paire
 * `hover:bg-accent hover:text-accent-foreground`, c'est-à-dire « encre d'accent
 * SUR fond d'accent ». Les deux moitiés sont des clés `tailwind-merge`
 * DIFFÉRENTES (`bg` vs `text`, même variante `hover`) : un consommateur qui
 * redéfinit le seul fond (`hover:bg-surface`, `hover:bg-transparent`…) écrase
 * une moitié de la paire et conserve l'autre. Le libellé prenait alors la
 * couleur exacte du fond — 1.00:1 en clair, 1.07:1 en sombre, texte invisible.
 * Trois occurrences vivantes : CTA secondaire du hero de la landing, et les
 * boutons « Retour » de `/privacy` et `/terms`.
 *
 * Le couplage ne peut pas être rendu indéformable tant qu'il s'exprime par deux
 * utilitaires indépendants (CSS ne sait pas dériver une encre d'un fond, et
 * `tailwind-merge` ne peut pas fusionner deux propriétés distinctes). On
 * supprime donc la paire : le survol ne change QUE la surface, et seulement
 * vers une teinte douce (`accent-soft`) qui préserve l'encre de repos. Plus de
 * paire, donc plus rien à casser.
 *
 * `accent-soft` / encre de repos est déjà l'appariement de survol du DS
 * (`.mt-select__opt[aria-selected]`) et la convention appliquée à la main par
 * les consommateurs (CompactRail, MobileDrawer, dashboard, ProductsListView,
 * LandingMobileMenu…). Un consommateur qui veut le survol INVERSÉ écrit
 * explicitement les deux moitiés — cf. `HeaderSection.tsx`
 * (`hover:bg-accent hover:text-accent-ink`) — et en assume donc les deux.
 *
 * Garde-fou automatisé : `button.hover-pairing.test.ts`.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent-soft",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent-soft",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
