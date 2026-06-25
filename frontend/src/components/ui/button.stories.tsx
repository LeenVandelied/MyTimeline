import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

/**
 * Story smoke (#29) — prouve que Storybook compile un composant réel du DS
 * (Tailwind 4 + cva + Radix Slot). Sert de gabarit pour les futures stories.
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
  args: {
    children: 'Bouton',
    variant: 'default',
    size: 'default',
  },
}

export const Destructive: Story = {
  args: {
    children: 'Supprimer',
    variant: 'destructive',
  },
}
