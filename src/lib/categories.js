// Category → color mapping for the Spoluvíc pastel design system.
// `name` values are the literal strings stored in events.category in the DB —
// never rename these, only the display bg/ink/emoji/label change.
//
// The design handoff (design_handoff_spoluvic_web/tokens/categories.json)
// only defines 8 of our 16 categories. The remaining 8 (Culture, Music,
// Gaming, Food, Creative, Tech, Wellness, Nightlife) and the Other fallback
// are worked out here in the same spirit — light pastel fill + darker ink of
// the same hue, one new hue per category, no hue reused, pink avoided (the
// identity's own rule: purple must never sit next to pink).
export const CATEGORIES = [
  { name: "Hangout", label: { en: "Hangout", cs: "Hangout" }, emoji: "☕", bg: "#FFF0E4", ink: "#8A6440", strong: "#FFE7C2" },
  { name: "One-on-One", label: { en: "One-on-One", cs: "One-on-One" }, emoji: "🤝", bg: "#FFF9DC", ink: "#7A6210", strong: "#FFF0B8" },
  { name: "Sport", label: { en: "Sport", cs: "Sport" }, emoji: "⚽", bg: "#EAF1FF", ink: "#2F4FA8", strong: "#D6E4FF" },
  { name: "Board Games", label: { en: "Board Games", cs: "Deskové hry" }, emoji: "🎲", bg: "#F0EAFC", ink: "#6A54A8", strong: "#DCD0F5" },
  { name: "Outdoors", label: { en: "Outdoors", cs: "Příroda" }, emoji: "🌿", bg: "#EAF5E4", ink: "#4A6B3E", strong: "#DCEFD3" },
  { name: "Culture", label: { en: "Culture", cs: "Kultura" }, emoji: "🎨", bg: "#F7E9DE", ink: "#8A5230", strong: "#EFCFB3" },
  { name: "Movies", label: { en: "Movies", cs: "Film" }, emoji: "🎬", bg: "#FFF1E0", ink: "#8A4A10", strong: "#FFD9A8" },
  { name: "Music", label: { en: "Music", cs: "Hudba" }, emoji: "🎵", bg: "#EBEAFB", ink: "#4A44A0", strong: "#D6D3F5" },
  { name: "Gaming", label: { en: "Gaming", cs: "Gaming" }, emoji: "🎮", bg: "#E2F6FA", ink: "#1D6E82", strong: "#C0ECF2" },
  { name: "Food", label: { en: "Food", cs: "Jídlo a pití" }, emoji: "🍜", bg: "#FCEAEA", ink: "#9C3B3B", strong: "#F6CACA" },
  { name: "Creative", label: { en: "Creative", cs: "Kreativa" }, emoji: "✏️", bg: "#FBF3D8", ink: "#8A6B14", strong: "#F3E2A0" },
  { name: "Tech", label: { en: "Tech", cs: "Tech" }, emoji: "💻", bg: "#EAEDF3", ink: "#3F4E63", strong: "#D3D9E4" },
  { name: "Study", label: { en: "Study", cs: "Studium" }, emoji: "📚", bg: "#FFFAE0", ink: "#7A5A10", strong: "#FFF0B8" },
  { name: "Wellness", label: { en: "Wellness", cs: "Wellness" }, emoji: "🧘", bg: "#EDF5EE", ink: "#3E6B52", strong: "#D2E8D8" },
  { name: "Nightlife", label: { en: "Nightlife", cs: "Party" }, emoji: "🌙", bg: "#E7E9F5", ink: "#33407A", strong: "#C7CDEB" },
  { name: "Other", label: { en: "Other", cs: "Ostatní" }, emoji: "✨", bg: "#F1EEE8", ink: "#6B655F", strong: "#E3DED5" },
];

export const getCategoryStyle = (name) => {
  return CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
};

export const getCategoryLabel = (name, lang = "en") => {
  const cat = CATEGORIES.find(c => c.name === name);
  if (!cat) return name;
  return cat.label?.[lang] || name;
};
