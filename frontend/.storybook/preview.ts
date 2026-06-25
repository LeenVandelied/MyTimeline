import type { Preview } from '@storybook/react'
import '../src/styles/globals.css'

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
