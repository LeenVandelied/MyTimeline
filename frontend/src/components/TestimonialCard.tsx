import { Card, CardContent } from '@/components/ui/card'

interface TestimonialCardProps {
  name: string
  role: string
  content: string
  avatar: {
    letter: string
    bgColor: string
  }
}

const getBgColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    purple: 'bg-accent-soft',
    indigo: 'bg-accent-soft',
    blue: 'bg-[var(--color-evt-sky)]/20',
    cyan: 'bg-[var(--color-evt-teal)]/20',
    pink: 'bg-[var(--color-evt-rose)]/20',
  }

  return colorMap[color] || 'bg-accent-soft'
}

const getTextColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    purple: 'text-accent',
    indigo: 'text-accent',
    blue: 'text-[var(--color-evt-sky)]',
    cyan: 'text-[var(--color-evt-teal)]',
    pink: 'text-[var(--color-evt-rose)]',
  }

  return colorMap[color] || 'text-accent'
}

export default function TestimonialCard({ name, role, content, avatar }: TestimonialCardProps) {
  const bgColorClass = getBgColorClass(avatar.bgColor)
  const textColorClass = getTextColorClass(avatar.bgColor)

  return (
    <Card className="testimonial-card bg-surface border-rule shadow-lg">
      <CardContent className="p-8">
        <div className="mb-4 flex items-center">
          <div
            className={`h-12 w-12 ${bgColorClass} mr-3 flex items-center justify-center rounded-full`}
          >
            <span className={`text-lg font-bold ${textColorClass}`}>{avatar.letter}</span>
          </div>
          <div>
            <h4 className="text-ink font-bold">{name}</h4>
            <p className="text-ink-muted text-sm">{role}</p>
          </div>
        </div>
        <p className="text-ink-muted">&quot;{content}&quot;</p>
      </CardContent>
    </Card>
  )
}
