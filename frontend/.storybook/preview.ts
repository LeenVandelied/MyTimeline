import type { Preview } from '@storybook/react-vite'

import { archivo, ibmPlexMono } from '../app/fonts'
import '../src/styles/globals.css'

/**
 * Preview global Storybook — reproduit le SHELL de l'application autour de chaque
 * story. Sans lui, le preview n'est pas un miroir du produit : il rendait les 80
 * stories en thème CLAIR et en police SYSTÈME, quoi qu'en dise le DS.
 *
 * `globals.css` importe déjà `ds/components/core.css` (cf. son en-tête, L26) :
 * l'import séparé qui figurait ici était un doublon, et son commentaire
 * (« core.css n'est pas chargé par globals.css, scope #45 ») était PÉRIMÉ depuis
 * #55 — il a essaimé jusque dans le context-pack frontend. Supprimé.
 *
 * #191 — DEUX MANQUES STRUCTURELS comblés ici (mesurés, cf. issue-191-done.md) :
 *
 * 1. THÈME. Aucun mécanisme de bascule n'existait : ni `globalTypes`, ni
 *    décorateur, ni `@storybook/addon-themes` (absent du package.json). Or le
 *    sombre du DS s'exprime par `.dark` / `[data-theme="dark"]` sur un ANCÊTRE
 *    (`ds/tokens/colors.css:123`, `globals.css:34`). Sur `<html>` du preview :
 *    `class=""`, `data-theme=null` → le sombre était structurellement
 *    inatteignable, et les deux premiers critères de #191 avec lui.
 *
 * 2. POLICES. `--font-display`, `--font-ui` et `--font-mono` résolvaient tous
 *    trois à la CHAÎNE VIDE : `base.css` pose `font-family: var(--font-ui)` sur
 *    `body`, qui retombait donc sur `ui-sans-serif, system-ui`. Toutes les
 *    stories — y compris `.mt-label`, censée être en IBM Plex Mono capitales —
 *    étaient rendues en police système. Une revue visuelle d'un DS dont la
 *    charte est typographique ne veut rien dire dans la mauvaise fonte.
 *
 * On applique les deux sur `document.documentElement`, PAS sur un `<div>`
 * enveloppant : c'est là que l'application les pose (`app/[locale]/layout.tsx`
 * L49-56), et c'est la seule façon que le FOND DE PAGE du preview (`body`,
 * `background: var(--color-bg)`) bascule lui aussi. Un wrapper laisserait la
 * story sombre sur un fond de page clair — une revue « sombre » mensongère.
 *
 * ⚠ `--font-ui` n'est PAS produit par `app/fonts.ts` (qui n'expose que
 * `--font-display` et `--font-mono`) : l'application le dérive par un style
 * inline `--font-ui: var(--font-display)` sur `<html>`. On reproduit ce dérivé
 * à l'identique — s'en écarter ferait diverger le preview du produit.
 */
type ThemeName = 'light' | 'dark'

/** Classes de variables de police next/font, telles que posées sur `<html>`. */
const FONT_VARIABLE_CLASSES = [archivo.variable, ibmPlexMono.variable].filter(Boolean)

/**
 * Shell appliqué à `<html>` du preview. Idempotent : le décorateur le rejoue à
 * chaque rendu (changement de story ou de global) sans accumuler d'état.
 */
function applyPreviewShell(theme: ThemeName): void {
  const root = document.documentElement

  // Polices — mêmes classes de variables que `fontVariables`, même dérivé `--font-ui`.
  root.classList.add(...FONT_VARIABLE_CLASSES)
  root.style.setProperty('--font-ui', 'var(--font-display)')

  // Thème — `.dark` pilote `@custom-variant dark`, `data-theme` en miroir (comme
  // next-themes en production) ; `color-scheme` aligne les contrôles natifs.
  const isDark = theme === 'dark'
  root.classList.toggle('dark', isDark)
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
}

const preview: Preview = {
  /**
   * Bascule de thème dans la barre d'outils Storybook. Elle est aussi pilotable
   * par URL — `?globals=theme:dark` sur `/iframe.html` — ce dont la vague #294
   * (captures de référence Playwright) a besoin pour graver ses deux thèmes sans
   * injecter de classe à la main.
   */
  globalTypes: {
    theme: {
      description: 'Thème du design system « Graphite »',
      toolbar: {
        title: 'Thème',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Clair', icon: 'sun' },
          { value: 'dark', title: 'Sombre', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    theme: 'light',
  },

  decorators: [
    (Story, context) => {
      const theme: ThemeName = context.globals.theme === 'dark' ? 'dark' : 'light'
      applyPreviewShell(theme)
      return Story()
    },
  ],

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
