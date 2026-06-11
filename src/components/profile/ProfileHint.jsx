import { cn } from "@/lib/utils";

export default function ProfileHint({ emoji, text, className }) {
  return (
    <p className={cn("text-[11px] text-muted-foreground/80 mt-1 flex items-start gap-1.5 leading-snug", className)}>
      <span className="flex-shrink-0">{emoji}</span>
      <span>{text}</span>
    </p>
  );
}