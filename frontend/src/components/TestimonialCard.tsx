import { Card, CardContent } from "@/components/ui/card";

interface TestimonialCardProps {
  name: string;
  role: string;
  content: string;
  avatar: {
    letter: string;
    bgColor: string;
  };
}

const getBgColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    purple: "bg-accent-soft",
    indigo: "bg-accent-soft",
    blue: "bg-blue-500/20",
    cyan: "bg-cyan-500/20",
    pink: "bg-pink-500/20"
  };
  
  return colorMap[color] || "bg-accent-soft";
};

const getTextColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    purple: "text-accent",
    indigo: "text-accent",
    blue: "text-blue-500",
    cyan: "text-cyan-500",
    pink: "text-pink-500"
  };
  
  return colorMap[color] || "text-accent";
};

export default function TestimonialCard({ name, role, content, avatar }: TestimonialCardProps) {
  const bgColorClass = getBgColorClass(avatar.bgColor);
  const textColorClass = getTextColorClass(avatar.bgColor);
  
  return (
    <Card className="testimonial-card bg-surface border-rule shadow-lg">
      <CardContent className="p-8">
        <div className="flex items-center mb-4">
          <div className={`w-12 h-12 ${bgColorClass} rounded-full flex items-center justify-center mr-3`}>
            <span className={`text-lg font-bold ${textColorClass}`}>{avatar.letter}</span>
          </div>
          <div>
            <h4 className="font-bold text-ink">{name}</h4>
            <p className="text-ink-muted text-sm">{role}</p>
          </div>
        </div>
        <p className="text-ink-muted">
          &quot;{content}&quot;
        </p>
      </CardContent>
    </Card>
  );
} 