import type { Page } from '@playwright/test'

/**
 * OUTILLAGE DE DÉVELOPPEMENT À EXCLURE DE TOUT BALAYAGE DOM — SOURCE UNIQUE.
 *
 * POURQUOI CE FICHIER EXISTE. La liste vivait en double, dupliquée entre
 * `landing-mobile-overflow.spec.ts` (2 sélecteurs, en dur dans le
 * `page.evaluate`) et `landing-typography-hierarchy.spec.ts` (3 sélecteurs),
 * avec un commentaire affirmant « même liste » — ce qui était FAUX au moment
 * même où il a été écrit (`#__next-build-watcher` ne figurait que d'un côté).
 * Deux balayages censés ignorer le même bruit l'ignoraient différemment, et
 * rien ne le signalait : une liste dupliquée diverge en silence. Relevé en
 * review du Sprint 59.
 *
 * CE QUE CES SÉLECTEURS DÉSIGNENT, ET POURQUOI L'EXCLUSION EST LÉGITIME.
 * Les trois n'existent QUE sous `NODE_ENV === 'development'` et sont absents du
 * bundle de production — or la CI e2e tourne sur `next dev`
 * (`ci.yml:273` + `playwright.config.ts:47`), donc ils sont bien présents dans
 * le DOM mesuré :
 *   · `.tsqd-parent-container` — bouton flottant des TanStack Query Devtools,
 *     monté par `src/contexts/QueryProvider.tsx`. C'est LUI que #341 avait pris
 *     pour un débordement applicatif : son logo (4 `<g>`) finit à x = 384 pour
 *     un viewport de 375 px, et le décalage suit la largeur du viewport
 *     (329@320, 384@375, 399@390) — un faux positif qui ressemble trait pour
 *     trait à un vrai défaut ;
 *   · `nextjs-portal` — overlay d'erreurs / indicateur de dev de Next.js ;
 *   · `#__next-build-watcher` — indicateur de compilation de Next.js.
 *
 * ⚠ SEULE l'exclusion d'outillage de DÉVELOPPEMENT est légitime dans ces
 * balayages. Ne PAS y ajouter de sélecteur applicatif « pour faire passer le
 * test » : une exclusion de zone applicative transforme un verrou en décor
 * (c'est exactement ce que l'exclusion du `<footer>` avait produit, retirée en
 * soldant l'AC #2 de #348).
 *
 * ⚠ USAGE. Les sélecteurs sont pensés pour `el.closest(sel)`, qui teste AUSSI
 * l'élément lui-même : `closest('nextjs-portal')` couvre le `<nextjs-portal>`
 * autant que ses descendants. Inutile de doubler par un test sur `tagName`.
 */
export const DEV_TOOLING = [
  '.tsqd-parent-container',
  'nextjs-portal',
  '#__next-build-watcher',
] as const

/** Forme sérialisable pour `page.evaluate` (un `readonly string[]` ne passe pas tel quel). */
export const devToolingSelectors = (): string[] => [...DEV_TOOLING]

/**
 * Neutralise l'outillage de dev pour les INTERACTIONS — et pour elles seules.
 *
 * POURQUOI. `DEV_TOOLING` était jusqu'ici exclu de la MESURE uniquement. Or le
 * bouton flottant des TanStack Query Devtools est aussi un OBSTACLE AU CLIC :
 * mesuré au Sprint 63, un `click()` sur `event-drawer-edit` a été intercepté
 * 42 fois d'affilée par `<circle> … from <div class="tsqd-parent-container">`,
 * jusqu'à expiration. Comme la CI e2e tourne sur `next dev` (cf. en-tête de ce
 * fichier), le risque est RÉEL en CI, pas seulement en local — et il est
 * position-dépendant, donc il se manifeste par un flake d'apparence aléatoire
 * sur une largeur ou une locale au hasard.
 *
 * CE QUE ÇA NE FAIT PAS. `pointer-events: none` ne masque rien et ne démonte
 * rien : les éléments restent dans le DOM, gardent leur `getBoundingClientRect`
 * et restent donc soumis à l'exclusion de mesure existante (`closest(sel)`),
 * qui continue de s'exercer telle quelle. Aucun verrou n'est desserré : on
 * retire un meuble du SERVEUR DE DEV du chemin de clic, pas une zone
 * applicative. Cf. l'avertissement ci-dessus — n'y ajoutez aucun sélecteur
 * applicatif.
 *
 * `addInitScript` s'applique à CHAQUE navigation de la page : un seul appel en
 * tête de test couvre toutes les `goto` suivantes.
 */
export async function neutralizeDevToolingPointerEvents(page: Page): Promise<void> {
  await page.addInitScript((selectors: string[]) => {
    const STYLE_ID = 'e2e-dev-tooling-neutralizer'
    const inject = () => {
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `${selectors.join(',')}{pointer-events:none !important;}`
      document.head?.appendChild(style)
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject, { once: true })
    } else {
      inject()
    }
  }, [...DEV_TOOLING])
}
