import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table } from './table'

const meta = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Table aria-label="Événements à venir">
      <thead>
        <tr>
          <th scope="col">Produit</th>
          <th scope="col">Événement</th>
          <th scope="col">Échéance</th>
          <th scope="col" className="mt-table__num">
            Jours
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Assurance auto</td>
          <td>Renouvellement</td>
          <td className="mono">2026-05-14</td>
          <td className="mt-table__num">14</td>
        </tr>
        <tr>
          <td>Passeport</td>
          <td>Expiration</td>
          <td className="mono">2026-08-02</td>
          <td className="mt-table__num">94</td>
        </tr>
        <tr>
          <td>Extincteur</td>
          <td>Contrôle</td>
          <td className="mono">2026-11-30</td>
          <td className="mt-table__num">214</td>
        </tr>
      </tbody>
    </Table>
  ),
}
