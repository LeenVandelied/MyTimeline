import type { Preview } from '@storybook/react-vite'
import '../src/styles/globals.css'
// Classes composants DS « Graphite » (.mt-*) — chargées UNIQUEMENT en Storybook.
// `globals.css` (app runtime) reste volontairement lean (décision #45 : ne charge
// pas core.css). Les stories/composants core du DS consomment ces classes ici.
import '../src/styles/ds/components/core.css'

/**
 * Preview global Storybook — importe les styles Tailwind 4 / DS « Graphite »
 * pour que les composants s'affichent avec leurs tokens.
 */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
