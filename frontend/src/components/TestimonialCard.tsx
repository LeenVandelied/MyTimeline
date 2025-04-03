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
    purple: "bg-purple-500/20",
    indigo: "bg-indigo-500/20",
    blue: "bg-blue-500/20",
    cyan: "bg-cyan-500/20",
    pink: "bg-pink-500/20"
  };
  
  return colorMap[color] || "bg-purple-500/20";
};

const getTextColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    purple: "text-purple-500",
    indigo: "text-indigo-500",
    blue: "text-blue-500",
    cyan: "text-cyan-500",
    pink: "text-pink-500"
  };
  
  return colorMap[color] || "text-purple-500";
};

export default function TestimonialCard({ name, role, content, avatar }: TestimonialCardProps) {
  const bgColorClass = getBgColorClass(avatar.bgColor);
  const textColorClass = getTextColorClass(avatar.bgColor);
  
  return (
    <Card className="testimonial-card bg-gray-800 border-gray-700 shadow-lg">
      <CardContent className="p-8">
        <div className="flex items-center mb-4">
          <div className={`w-12 h-12 ${bgColorClass} rounded-full flex items-center justify-center mr-3`}>
            <span className={`text-lg font-bold ${textColorClass}`}>{avatar.letter}</span>
          </div>
          <div>
            <h4 className="font-bold text-white">{name}</h4>
            <p className="text-gray-400 text-sm">{role}</p>
          </div>
        </div>
        <p className="text-gray-300">
          &quot;{content}&quot;
        </p>
      </CardContent>
    </Card>
  );
} 