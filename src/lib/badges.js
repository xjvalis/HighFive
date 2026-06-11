// Badge definitions — bilingual labels/descriptions
export const BADGES = [
  {
    id: "first_step",
    emoji: "👶",
    label: { cs: "První krok", en: "First Step" },
    description: { cs: "Připojil/a se k prvnímu eventu", en: "Joined their first event" },
    condition: ({ eventsJoined }) => eventsJoined >= 1,
  },
  {
    id: "frequent_attendee",
    emoji: "🙌",
    label: { cs: "Častý účastník", en: "Regular" },
    description: { cs: "Zúčastnil/a se 5+ eventů", en: "Attended 5+ events" },
    condition: ({ eventsJoined }) => eventsJoined >= 5,
  },
  {
    id: "super_attendee",
    emoji: "🔥",
    label: { cs: "Super účastník", en: "Super Attendee" },
    description: { cs: "Zúčastnil/a se 15+ eventů", en: "Attended 15+ events" },
    condition: ({ eventsJoined }) => eventsJoined >= 15,
  },
  {
    id: "organizer",
    emoji: "🎯",
    label: { cs: "Organizátor", en: "Organizer" },
    description: { cs: "Vytvořil/a první event", en: "Created their first event" },
    condition: ({ eventsCreated }) => eventsCreated >= 1,
  },
  {
    id: "community_builder",
    emoji: "🏗️",
    label: { cs: "Tvůrce komunity", en: "Community Builder" },
    description: { cs: "Vytvořil/a 5+ eventů", en: "Created 5+ events" },
    condition: ({ eventsCreated }) => eventsCreated >= 5,
  },
  {
    id: "social_butterfly",
    emoji: "🦋",
    label: { cs: "Společenský motýl", en: "Social Butterfly" },
    description: { cs: "Vytvořil/a i zúčastnil/a se 3+ eventů", en: "Created and joined 3+ events" },
    condition: ({ eventsCreated, eventsJoined }) => eventsCreated >= 3 && eventsJoined >= 3,
  },
  {
    id: "verified",
    emoji: "✅",
    label: { cs: "Ověřený uživatel", en: "Verified" },
    description: { cs: "Ověřený člen komunity", en: "Verified community member" },
    condition: ({ profile }) => profile?.is_verified,
  },
  {
    id: "premium",
    emoji: "👑",
    label: { cs: "Premium člen", en: "Premium Member" },
    description: { cs: "Podporuje HighFive jako Premium", en: "Supports HighFive as Premium" },
    condition: ({ profile }) => profile?.is_premium,
  },
];

export function getEarnedBadges({ profile, eventsCreated, eventsJoined }) {
  return BADGES.filter(b => b.condition({ profile, eventsCreated, eventsJoined }));
}
