import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { MapPin, Clock, Users, MessageCircle, Star } from "lucide-react";
import { format } from "date-fns";
import { getCategoryStyle, getCategoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";
import { useContext } from "react";
import { LanguageContext } from "@/lib/language";

export default function EventCard({ event, onJoin, onFavorite, isJoined, isFavorited }) {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const [hoveringJoin, setHoveringJoin] = useState(false);
  const navigate = useNavigate();
  const cat = getCategoryStyle(event.category);
  const participantCount = event.participants?.length || 0;
  const isFull = event.max_capacity && participantCount >= event.max_capacity;
  const now = new Date();
  const startTime = event.date ? new Date(event.date) : null;
  const endTime = event.end_time ? new Date(event.end_time) : (startTime ? new Date(startTime.getTime() + 2*60*60*1000) : null);
  const isHappeningNow = startTime && endTime && now >= startTime && now <= endTime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/event/${event.id}`)}
      className="bg-card rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:bg-violet-50/60 transition-all duration-200 overflow-hidden group cursor-pointer"
    >
      <div className="flex gap-3 p-3 sm:p-4">
        {/* Thumbnail — only if image exists */}
        {event.image_url && (
          <Link to={`/event/${event.id}`} className="flex-shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Category + featured */}
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", cat.color)}>
              {cat.emoji} {getCategoryLabel(event.category, lang)}
            </span>

            {isHappeningNow && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold flex items-center gap-0.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                {tr.sortHappeningNow || '🔴 Právě teď'}
              </span>
            )}
            {isFull && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{tr.full}</span>
            )}
          </div>

          {/* Title */}
          <Link to={`/event/${event.id}`}>
            <h3 className="font-grotesk font-semibold text-foreground hover:text-primary transition-colors leading-snug text-sm mb-0.5 line-clamp-1">
              {event.title}
            </h3>
          </Link>

          {/* Meta — compact row */}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mb-1.5">
            {event.location && (
              <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                <MapPin className="w-3 h-3 flex-shrink-0" /> {event.location}
              </span>
            )}
            {event.date && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3 flex-shrink-0" /> {format(new Date(event.date), "EEE d MMM · HH:mm")}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {/* Stats */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Users className="w-3 h-3" />
                {participantCount}{event.max_capacity ? `/${event.max_capacity}` : ""}
              </span>
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <MessageCircle className="w-3 h-3" />
                {event.comments_count || 0}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); onFavorite?.(event); }}
                className={cn(
                  "p-1 rounded-lg transition-all",
                  isFavorited ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                )}
              >
                <Star className={cn("w-3.5 h-3.5", isFavorited && "fill-yellow-500")} />
              </button>

              {!isFull || isJoined ? (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin?.(event); }}
                  onMouseEnter={() => setHoveringJoin(true)}
                  onMouseLeave={() => setHoveringJoin(false)}
                  title={isJoined ? tr.leave : tr.joined}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all duration-200",
                    isJoined
                      ? hoveringJoin
                        ? "bg-red-50 text-red-600"
                        : "bg-mint text-emerald-700"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <span>{isJoined ? (hoveringJoin ? "✕" : "✓") : "🙌"}</span>
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-secondary text-muted-foreground">{tr.full}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}