import type { Meta, StoryObj } from '@storybook/react'
import { Tabs } from './tabs'

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    'aria-label': 'Vues',
    items: [
      { value: 'timeline', label: 'Timeline' },
      { value: 'list', label: 'Liste' },
      { value: 'calendar', label: 'Calendrier' },
    ],
    defaultValue: 'timeline',
  },
}
