import type { Meta, StoryObj } from '@storybook/react-vite'
import { TimelineMobilePortrait } from './TimelineMobilePortrait'
import {
  STORY_LOCALE,
  STORY_TODAY,
  mobileEvents,
  mobileResources,
  withTimelineIntl,
} from './fixtures'

/**
 * #63 / #205 — Vue Timeline mobile PORTRAIT.
 *
 * Montée en usage AUTONOME : `state`/`selection`/`gestures` ne sont pas injectés,
 * le composant s'auto-instancie (les stories n'ont pas de `TimelineResponsive`
 * au-dessus). Les interactions restent réelles : tap sur un bloc → bottom sheet,
 * bouton `⋯` → action sheet, boutons +/- → zoom.
 *
 * Décorateurs : `withTimelineIntl` (provider next-intl, cf. `fixtures.tsx`) +
 * un cadre de largeur mobile (390px ≈ iPhone 14). La largeur du cadre compte :
 * la frise est scrollable horizontalement et la minimap dérive sa fenêtre de
 * `clientWidth`.
 */
const meta = {
  title: 'Timeline/TimelineMobilePortrait',
  component: TimelineMobilePortrait,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    withTimelineIntl,
    (Story) => (
      <div className="bg-bg border-rule w-[390px] overflow-hidden border">
        <Story />
      </div>
    ),
  ],
  args: {
    events: mobileEvents,
    resources: mobileResources,
    locale: STORY_LOCALE,
    today: STORY_TODAY,
  },
} satisfies Meta<typeof TimelineMobilePortrait>

export default meta
type Story = StoryObj<typeof meta>

/** Trois lanes sur deux catégories, statuts expiré / en cours / à venir. */
export const Default: Story = {}

/** Une seule catégorie : vérifie l'en-tête de groupe et la densité minimale. */
export const SingleCategory: Story = {
  args: {
    events: mobileEvents.filter((e) => e.extendedProps.category === 'Boulangerie'),
    resources: mobileResources.filter((r) => r.category === 'Boulangerie'),
  },
}

/**
 * Aucun produit : la frise se réduit à la règle + la minimap vide. Cas réel —
 * l'écran `/timeline` affiche son propre `timeline-empty` AVANT de monter la vue,
 * mais le composant doit rester montable sans données (sous-frise produit).
 */
export const Empty: Story = {
  args: { events: [], resources: [] },
}

/**
 * Câblage édition/suppression : le bouton `⋯` (ou un long-press) ouvre l'action
 * sheet dont les deux entrées deviennent actionnables. Sans ces callbacks, les
 * boutons restent affichés mais inertes.
 */
export const WithActions: Story = {
  args: {
    onEditEvent: (event) => console.info('edit', event.id),
    onDeleteEvent: (event) => console.info('delete', event.id),
  },
}
