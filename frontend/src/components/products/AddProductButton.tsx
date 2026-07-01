'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { PlusCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ProductDrawer } from './ProductDrawer'

/**
 * #61 — Déclencheur du `ProductDrawer` en mode création.
 *
 * Remplace l'ancien `AddProducts.tsx` (qui embarquait son propre bouton +
 * Dialog). Le drawer est désormais un composant contrôlé ; ce wrapper conserve
 * l'API historique du call-site dashboard (`onProductAdded`) et le bouton
 * d'ouverture stylé (accent Graphite).
 */
export interface AddProductButtonProps {
  onProductAdded?: () => void
}

export default function AddProductButton({ onProductAdded }: AddProductButtonProps) {
  const t = useTranslations('products')
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        variant="outline"
        className="bg-accent hover:bg-accent-hover text-accent-ink flex items-center gap-2 border-none"
        onClick={() => setOpen(true)}
      >
        <PlusCircle size={16} />
        <span>{t('drawer.createTitle')}</span>
      </Button>

      <ProductDrawer open={open} onOpenChange={setOpen} mode="create" onSuccess={onProductAdded} />
    </>
  )
}
