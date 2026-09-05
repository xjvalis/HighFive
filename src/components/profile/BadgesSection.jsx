import { BADGES, getEarnedBadges } from "@/lib/badges";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useContext } from "react";
import { LanguageContext } from "@/lib/language";
import { svCard, svSectionLabel } from "@/lib/svStyles";

export default function BadgesSection({ profile, eventsCreated, eventsJoined }) {
  const { lang } = useContext(LanguageContext);
  const earned = getEarnedBadges({ profile, eventsCreated, eventsJoined });
  const earnedIds = new Set(earned.map(b => b.id));

  return (
    <div style={{ ...svCard, padding: 18 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <span style={svSectionLabel}>{lang === 'cs' ? 'Odznaky' : 'Badges'}</span>
        <span style={{ font: "400 10.5px 'IBM Plex Mono', monospace", color: 'var(--sv-meta)' }}>{earned.length}/{BADGES.length}</span>
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
                  <div
                    className="flex flex-col items-center gap-1 cursor-default transition-all"
                    style={{ padding: 8, borderRadius: 10, background: isEarned ? 'var(--sv-surface-muted)' : 'transparent', opacity: isEarned ? 1 : 0.3, filter: isEarned ? 'none' : 'grayscale(1)' }}
                  >
                    <span className="text-2xl" style={{ fontFamily: 'var(--sv-font-emoji)' }}>{badge.emoji}</span>
                    <span className="text-center leading-tight" style={{ font: "500 10px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' }}>{label}</span>
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
