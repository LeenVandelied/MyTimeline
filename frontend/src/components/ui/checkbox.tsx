"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // #352 — tier de bordure FONCTIONNEL. À l'état décoché, le contour EST le
      // contrôle (aucun remplissage ne le distingue de la surface) : le DS impose
      // `--color-rule-emphasis` pour ce cas (`ds/readme.md` § Border tiers). On
      // quitte `border-primary` (encre pure, 17.32:1), qui violait la hiérarchie
      // « bordure plus discrète que le texte » ; `rule-emphasis` reste au-dessus
      // du seuil WCAG 1.4.11 (≥3:1). L'état coché n'est pas concerné : il est
      // peint en aplat par `data-[state=checked]:bg-primary`. Le spécimen DS
      // correspondant est `.mt-check__box` (`ds/components/core.css`), aligné sur
      // le même tier.
      "peer h-4 w-4 shrink-0 rounded-xs border border-rule-emphasis shadow-sm disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
