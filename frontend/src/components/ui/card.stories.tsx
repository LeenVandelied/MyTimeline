import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
import { Button } from './button'

/**
 * Card (shadcn) — surface/bordure/rayon adossés aux tokens Graphite via `@theme`
 * (`bg-card` → surface, `border` → rule). Le DS privilégie les filets 1px et les
 * rayons ≤ 10px, sans ombre lourde.
 */
const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card style={{ maxWidth: 360 }}>
      <CardHeader>
        <CardTitle>Assurance auto</CardTitle>
        <CardDescription>Renouvellement → 14 mai, chaque année.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: 14, margin: 0 }}>3 événements à venir dans les 90 prochains jours.</p>
      </CardContent>
      <CardFooter style={{ gap: 10 }}>
        <Button size="sm">Ouvrir</Button>
        <Button size="sm" variant="ghost">
          Archiver
        </Button>
      </CardFooter>
    </Card>
  ),
}
