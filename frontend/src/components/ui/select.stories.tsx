import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

/**
 * Select (Radix) — trigger/menu adossés aux tokens Graphite via `@theme`
 * (`border-input`, `bg-popover` → tokens DS ; focus = contour `:focus-visible`
 * du DS depuis #383, plus d'anneau local). Navigation
 * clavier native Radix. Rendu en portail (le menu apparaît hors du canvas).
 */
const meta = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 240 }}>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="vehicles">Véhicules</SelectItem>
          <SelectItem value="insurance">Assurance</SelectItem>
          <SelectItem value="food">Alimentation</SelectItem>
          <SelectItem value="medical">Médical</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <label className="mt-field" style={{ maxWidth: 240 }}>
      <span className="mt-label">Catégorie</span>
      <Select defaultValue="insurance">
        <SelectTrigger>
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="vehicles">Véhicules</SelectItem>
          <SelectItem value="insurance">Assurance</SelectItem>
          <SelectItem value="food">Alimentation</SelectItem>
          <SelectItem value="medical">Médical</SelectItem>
        </SelectContent>
      </Select>
    </label>
  ),
}
