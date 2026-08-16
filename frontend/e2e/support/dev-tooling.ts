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
