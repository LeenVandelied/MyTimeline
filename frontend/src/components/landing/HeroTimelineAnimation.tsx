import { useTranslations } from 'next-intl'
import { contrastInk, INK_LIGHT } from '@/lib/color'
import { paletteHex, type EventPaletteRole } from '@/lib/event-palette'

/**
 * Frise animée du Hero de la landing (#56 → #611).
 *
 * SPEC — `Landing.dc.html` (extrait : `docs/memory/sprints/sprint-87/maquette-landing-hero.md`
 * §3) : règle de mois, 6 lanes, barres pleines, curseur TODAY FIXE, auto-scroll linéaire en
 * boucle de 52 s, masque de fondu sur les bords. Le mouvement vit dans
 * `src/styles/hero-timeline.css` (importée par la seule route landing, #343).
 *
 * BOUCLE SANS RACCORD — la piste porte DEUX copies identiques d'un bloc de 820 px et se
 * translate de 0 à −50 % : à la fin du cycle la 2e copie occupe exactement la place de la
 * 1re, le redémarrage est invisible. Le curseur TODAY est HORS de la piste (il ne défile pas).
 *
 * RÉUTILISATION DU DS (et ce qui ne l'est pas) :
 *  - barres : `.mt-evt` + `.mt-evt--preview` (26 px, rayon 6, `600 12px`, ombre `sm`, sans
 *    affordance de clic) — exactement la « barre pleine » de la maquette ;
 *  - libellé d'un ponctuel : `.mt-tlv__evt-outside` (texte `ink` posé sur le fond de lane) ;
 *  - curseur : `.mt-tlv__today` + `.mt-tlv__today-badge` (trait 2 px + badge accent) ;
 *  - couleurs : tokens `--evt-*` (palette curatée #577) et encre au contraste WCAG calculé
 *    par `contrastInk` (BR-EVE-009, même règle que la frise de l'application).
 *  NON réutilisés : `Ruler.tsx` (grille de JOURS via `DateStamp`, gouttière en %) et
 *  `Cursor.tsx` (position en %, badge au-dessus du trait, `top:-6px`) — la maquette pose une
 *  règle de MOIS et une gouttière de 120 px ; `EventPill` est un `<button>` focusable qui
 *  ouvre le drawer, or cette frise ne doit contenir AUCUN élément focusable.
 *
 * A11Y — `aria-hidden` : purement illustrative, le texte du Hero dit déjà tout. D'où
 * l'absence de tout élément interactif dedans. `prefers-reduced-motion` : piste figée sur la
 * 1re copie, lisible (cf. la feuille).
 *
 * CSS PUR, `transform` seul — ni `framer-motion` (jamais importée dans le code, elle
 * entrerait dans le bundle public), ni `requestAnimationFrame`.
 */

type Bar = {
  kind: 'bar'
  /** Position/largeur en px dans la zone de lane (après la gouttière), maquette §3. */
  left: number
  width: number
  role: EventPaletteRole
  label: string
  recurring?: boolean
}

type Point = { kind: 'point'; left: number; role: EventPaletteRole; label: string }

type LaneItem = Bar | Point

interface HeroLane {
  id: string
  items: readonly LaneItem[]
}

/** Libellés de la règle et leur position (px dans la zone de lane), maquette §3. */
const MONTHS = [
  { key: 'may', left: 14 },
  { key: 'june', left: 190 },
  { key: 'july', left: 370 },
  { key: 'august', left: 540 },
] as const

/**
 * 6 lanes (AC #611). Les 5 premières reprennent la maquette à l'identique ; la maquette n'en
 * remplit que 5 — la 6e (`passport`) est ajoutée dans le même ton (un document à renouveler),
 * sur une couleur que les 5 autres n'utilisent pas.
 */
