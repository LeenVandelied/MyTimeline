import { expect, type Locator } from '@playwright/test'

/**
 * #768 (Sprint 112) — MESURE DES CIBLES TACTILES 44 px (WCAG 2.5.5), en UN seul
 * exemplaire. Ces fonctions vivaient recopiées dans `sprint-99`, `sprint-101` et
 * `sprint-102-touch-targets.spec.ts` ; les copies avaient déjà divergé, et #763 a dû
 * corriger le sélecteur dans une seule d'entre elles. Toute nouvelle spec de cibles
 * tactiles (#767, #830…) importe ce module au lieu d'écrire une 4e copie.
 *
 * ORACLE : la boîte RENDUE (`getBoundingClientRect`), jamais la classe lue ni
 * `toHaveCSS` (une classe DÉCLARE, elle ne prouve rien). La liste des contrôles est
 * construite par REQUÊTE DOM (PAT-S99-001), pas par testids écrits à la main : un
 * futur contrôle non conforme ajouté sous la racine fait rougir la spec sans qu'on
 * ait à penser à l'y inscrire. `expectAllTouchable` exige un nombre MINIMAL de
 * contrôles mesurés : une requête qui ne trouverait rien serait verte.
 *
 * DEUX PROFILS DE MESURE, choisis par options (défaut = profil complet) :
 *  - COMPLET (défaut, `sprint-101`/`sprint-102`, et toute spec neuve) : exempte
 *    `[aria-hidden="true"]` (select « bulle » de Radix Select dans un `<form>`,
 *    poignée `<span aria-hidden>` de l'action sheet), compte la hitbox `::before`
 *    (`TOUCH_TARGET_HITBOX`, `src/lib/touchTarget.ts`) comme taille effective, et
 *    tient pour invisible un contrôle à `opacity: 0` ou `display: none` ;
 *  - BOÎTE SEULE (`sprint-99`, historique #738) : aucune de ces trois règles. Garder
 *    ce profil sur les réglages est un choix de NON-RÉGRESSION de la factorisation
 *    (#768 ne devait rien changer à ce que mesure chaque spec), pas une préférence :
 *    aligner `sprint-99` sur le profil complet est une décision à part.
 *  Les trois règles sont des options INDÉPENDANTES plutôt qu'un seul drapeau pour
 *  qu'une spec qui n'en veut qu'une le dise, sans hériter des deux autres.
 *
 * EXEMPTIONS COMMUNES (les deux profils) : `sr-only` (input file de l'avatar, jamais
 * ciblé au doigt) et poignées `*-grabber` des bottom sheets (28 px VOULUS, WCAG 2.5.8
 * « Equivalent » : croix 44×44 + Escape — DEC-S99-002 / #739).
 *
 * INTERRUPTEURS (#763) : le sélecteur nomme `[role="switch"]`, `[role="checkbox"]` et
 * `label.mt-switch`. L'`<input>` de `ui/switch.tsx` est à 0×0 et opacité 0 (filtré
 * comme invisible) : la cible peinte est son label, sans rôle — sans cette entrée,
 * toute spec serait verte PAR OMISSION sur un interrupteur (PIT-S101-003). La sonde
 * permanente de `sprint-99-touch-targets.spec.ts` injecte un interrupteur de taille
 * FIXE (style inline, indépendant du CSS de production) et vérifie qu'il est vu ET
 * signalé.
 *
 * ZONES DENSES À PSEUDO-HITBOX : la taille déclarée du `::before` ne suffit pas, un
 * ancêtre `overflow:hidden` peut la rogner (PIT-S41-001, PIT-S91-003). `expectHitbox`
 * prouve la zone CLIQUABLE par `elementFromPoint`. Elle ne voit pas deux zones
 * voisines qui se touchent (PIT-S101-008) : une rangée à plusieurs hitboxes asserte
 * en plus son entraxe (`entraxe − MIN_TARGET ≥ 2`, cf. `sprint-101`).
 *
 * CIBLES DONT LA BOÎTE FAIT DÉJÀ 44 px, SANS PSEUDO (#767, `⋯` de la frise mobile) :
 * `expectClickableBox` prouve par `elementFromPoint` que la boîte n'est ni recouverte
 * ni rognée (8 points de bord, coins rentrés du `border-radius`).
 */

/** Seuil WCAG 2.5.5 (AAA) retenu par DEC-S99-001, en px CSS. */
export const MIN_TARGET = 44

/** Tolérance sous-pixel : `h-11` = 2.75rem = 44 px exacts à dpr 1. */
export const EPS = 0.01

