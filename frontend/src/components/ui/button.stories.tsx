import type { Meta, StoryObj } from '@storybook/react'
import { Plus } from 'lucide-react'
import { Button } from './button'

/**
 * Button (shadcn/cva) — les variantes mappent les tokens Graphite via la couche
 * de compat `@theme` de `globals.css` (`bg-primary` → `--color-primary`, etc.).
 * Aucune couleur hex en dur : tout passe par les utilitaires Tailwind adossés
 * aux tokens DS. Story de référence (#29 → #46) pour la convention colocalisée.
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'Bouton', variant: 'default', size: 'default' },
}

export const Secondary: Story = {
  args: { children: 'Secondaire', variant: 'secondary' },
}

export const Outline: Story = {
  args: { children: 'Contour', variant: 'outline' },
}

export const Ghost: Story = {
  args: { children: 'Fantôme', variant: 'ghost' },
}

export const Link: Story = {
  args: { children: 'Lien', variant: 'link' },
}

export const Destructive: Story = {
  args: { children: 'Supprimer', variant: 'destructive' },
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus /> Nouveau produit
      </>
    ),
  },
}

export const Disabled: Story = {
  args: { children: 'Indisponible', disabled: true },
}

/** Toutes les variantes × tailles côte à côte. */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'] as const).map(
        (variant) => (
          <div key={variant} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button variant={variant} size="sm">
              sm
            </Button>
            <Button variant={variant} size="default">
              {variant}
            </Button>
            <Button variant={variant} size="lg">
              lg
            </Button>
          </div>
        ),
      )}
    </div>
  ),
}