const LANES: readonly HeroLane[] = [
  {
    id: 'car',
    items: [
      { kind: 'bar', left: 24, width: 230, role: 'red', label: 'insurance', recurring: true },
      { kind: 'bar', left: 300, width: 96, role: 'orange', label: 'inspection' },
    ],
  },
  {
    id: 'home',
    items: [
      { kind: 'bar', left: 120, width: 150, role: 'periwinkle', label: 'premium', recurring: true },
    ],
  },
  {
    id: 'health',
    items: [
      { kind: 'bar', left: 60, width: 120, role: 'orchid', label: 'prescription' },
      { kind: 'point', left: 420, role: 'grass', label: 'checkup' },
    ],
  },
  {
    id: 'subscriptions',
    items: [
      { kind: 'bar', left: 20, width: 560, role: 'cobalt', label: 'license', recurring: true },
    ],
  },
  { id: 'pantry', items: [{ kind: 'point', left: 250, role: 'amber', label: 'oil' }] },
  {
    id: 'passport',
    items: [{ kind: 'bar', left: 380, width: 150, role: 'teal', label: 'renewal' }],
  },
]

/** Glyphe « récurrent » de la maquette (préfixe des barres récurrentes). */
const RECURRING_GLYPH = '↻'

/**
 * Encre du libellé d'une barre. `contrastInk` rend l'un des deux hex d'encre ; on le traduit
 * vers le token primitif de MÊME valeur (`--gray-0` = `#FFFFFF`, `--gray-950` = `#0B0C0E`) :
 * aucun hex n'atteint le DOM, et comme les `--evt-*`, ces primitives ne changent pas avec le
 * thème — la barre garde le même rendu en clair et en sombre.
 */
function inkVar(role: EventPaletteRole): string {
  return contrastInk(paletteHex(role)) === INK_LIGHT ? 'var(--gray-0)' : 'var(--gray-950)'
}

function evtVars(role: EventPaletteRole): Record<string, string> {
  return { '--mt-evt': `var(--evt-${role})`, '--mt-evt-ink': inkVar(role) }
}

function TimelineBlock({ copy }: { copy: number }) {
  const t = useTranslations('common.landing.hero.timeline')

  return (
    <div className="hero-timeline__block" data-copy={copy}>
      <div className="hero-timeline__ruler">
        <div className="hero-timeline__gutter" />
        <div className="hero-timeline__zone">
          {MONTHS.map((month) => (
            <span key={month.key} className="hero-timeline__month" style={{ left: month.left }}>
              {t(`months.${month.key}`)}
            </span>
          ))}
        </div>
      </div>
      {LANES.map((lane, index) => (
        <div
          key={lane.id}
          className={
            index % 2 === 1
              ? 'hero-timeline__lane hero-timeline__lane--zebra'
              : 'hero-timeline__lane'
          }
        >
          <div className="hero-timeline__head">
            <span className="hero-timeline__name">{t(`lanes.${lane.id}.name`)}</span>
            <span className="hero-timeline__cat">{t(`lanes.${lane.id}.category`)}</span>
          </div>
          <div className="hero-timeline__zone">
            {lane.items.map((item) => {
              const label = t(`lanes.${lane.id}.${item.label}`)
              if (item.kind === 'bar') {
                return (
                  <span
                    key={item.label}
                    className="mt-evt mt-evt--preview hero-timeline__bar"
                    style={{ left: item.left, width: item.width, ...evtVars(item.role) }}
                  >
                    {item.recurring ? `${RECURRING_GLYPH} ${label}` : label}
                  </span>
                )
              }
              return (
                <span key={item.label}>
                  <span
                    className="hero-timeline__pin"
                    style={{ left: item.left, ...evtVars(item.role) }}
                  />
                  {/* `.mt-tlv__evt-outside` porte `padding: 0 4px` : −4 px pour que le texte
                      commence à pin + 16 px, comme la maquette. */}
                  <span
                    className="mt-tlv__evt-outside hero-timeline__point-label"
                    style={{ left: item.left + 12 }}
                  >
                    {label}
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function HeroTimelineAnimation() {
  const t = useTranslations('common.landing.hero.timeline')

  return (
    <div className="hero-timeline" aria-hidden="true">
      <div className="hero-timeline__viewport">
        <div className="hero-timeline__track">
          <TimelineBlock copy={0} />
          <TimelineBlock copy={1} />
        </div>
        {/* Curseur TODAY hors de la piste : il reste fixe pendant le défilement. */}
        <div className="mt-tlv__today hero-timeline__today">
          <span className="mt-tlv__today-badge hero-timeline__today-badge">{t('today')}</span>
        </div>
      </div>
    </div>
  )
}
