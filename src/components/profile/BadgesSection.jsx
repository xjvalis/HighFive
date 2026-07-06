import { BADGES, getEarnedBadges } from "@/lib/badges";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useContext } from "react";
import { LanguageContext } from "@/lib/language";

export default function BadgesSection({ profile, eventsCreated, eventsJoined }) {
  const { lang } = useContext(LanguageContext);
  const earned = getEarnedBadges({ profile, eventsCreated, eventsJoined });
  const earnedIds = new Set(earned.map(b => b.id));

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏅</span>
          <h2 className="font-grotesk font-semibold text-base">{lang === 'cs' ? 'Odznaky' : 'Badges'}</h2>
        </div>
        <span className="text-xs text-muted-foreground">{earned.length}/{BADGES.length}</span>
      </div>
      <TooltipProvider>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {BADGES.map(badge => {
            const isEarned = earnedIds.has(badge.id);
            const label = typeof badge.label === 'object' ? (badge.label[lang] || badge.label.en) : badge.label;
            const description = typeof badge.description === 'object' ? (badge.description[lang] || badge.description.en) : badge.description;
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <div className={`flex flex-col items-center gap-1 p-2 rounded-xl cursor-default transition-all ${isEarned ? 'bg-lavender/40' : 'opacity-30 grayscale'}`}>
                    <span className="text-2xl">{badge.emoji}</span>
                    <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{label}</p>
                  <p className="text-primary-foreground/80">{description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
