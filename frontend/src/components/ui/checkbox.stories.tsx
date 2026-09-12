import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './checkbox'

/**
 * Checkbox (Radix) — adossée aux tokens Graphite via `@theme` : `bg-primary`
 * une fois cochée, bordure `border-rule-emphasis` au repos (tier FONCTIONNEL
 * ≥3:1, #352 Sprint 58 — ce n'est plus `border-primary`).
 *
 * Le focus n'est PLUS porté par un `ring-*` local : depuis #383 (Sprint 58) le
 * contour `:focus-visible` du DS est l'unique indicateur de focus de
 * l'application. Voir `styles/ds/a11y-audit.md` §8.
 */
const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = { args: { defaultChecked: true } }

export const Disabled: Story = { args: { disabled: true } }

export const WithLabel: Story = {
  render: () => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <Checkbox defaultChecked />
      <span style={{ fontSize: 14 }}>Rappel avant échéance</span>
    </label>
  ),
}
