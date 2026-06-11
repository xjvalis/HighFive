// Badge definitions — each badge has an id, emoji, label, description, and a condition function
// condition receives: { profile, eventsCreated, eventsJoined }

export const BADGES = [
  {
    id: "first_step",
    emoji: "👶",
    label: "První krok",
    description: "Připojil/a se k prvnímu eventu",
    condition: ({ eventsJoined }) => eventsJoined >= 1,
  },
  {
    id: "frequent_attendee",
    emoji: "🙌",
    label: "Častý účastník",
    description: "Zúčastnil/a se 5+ eventů",
    condition: ({ eventsJoined }) => eventsJoined >= 5,
  },
  {
    id: "super_attendee",
    emoji: "🔥",
    label: "Super účastník",
    description: "Zúčastnil/a se 15+ eventů",
    condition: ({ eventsJoined }) => eventsJoined >= 15,
  },
  {
    id: "organizer",
    emoji: "🎯",
    label: "Organizátor",
    description: "Vytvořil/a první event",
    condition: ({ eventsCreated }) => eventsCreated >= 1,
  },
  {
    id: "community_builder",
    emoji: "🏗️",
    label: "Tvůrce komunity",
    description: "Vytvořil/a 5+ eventů",
    condition: ({ eventsCreated }) => eventsCreated >= 5,
  },
  {
    id: "social_butterfly",
    emoji: "🦋",
    label: "Společenský motýl",
    description: "Vytvořil/a i zúčastnil/a se 3+ eventů",
    condition: ({ eventsCreated, eventsJoined }) => eventsCreated >= 3 && eventsJoined >= 3,
  },
  {
    id: "verified",
    emoji: "✅",
    label: "Ověřený uživatel",
    description: "Ověřený člen komunity",
    condition: ({ profile }) => profile?.is_verified,
  },
  {
    id: "premium",
    emoji: "👑",
    label: "Premium člen",
    description: "Podporuje HighFive jako Premium",
    condition: ({ profile }) => profile?.is_premium,
  },
];

export function getEarnedBadges({ profile, eventsCreated, eventsJoined }) {
  return BADGES.filter(b => b.condition({ profile, eventsCreated, eventsJoined }));
}