/** Budget des attentes de visibilité avant une mesure de hitbox. */
const HITBOX_VISIBLE_TIMEOUT = 15_000

export interface Measured {
  /** `tag[testid | aria-label | texte | TAG]`, suffixé `(::before)` si pseudo-hitbox. */
  label: string
  width: number
  height: number
}

/** Règles de mesure qui distinguent les deux profils (cf. en-tête). Défaut : `true`. */
export interface MeasureOptions {
  /** Exempter tout contrôle situé sous `[aria-hidden="true"]` (lui compris). */
  exemptAriaHidden?: boolean
  /** Taille effective = max(boîte, `::before` absolu) quand le pseudo est peint. */
  countPseudoHitbox?: boolean
  /** Invisible aussi si `opacity: 0` ou `display: none` (pas seulement 0×0 / `visibility`). */
  strictVisibility?: boolean
}

export interface TouchTargetOptions extends MeasureOptions {
  /** Préfixe des lignes de log (ex. `#754`) : relie le rapport à son issue. */
  tag: string
}

/** Profil BOÎTE SEULE de `sprint-99-touch-targets.spec.ts` (cf. en-tête). */
export const BOX_ONLY: Required<MeasureOptions> = {
  exemptAriaHidden: false,
  countPseudoHitbox: false,
  strictVisibility: false,
}

/**
 * Mesure TOUS les contrôles interactifs visibles sous `root` (`root` compris s'il en
 * est un). Sélecteur large : boutons natifs et ARIA, champs, combobox Radix, options
 * de listbox, liens, interrupteurs et cases.
 */
export async function measureControls(
  root: Locator,
  options: MeasureOptions = {},
): Promise<Measured[]> {
  const rules: Required<MeasureOptions> = {
    exemptAriaHidden: options.exemptAriaHidden ?? true,
    countPseudoHitbox: options.countPseudoHitbox ?? true,
    strictVisibility: options.strictVisibility ?? true,
  }
  return root.evaluate((el, r) => {
    const SELECTOR = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'textarea',
      'select',
      '[role="button"]',
      '[role="combobox"]',
      '[role="option"]',
      // #763 — sans ces trois entrées, un `Switch` (`ui/switch.tsx`) ou un `Checkbox`
      // échapperait à la mesure. L'`<input>` du Switch est à 0×0 : la cible visible
      // est son label.
      '[role="switch"]',
      '[role="checkbox"]',
      'label.mt-switch',
    ].join(',')
    const isExempt = (node: Element): boolean =>
      node.classList.contains('sr-only') ||
      (r.exemptAriaHidden && node.closest('[aria-hidden="true"]') !== null) ||
      (node.getAttribute('data-testid') ?? '').endsWith('-grabber')
    const nodes = [el, ...Array.from(el.querySelectorAll(SELECTOR))].filter((n) =>
      n.matches(SELECTOR),
    )
    return nodes
      .filter((n) => !isExempt(n))
      .map((n) => {
        const box = n.getBoundingClientRect()
        const style = getComputedStyle(n)
        // Cible étendue par `::before` (TOUCH_TARGET_HITBOX) : la taille EFFECTIVE est
        // celle du pseudo. Sa zone réellement cliquable (non rognée) se prouve à part,
        // par `expectHitbox` sur chaque cible concernée.
        const pseudo = getComputedStyle(n, '::before')
        const extended =
          r.countPseudoHitbox && pseudo.content !== 'none' && pseudo.position === 'absolute'
        const text = (n.textContent ?? '').trim().slice(0, 30)
        const label =
          n.getAttribute('data-testid') ?? n.getAttribute('aria-label') ?? (text || n.tagName)
        return {
          label: `${n.tagName.toLowerCase()}[${label}]${extended ? '(::before)' : ''}`,
          width: extended ? Math.max(box.width, parseFloat(pseudo.width) || 0) : box.width,
          height: extended ? Math.max(box.height, parseFloat(pseudo.height) || 0) : box.height,
          visible:
            box.width > 0 &&
            box.height > 0 &&
            style.visibility !== 'hidden' &&
            (!r.strictVisibility || (style.opacity !== '0' && style.display !== 'none')),
        }
      })
      .filter((m) => m.visible)
      .map(({ label, width, height }) => ({ label, width, height }))
  }, rules)
}

/** Vrai si la mesure est sous 44 px en largeur OU en hauteur (tolérance `EPS`). */
export function isUndersized(m: Pick<Measured, 'width' | 'height'>): boolean {
  return m.height < MIN_TARGET - EPS || m.width < MIN_TARGET - EPS
}

