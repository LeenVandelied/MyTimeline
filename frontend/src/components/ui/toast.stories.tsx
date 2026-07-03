import type { Meta, StoryObj } from '@storybook/react'
import { Toast } from './toast'

const meta = {
  title: 'UI/Toast',
  component: Toast,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['info', 'success', 'warning', 'danger'],
    },
  },
} satisfies Meta<typeof Toast>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Produit ajouté',
    message: 'Assurance auto apparaît maintenant dans la timeline.',
  },
}

export const AllVariants: Story = {
  args: { title: 'Notification' },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Toast variant="info" title="Info" message="Sauvegarde automatique activée." />
      <Toast variant="success" title="Enregistré" message="Vos modifications sont sauvegardées." />
      <Toast variant="warning" title="Bientôt expiré" message="Renouvellement dans 3 jours." />
      <Toast variant="danger" title="Échec" message="Impossible de contacter le serveur." />
    </div>
  ),
}
