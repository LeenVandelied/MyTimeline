import type { Meta, StoryObj } from '@storybook/react-vite'
import { TimelineMobileLandscape } from './TimelineMobileLandscape'
import {
  STORY_LOCALE,
  STORY_TODAY,
  mobileEvents,
  mobileResources,
  withTimelineIntl,
} from './fixtures'

/**
 * #64 / #205 — Vue Timeline mobile PAYSAGE.
 *
 * Même état et mêmes gestes que la variante portrait (hooks partagés) ; seules
 * changent la DISPOSITION (lanes denses, `.mt-tlm--landscape`), le détail
 * (drawer latéral droit au lieu du bottom sheet) et la minimap MASQUABLE.
 *
 * Montée en usage autonome (auto-instanciation de l'état). Le cadre du décorateur
 * reproduit un mobile retourné (844 × 390 ≈ iPhone 14 paysage) : la HAUTEUR est
 * signifiante — c'est elle qui, en conditions réelles, décide via
 * `TimelineResponsive` si la minimap est forcée masquée (`max-height: 400px`).
 * Ici le forçage est piloté explicitement par la prop `minimapForcedHidden`,
 * puisque aucune media query n'est évaluée hors du wrapper responsive.
 */
const meta = {
  title: 'Timeline/TimelineMobileLandscape',
  component: TimelineMobileLandscape,
  tags: ['autodocs'],
  decorators: [
    withTimelineIntl,
    (Story) => (
      <div className="bg-bg border-rule h-[390px] w-[844px] overflow-hidden border">
        <Story />
      </div>
    ),
  ],
  args: {
    events: mobileEvents,
    resources: mobileResources,
    locale: STORY_LOCALE,
    today: STORY_TODAY,
    minimapForcedHidden: false,
  },
} satisfies Meta<typeof TimelineMobileLandscape>

export default meta
type Story = StoryObj<typeof meta>

/** Minimap visible et togglable (`aria-pressed=true`). */
export const Default: Story = {}

/**
 * Hauteur disponible sous le seuil (~400px) : `TimelineResponsive` force le
 * masquage et NEUTRALISE le toggle (`disabled`) — la contrainte d'espace prime
 * sur la préférence utilisateur. Le cadre est volontairement plus court.
 */
export const MinimapForcedHidden: Story = {
  args: { minimapForcedHidden: true },
  // NB : Storybook COMPOSE les décorateurs (meta puis story), il ne les remplace
  // pas. Ce cadre 320px s'ajoute donc DANS celui de 390px déclaré sur le meta —
  // double wrapper volontaire ; `withTimelineIntl` reste appliqué.
  decorators: [
    (Story) => (
      <div className="bg-bg border-rule h-[320px] w-[844px] overflow-hidden border">
        <Story />
      </div>
    ),
  ],
}

/** Une seule catégorie : lanes denses sans en-têtes multiples. */
export const SingleCategory: Story = {
  args: {
    events: mobileEvents.filter((e) => e.extendedProps.category === 'Produits frais'),
    resources: mobileResources.filter((r) => r.category === 'Produits frais'),
  },
}

/** Câblage édition/suppression depuis l'action sheet (parité avec le portrait). */
export const WithActions: Story = {
  args: {
    onEditEvent: (event) => console.info('edit', event.id),
    onDeleteEvent: (event) => console.info('delete', event.id),
  },
}