/** Log de la mesure (reporter `line`) : sert de tableau au rapport de sprint. */
function report(tag: string, step: string, measured: Measured[]): void {
  const rows = measured.map((m) => `${m.label}=${m.width.toFixed(1)}x${m.height.toFixed(1)}`)
  console.log(`[${tag} ${step}] ${rows.join(' | ')}`)
}

/**
 * Asserte : au moins `min` contrôles mesurés sous `root` (anti-vacuité), et chacun
 * >= 44×44. `expect.soft` : une étape rouge n'interrompt pas le parcours, le rapport
 * liste TOUS les contrôles fautifs d'un coup.
 */
export async function expectAllTouchable(
  step: string,
  root: Locator,
  min: number,
  options: TouchTargetOptions,
): Promise<void> {
  const measured = await measureControls(root, options)
  report(options.tag, step, measured)
  expect
    .soft(measured.length, `${step} : nombre de contrôles mesurés (garde anti-vacuité)`)
    .toBeGreaterThanOrEqual(min)
  expect.soft(measured.filter(isUndersized), `${step} : contrôles sous 44×44 px`).toEqual([])
}

export interface HitboxMeasure {
  content: string
  pseudoWidth: number
  pseudoHeight: number
  host: string
  /** Coins de la zone 44×44 où `elementFromPoint` désigne l'hôte (4 attendus). */
  cornersHit: boolean[]
  /** Nœud touché au centre puis aux 4 coins — diagnostic d'un coin rogné. */
  debug: string[]
}

/** Amène la cible au centre du viewport avant un `elementFromPoint`. */
async function scrollToCenter(target: Locator): Promise<void> {
  // `behavior: 'instant'` : un `scroll-behavior: smooth` hérité animerait le
  // défilement et la mesure lirait une position intermédiaire (hors viewport).
  await target.evaluate((el) =>
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
  )
  await expect
    .poll(() => target.evaluate((el) => el.getBoundingClientRect().bottom <= window.innerHeight))
    .toBe(true)
}

/**
 * Zone cliquable d'une cible dense : boîte du `::before` + preuve par
 * `elementFromPoint` aux 4 coins (1 px à l'intérieur) de la zone 44×44 centrée sur
 * l'hôte. Le pseudo est attribué à l'hôte par le hit-testing : un coin qui désigne
 * l'hôte HORS de sa boîte visible ne peut venir que du pseudo, et un ancêtre qui le
 * rogne (PIT-S41-001) fait désigner autre chose.
 */
export async function measureHitbox(target: Locator): Promise<HitboxMeasure> {
  await scrollToCenter(target)
  return target.evaluate((el, size) => {
    const host = el.getBoundingClientRect()
    const pseudo = getComputedStyle(el, '::before')
    const cx = host.left + host.width / 2
    const cy = host.top + host.height / 2
    const half = size / 2 - 1
    const corners: Array<[number, number]> = [
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx - half, cy + half],
      [cx + half, cy + half],
    ]
    return {
      content: pseudo.content,
      pseudoWidth: parseFloat(pseudo.width) || 0,
      pseudoHeight: parseFloat(pseudo.height) || 0,
      host: `${host.width.toFixed(1)}x${host.height.toFixed(1)}`,
      cornersHit: corners.map(([x, y]) => {
        const hit = document.elementFromPoint(x, y)
        return hit !== null && (hit === el || el.contains(hit))
      }),
      debug: [[cx, cy], ...corners].map(([x, y]) => {
        const hit = document.elementFromPoint(x, y)
        return `${Math.round(x)},${Math.round(y)}:${hit ? hit.tagName + '.' + (hit.getAttribute('class') ?? '').slice(0, 40) + '#' + (hit.getAttribute('data-testid') ?? '') : 'null'}`
      }),
    }
  }, MIN_TARGET)
}

/**
 * Asserte qu'une cible dense à pseudo-hitbox offre une zone 44×44 CLIQUABLE : pseudo
 * >= 44 dans les deux dimensions, et les 4 coins de la zone désignent l'hôte.
 */
