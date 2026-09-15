import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './input'

/**
 * Input (shadcn) — bordure/surface adossées aux tokens Graphite via la couche
 * `@theme` (`border-input` → `--color-rule-strong`, `bg-*` → surfaces DS).
 * Le pattern de champ DS complet (label mono + hint/erreur) est illustré dans
 * la story « WithLabel » via les classes `.mt-field` / `.mt-label`.
 */
const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { placeholder: 'Nom du produit' },
}

export const Disabled: Story = {
  args: { placeholder: 'Indisponible', disabled: true },
}

/** Champ DS complet : label mono en capitales + hint (classes `.mt-*`). */
export const WithLabel: Story = {
  render: () => (
    <label className="mt-field" style={{ maxWidth: 280 }}>
      <span className="mt-label">Nom du produit</span>
      <Input placeholder="Assurance auto" />
      <span className="mt-hint">Visible dans la timeline.</span>
    </label>
  ),
}
