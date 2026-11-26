// Frise « journée idéale » du panneau d'authentification : décor immobile, sans
// animation ni transition (distincte des frises animées de la landing).
// Positions en pourcentage d'une journée de 6 h à 22 h.
const TICKS = Array.from({ length: 17 }, (_, i) => i)

const BARS = [
  { start: 1, end: 4, tone: 'bg-evt-cobalt' },
  { start: 5, end: 6, tone: 'bg-evt-grass' },
  { start: 7, end: 11, tone: 'bg-evt-amber' },
  { start: 12, end: 14, tone: 'bg-evt-teal' },
  { start: 15, end: 16, tone: 'bg-evt-orchid' },
] as const

const pct = (hour: number) => `${(hour / 16) * 100}%`

export function AuthIdealDayTimeline() {
  return (
    <div aria-hidden="true" className="w-full">
      <div data-testid="auth-timeline-ruler" className="relative h-3">
        {TICKS.map((i) => (
          <span
            key={i}
            className={`bg-rule-strong absolute bottom-0 w-px ${i % 4 === 0 ? 'h-3' : 'h-1.5'}`}
            style={{ left: pct(i) }}
          />
        ))}
      </div>
      <div className="border-rule mt-1 space-y-2 border-t pt-3">
        {BARS.map((bar) => (
          <div key={bar.start} className="relative h-4">
            <div
              data-testid="auth-timeline-bar"
              className={`${bar.tone} absolute inset-y-0 rounded-sm`}
              style={{ left: pct(bar.start), width: pct(bar.end - bar.start) }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