export async function expectHitbox(
  label: string,
  target: Locator,
  options: Pick<TouchTargetOptions, 'tag'>,
): Promise<void> {
  await expect(target).toBeVisible({ timeout: HITBOX_VISIBLE_TIMEOUT })
  const m = await measureHitbox(target)
  console.log(
    `[${options.tag} hitbox ${label}] hôte=${m.host} ::before=${m.pseudoWidth}x${m.pseudoHeight} coins=${m.cornersHit.join(',')}${m.cornersHit.every(Boolean) ? '' : ` — nœuds touchés (centre puis coins) : ${m.debug.join(' ; ')}`}`,
  )
  expect.soft(m.pseudoWidth, `${label} : largeur du ::before`).toBeGreaterThanOrEqual(MIN_TARGET)
  expect.soft(m.pseudoHeight, `${label} : hauteur du ::before`).toBeGreaterThanOrEqual(MIN_TARGET)
  expect
    .soft(m.cornersHit, `${label} : zone 44×44 cliquable aux 4 coins (hôte ${m.host})`)
    .toEqual([true, true, true, true])
}

/**
 * #767 — Asserte qu'une cible SANS pseudo-hitbox, dont la BOÎTE porte déjà la taille
 * (ex. `⋯` de la frise mobile, `.mt-tlm__evt-more` 44×44 en CSS), est CLIQUABLE sur
 * toute sa boîte : boîte rendue >= 44 dans les deux dimensions, et 8 points de bord
 * (4 milieux d'arête à 1 px à l'intérieur, 4 coins) désignent l'hôte par
 * `elementFromPoint`. Une boîte conforme mais recouverte en partie par un voisin peint
 * après (lane suivante, PIT-S91-003) ou rognée par un ancêtre `overflow:hidden` fait
 * rougir : `expectAllTouchable` ne lit que la boîte et ne le verrait pas.
 *
 * POURQUOI PAS `expectHitbox` : il exige un `::before` de 44 px, que ces cibles n'ont
 * pas. POURQUOI LES COINS SONT RENTRÉS DU RAYON : le hit-testing suit `border-radius`
 * (mesuré au S112 sur le `⋯`, rayon 5 px : un coin pris à 1 px de l'arête tombe HORS
 * de l'arrondi et désigne le parent). Un coin est donc sondé à
 * `1 + ceil(r·(1 − 1/√2))` px de chaque arête, point le plus extérieur encore dans
 * l'arrondi : l'arrondi n'est pas une perte de cible (WCAG 2.5.5 mesure la boîte),
 * un recouvrement l'est.
 */
export async function expectClickableBox(
  label: string,
  target: Locator,
  options: Pick<TouchTargetOptions, 'tag'>,
): Promise<void> {
  await expect(target).toBeVisible({ timeout: HITBOX_VISIBLE_TIMEOUT })
  await scrollToCenter(target)
  const m = await target.evaluate((el) => {
    const box = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    const radius = Math.max(
      ...[
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomLeftRadius,
        style.borderBottomRightRadius,
      ].map((v) => parseFloat(v) || 0),
    )
    const inset = 1 + Math.ceil(radius * (1 - Math.SQRT1_2))
    const { left, top, right, bottom } = box
    const cx = left + box.width / 2
    const cy = top + box.height / 2
    const points: Array<[string, number, number]> = [
      ['haut', cx, top + 1],
      ['bas', cx, bottom - 1],
      ['gauche', left + 1, cy],
      ['droite', right - 1, cy],
      ['haut-gauche', left + inset, top + inset],
      ['haut-droite', right - inset, top + inset],
      ['bas-gauche', left + inset, bottom - inset],
      ['bas-droite', right - inset, bottom - inset],
    ]
    const describe = (n: Element | null): string =>
      n
        ? `${n.tagName}.${(n.getAttribute('class') ?? '').slice(0, 40)}#${n.getAttribute('data-testid') ?? ''}`
        : 'null'
    const missed: string[] = []
    for (const [name, x, y] of points) {
      const hit = document.elementFromPoint(x, y)
      if (hit === null || !(hit === el || el.contains(hit))) {
        missed.push(`${name}(${Math.round(x)},${Math.round(y)}):${describe(hit)}`)
      }
    }
    return { width: box.width, height: box.height, radius, inset, missed }
  })
  console.log(
    `[${options.tag} zone ${label}] boîte=${m.width.toFixed(1)}x${m.height.toFixed(1)} rayon=${m.radius} coins rentrés de ${m.inset} px, points manqués=${m.missed.length}${m.missed.length ? ` — ${m.missed.join(' ; ')}` : ''}`,
  )
  expect.soft(m.width, `${label} : largeur de la boîte`).toBeGreaterThanOrEqual(MIN_TARGET - EPS)
  expect.soft(m.height, `${label} : hauteur de la boîte`).toBeGreaterThanOrEqual(MIN_TARGET - EPS)
  expect.soft(m.missed, `${label} : points de bord qui ne désignent pas l'hôte`).toEqual([])
}
