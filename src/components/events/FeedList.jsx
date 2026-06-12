import { useMemo } from "react";
import EventCard from "@/components/events/EventCard";
import FeedMotivation from "@/components/events/FeedMotivation";
import { useT } from "@/lib/i18n";

function scoreEvent(event, profile, userEmail, isPersonalized) {
  if (!isPersonalized) return 0;
  let score = 0;
  const now = new Date();
  const eventDate = new Date(event.date);
  if (userEmail && event.participants?.includes(userEmail)) score -= 100;
  const favCats = profile?.favorite_categories || [];
  if (favCats.includes(event.category)) score += 40;
  const joinedCats = profile?.joined_categories || [];
  if (joinedCats.includes(event.category)) score += 15;
  const gender = profile?.gender;
  if (event.gender_recommendation === "Everyone" || !event.gender_recommendation) score += 5;
  else if (gender === "Muž" && event.gender_recommendation === "M") score += 10;
  else if (gender === "Žena" && event.gender_recommendation === "F") score += 10;
  else if (event.gender_recommendation === "M+F") score += 5;
  if (profile?.age) {
    const age = profile.age;
    const inRange = (!event.age_min || age >= event.age_min) && (!event.age_max || age <= event.age_max);
    if (inRange) score += 10; else score -= 20;
  }
  const daysUntil = (eventDate - now) / (1000 * 60 * 60 * 24);
  if (daysUntil >= 0 && daysUntil <= 7) score += 15;
  else if (daysUntil > 7 && daysUntil <= 30) score += 5;
  const createdAt = new Date(event.created_date || 0);
  const daysSinceCreated = (now - createdAt) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated < 2) score += 8;
  else if (daysSinceCreated < 7) score += 4;
  if (event.is_featured) score += 20;
  score += Math.min((event.favorites_count || 0) * 2, 10);
  const participants = event.participants?.length || 0;
  if (!event.max_capacity || participants < event.max_capacity) score += 5;
  return score;
}

export default function FeedList({ events, user, profile, onJoin, onFavorite, isPersonalized = false, feedStats }) {
  const tr = useT();
  const { featured, personalizedRest, regularRest } = useMemo(() => {
    const allFeatured = events.filter(e => e.is_featured);
    const shuffledFeatured = [...allFeatured].sort(() => Math.random() - 0.5).slice(0, 3);
    const featuredIds = new Set(shuffledFeatured.map(e => e.id));
    const nonFeatured = events.filter(e => !featuredIds.has(e.id));
    if (isPersonalized) {
      const scored = nonFeatured.map(e => ({ event: e, score: scoreEvent(e, profile, user?.email, true) }));
      scored.sort((a, b) => b.score - a.score);
      return { featured: shuffledFeatured, personalizedRest: scored.map(s => s.event), regularRest: [] };
    }
    return { featured: shuffledFeatured, personalizedRest: [], regularRest: nonFeatured };
  }, [events, user, profile, isPersonalized]);

  const favCats = profile?.favorite_categories || [];
  const renderCard = (event) => {
    const favEvents = profile?.favorited_events || [];
    const isFav = Array.isArray(favEvents) && favEvents.includes(event.id);
    return <EventCard key={event.id} event={event} onJoin={onJoin} onFavorite={onFavorite} isJoined={!!(user && event.participants?.includes(user.email))} isFavorited={isFav}/>;
  };

  const favSection = isPersonalized ? personalizedRest.filter(e => favCats.includes(e.category)) : [];
  const otherSection = isPersonalized ? personalizedRest.filter(e => !favCats.includes(e.category)) : regularRest;
  const allSorted = [...featured, ...favSection, ...otherSection];

  return (
    <div className="space-y-2 sm:space-y-2.5">
      {allSorted.map((event, i) => (
        <div key={event.id}>
          {featured.length > 0 && i === featured.length && (
            <div className="flex items-center gap-2 my-3 px-1">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {isPersonalized ? tr.feedForYou : tr.feedAllEvents}
              </span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
          )}
          {/* Motivation message every 4 cards — passes real stats */}
          {i > 0 && (i + 1) % 4 === 0 && (
            <FeedMotivation
              stats={feedStats}
              index={Math.floor(i / 4)}
            />
          )}
          {renderCard(event)}
        </div>
      ))}
    </div>
  );
}
