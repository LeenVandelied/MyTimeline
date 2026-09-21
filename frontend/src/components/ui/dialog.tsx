'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 flex w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col gap-4 border p-6 shadow-lg duration-200 *:shrink-0 sm:rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
      {/*
       * #732/#740 — ANCRE DE LA CROIX, NON DÉFILANTE. Plusieurs consommateurs
       * (`ProductDrawer`, `CategoryDrawer`) posent `overflow-y-auto` sur ce
       * `Content` : il devient le conteneur défilant, et une croix `absolute`
       * directe défilait avec le contenu (y = -123 px à 390×600, formulaire
       * défilé — `e2e/sprint-100-dialog-close-reachable.spec.ts`).
       *
       * L'ancre est une boîte `sticky` de hauteur NULLE :
       *   - `order-first` la place visuellement en tête SANS changer l'ordre DOM :
       *     la croix reste le DERNIER focusable, le focus initial Radix ne bouge pas ;
       *   - `-mb-4` annule le `gap-4` qui la suit : à défilement nul, la géométrie
       *     des enfants est inchangée. Ce n'est possible qu'en FLEX (en grid, une
       *     piste ne descend pas sous 0 et la zone de grille — de hauteur nulle —
       *     serait le bloc conteneur du sticky, qui ne glisserait jamais) ;
       *   - `top-0` et NON `top-6` : le seuil `sticky` se compte depuis le bord de
       *     CONTENU du scrollport (son `p-6` déjà déduit). `top-6` décalait la croix
       *     de 24 px de trop (mesuré : sheet + 41 au lieu de sheet + 16). Avec
       *     `top-0`, l'ancre est déjà à sa position collée à défilement nul (pas de
       *     saut) et reste ensuite à 24 px du haut du dialog ;
       *   - `-top-2 -right-2` sur la croix : 24 − 8 = 16 px, soit l'ancien
       *     `top-4 right-4` (mesuré par `sprint-95-toast-overlap` et
       *     `sprint-100-dialog-close-reachable`) ;
       *   - `z-10` : en flex, `order` modifie aussi l'ordre de peinture — sans
       *     stacking context, un descendant positionné du contenu la recouvrirait.
       */}
      <div className="sticky top-0 z-10 order-first -mb-4 h-0">
        <DialogPrimitive.Close className="bg-background text-muted-foreground hover:bg-accent-soft absolute -top-2 -right-2 flex items-center justify-center rounded-full shadow-xs transition-colors disabled:pointer-events-none max-md:h-11 max-md:w-11">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg leading-none font-semibold tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
