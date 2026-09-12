import { expect, type Page } from '@playwright/test'

/**
 * #467 — PARADE à la VIRTUALISATION VERTICALE pour les specs qui asservissent une
 * lane SEMÉE de la frise complète (`/fr/timeline`).
 *
 * LE MÉCANISME (mesuré, cf. `docs/memory/sprints/sprint-64/diagnostic-rouge-latent-timeline.md`).
 * La suite E2E sème une catégorie + un produit par spec sur le compte fixe PROD et
 * ne nettoie JAMAIS : le nombre de lanes du compte croît au fil du run (76 mesurées
 * sur le run CI 33563972215, 77 en local #465, 99 sur le run CI 33602246512). Au
 * franchissement de `LANE_VIRTUALIZATION_MIN_ROWS = 60` (`virtualization.ts:80`),
 * `TimelineView.tsx:535-538` remplace `UNBOUNDED_BAND` par la bande MESURÉE : les
 * lanes hors bande ne sont plus MONTÉES DANS LE DOM. L'en-tête de CATÉGORIE
 * (`timeline-group-head`) survit — il est rendu pour tous les groupes — mais la
 * lane produit qu'il coiffe, et donc les pastilles qu'elle porte, n'existent plus.
 * La spec attend alors un nœud INEXISTANT et expire à 30 s. Ce n'est ni un
 * masquage ni un retard : `toHaveCount(1)` ou un timeout allongé n'y changent rien.
 *
 * CE QUE FAIT LA PARADE. On amène la lane semée dans la bande de rendu avant toute
 * assertion, par le seul point d'ancrage TOUJOURS monté : l'en-tête de sa catégorie.
 * `scrollIntoView({ block: 'center' })` défile l'ancêtre défilant réel (la PAGE :
 * `.mt-tlv__scroll` est `overflow-y:hidden`, `timeline.css:127`) ; l'écouteur de
 * `scroll` de `useTimelineViewport` remesure la bande à la frame suivante et la lane
 * se monte. `center` plutôt que `scrollIntoViewIfNeeded()` pour DEUX raisons :
 *   - la lane se retrouve RÉELLEMENT visible, pas seulement dans l'overscan de
 *     320 px — un `resync()` ultérieur (`TimelineView.tsx:638`) recale la bande sur
 *     le visible et démonterait ce qui n'était que dans la marge ;
 *   - elle reste loin de l'en-tête d'application sticky, donc les specs qui
 *     CLIQUENT ensuite la pastille ne récoltent pas un `intercepts pointer events`.
 *
 * OÙ L'APPELER — JUSTE AVANT l'assertion, pas après `goto`. Playwright défile
 * jusqu'à un élément avant de le cliquer : tout clic sur un contrôle situé plus
 * haut (barre de zoom, en-tête d'écran) fait REMONTER la page et re-sort la lane
 * de la bande. Mesuré sur une frise de 71 lanes (compteur de pastilles) : au
 * chargement 0, après parade 1, après un clic `timeline-zoom-out` 0, après parade
 * re-posée 1. Le run complet du 2026-09-02 a d'ailleurs laissé `live-region` rouge
 * avec la parade posée trop tôt — c'est ce contrôle qui l'a tranché.
 *
 * CE QUE LA PARADE NE FAIT PAS. Elle ne borne pas la croissance de la suite : elle
 * rend une lane lisible malgré le fenêtrage, elle n'empêche pas le fenêtrage.
 *
 * ⚠ MISE À JOUR #463 — LE PARAGRAPHE QUI SUIVAIT ÉTAIT PÉRIMÉ. Il annonçait que la
 * réponse de fond (« semis isolé par spec ») était « bloquée par le rate-limit
 * register (5/min/IP) ». Deux fois faux aujourd'hui : le profil `e2e` porte un
 * plafond dédié de 20/min/IP depuis #475, et le job CI `e2e` comme le service
 * `backend-e2e` posent `RATE_LIMIT_ENABLED=false`, qui court-circuite le filtre
 * entier — aucun plafond n'est en vigueur pendant un run.
 *
 * CE QUI A ÉTÉ FAIT À LA PLACE (#463) : le NETTOYAGE post-test
 * (`support/seed-cleanup.ts`), branché sur `seedCategory`/`seedProduct` par une
 * fixture auto. Mesuré sur un run complet : 81 produits visibles + 88 catégories
 * restants sur le compte PROD AVANT, 0 produit visible + 1 catégorie APRÈS. La
 * frise ne franchit donc plus `LANE_VIRTUALIZATION_MIN_ROWS = 60` du fait de la
 * suite elle-même, et ce helper redevient une précaution plutôt qu'une nécessité.
 * Le garder : une spec qui sème 60+ lanes À ELLE SEULE reste possible.
 */
export async function revealSeededLane(
  page: Page,
  opts: { category: string; product?: string },
): Promise<void> {
  const groupHead = page.getByTestId('timeline-group-head').filter({ hasText: opts.category })
  // Ancrage : l'en-tête de catégorie est rendu pour TOUS les groupes, fenêtrage ou
  // non. Son absence signalerait un défaut de seed, pas la virtualisation — on le
  // distingue ici plutôt que de le laisser se déguiser en timeout 30 s plus loin.
  await expect(
    groupHead,
    `l'en-tête de la catégorie semée « ${opts.category} » doit être rendu (seed OK)`,
  ).toHaveCount(1)

  await groupHead.evaluate((el) => {
    el.scrollIntoView({ block: 'center', inline: 'nearest' })
  })

  if (opts.product !== undefined) {
    // Oracle de la parade : la lane est MONTÉE. `toBeVisible()` n'exige pas d'être
    // dans le viewport (Playwright ne teste que boîte non vide + visibilité CSS) —
    // c'est bien le montage qu'on asserte, exactement ce que la virtualisation
    // enlevait. `timeline-resource-title` est porté par les deux vues (desktop
    // `TimelineView.tsx:372`, mobile `TimelineMobilePortrait.tsx:225`).
    await expect(
      page.getByTestId('timeline-resource-title').filter({ hasText: opts.product }),
      `la lane du produit semé « ${opts.product} » doit être montée après défilement`,
    ).toBeVisible()
  }
}
