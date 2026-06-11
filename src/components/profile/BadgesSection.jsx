import { BADGES, getEarnedBadges } from "@/lib/badges";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function BadgesSection({ profile, eventsCreated, eventsJoined }) {
  const earned = getEarnedBadges({ profile, eventsCreated, eventsJoined });
  const earnedIds = new Set(earned.map(b => b.id));

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🏅</span>
        <h2 className="font-grotesk font-semibold text-base">Odznaky</h2>
        <span className="ml-auto text-xs text-muted-foreground">{earned.length}/{BADGES.length}</span>
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {BADGES.map(badge => {
            const isEarned = earnedIds.has(badge.id);
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-xl cursor-default transition-all",
                    isEarned
                      ? "bg-lavender/50 border border-primary/20"
                      : "opacity-35 grayscale bg-secondary/50 border border-transparent"
                  )}>
                    <span className="text-2xl">{badge.emoji}</span>
                    <span className="text-[10px] font-medium text-center leading-tight">{badge.label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[160px] text-center bg-card text-foreground border border-border">
                  <p className="font-semibold">{badge.label}</p>
                  <p className="text-muted-foreground">{badge.description}</p>
                  {!isEarned && <p className="text-primary mt-0.5">🔒 Ještě nezískaný</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {earned.length === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">Zatím žádné odznaky — začni se účastnit eventů! 🎉</p>
      )}
    </div>
  );
}