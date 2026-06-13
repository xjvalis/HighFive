import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { MapPin, Clock, Users, MessageCircle, Star, Loader2 } from "lucide-react";
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
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const cat = getCategoryStyle(event.category);
  const participantCount = event.participants?.length || 0;
  const isFull = event.max_capacity && participantCount >= event.max_capacity;
  const now = new Date();
  const startTime = event.date ? new Date(event.date) : null;
  const endTime = event.end_time ? new Date(event.end_time) : (startTime ? new Date(startTime.getTime() + 2*60*60*1000) : null);
  const isHappeningNow = startTime && endTime && now >= startTime && now <= endTime;

  const handleJoinClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (joining) return;
    setJoining(true);
    try {
      await onJoin?.(event);
    } finally {
      setJoining(false);
    }
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavorite?.(event);
  };

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    navigate(`/event/${event.id}`);
  };

  const getJoinContent = () => {
    if (joining) return <Loader2 className="w-3.5 h-3.5 animate-spin"/>;
    if (isJoined) {
      if (hoveringJoin) return <span>{lang === 'cs' ? 'Odhlásit' : 'Leave'}</span>;
      return <><span>✓</span><span>{lang === 'cs' ? 'Jdu!' : 'Going!'}</span></>;
    }
    if (isFull) return <span>📋</span>;
    // Not joined — ✌️ only, outlined primary button
    return <span>✌️</span>;
  };

  const getJoinStyle = () => {
    if (isJoined) {
      if (hoveringJoin) return "bg-red-50 text-red-600 border border-red-300";
      return "bg-mint text-emerald-700 border border-transparent";
    }
    if (isFull) return "bg-secondary text-muted-foreground border border-border hover:bg-orange-50 hover:text-orange-600";
    // Not joined — outlined primary (fialový rámeček, průhledné pozadí)
    return "bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-primary-foreground";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleCardClick}
      className="bg-card rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:bg-violet-50/60 transition-all duration-200 overflow-hidden group cursor-pointer"
    >
      <div className="flex gap-3 p-3 sm:p-4">
        {event.image_url && (
          <Link to={`/event/${event.id}`} onClick={e => e.stopPropagation()} className="flex-shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
            </div>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", cat.color)}>
              {cat.emoji} {getCategoryLabel(event.category, lang)}
            </span>
            {isHappeningNow && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-semibold flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-pulse"></span>
                {lang === 'cs' ? 'Právě teď' : 'Right Now'}
              </span>
            )}
            {isFull && !isJoined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{tr.full}</span>
            )}
          </div>

          <Link to={`/event/${event.id}`} onClick={e => e.stopPropagation()}>
            <h3 className="font-grotesk font-semibold text-foreground hover:text-primary transition-colors leading-snug text-sm mb-0.5 line-clamp-1">
              {event.title}
            </h3>
          </Link>

          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mb-1.5">
            {event.location && (
              <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                <MapPin className="w-3 h-3 flex-shrink-0"/> {event.location}
              </span>
            )}
            {event.date && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3 flex-shrink-0"/> {format(new Date(event.date), "EEE d MMM · HH:mm")}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Users className="w-3 h-3"/>
                {participantCount}{event.max_capacity ? `/${event.max_capacity}` : ""}
              </span>
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <MessageCircle className="w-3 h-3"/>
                {event.comments_count || 0}
              </span>
            </div>

            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={handleFavoriteClick}
                className={cn("p-1 rounded-lg transition-all", isFavorited ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500")}
              >
                <Star className={cn("w-3.5 h-3.5", isFavorited && "fill-yellow-500")}/>
              </button>

              <motion.button
                onClick={handleJoinClick}
                onMouseEnter={() => setHoveringJoin(true)}
                onMouseLeave={() => setHoveringJoin(false)}
                whileTap={{ scale: 0.9 }}
                disabled={joining}
                className={cn(
                  "flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all duration-200 min-w-[36px]",
                  getJoinStyle()
                )}
              >
                {getJoinContent()}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
