import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'
import { Button } from './button'

/**
 * Dialog (Radix) — overlay/surface adossés aux tokens Graphite via `@theme`.
 * Piège focus + Escape gérés par Radix. Rendu en portail.
 */
const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Nouveau produit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau produit</DialogTitle>
          <DialogDescription>Ajoutez un produit et ses événements à la timeline.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost">Annuler</Button>
          <Button>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}
