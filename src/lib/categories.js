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
//
// `share`/`shareInk` (added for the share-card feature, design_handoff_spoluvic_web/
// "share karty"/SHARE_EVENT.md) follow the same pattern for the 7 categories the
// handoff gave examples for (board-games→Board Games, hangout→Hangout,
// one-on-one→One-on-One, sport→Sport, nature→Outdoors, study→Study,
// cinema→Movies — the handoff's "travel" example has no matching category here and
// was dropped). The remaining 9 are worked out the same way: `share` close to
// `strong` (slightly deepened), `shareInk` a darkened/more saturated `ink` that
// keeps ≥4.5:1 contrast against `share`.
export const CATEGORIES = [
  { name: "Hangout", label: { en: "Hangout", cs: "Hangout" }, emoji: "☕", bg: "#FFF0E4", ink: "#8A6440", strong: "#FFE7C2", share: "#FFDCBE", shareInk: "#6B3E14" },
  { name: "One-on-One", label: { en: "One-on-One", cs: "One-on-One" }, emoji: "🤝", bg: "#FFF9DC", ink: "#7A6210", strong: "#FFF0B8", share: "#FFEFB8", shareInk: "#5F4608" },
  { name: "Sport", label: { en: "Sport", cs: "Sport" }, emoji: "⚽", bg: "#EAF1FF", ink: "#2F4FA8", strong: "#D6E4FF", share: "#D2E1FF", shareInk: "#23407F" },
  { name: "Board Games", label: { en: "Board Games", cs: "Deskové hry" }, emoji: "🎲", bg: "#F0EAFC", ink: "#6A54A8", strong: "#DCD0F5", share: "#E6DCFA", shareInk: "#3F2E70" },
  { name: "Outdoors", label: { en: "Outdoors", cs: "Příroda" }, emoji: "🌿", bg: "#EAF5E4", ink: "#4A6B3E", strong: "#DCEFD3", share: "#D8ECCD", shareInk: "#33552A" },
  { name: "Culture", label: { en: "Culture", cs: "Kultura" }, emoji: "🎨", bg: "#F7E9DE", ink: "#8A5230", strong: "#EFCFB3", share: "#E5C3A4", shareInk: "#673D1D" },
  { name: "Movies", label: { en: "Movies", cs: "Film" }, emoji: "🎬", bg: "#FFF1E0", ink: "#8A4A10", strong: "#FFD9A8", share: "#FFD5A8", shareInk: "#6B3A0C" },
  { name: "Music", label: { en: "Music", cs: "Hudba" }, emoji: "🎵", bg: "#EBEAFB", ink: "#4A44A0", strong: "#D6D3F5", share: "#CCC7F0", shareInk: "#333468" },
  { name: "Gaming", label: { en: "Gaming", cs: "Gaming" }, emoji: "🎮", bg: "#E2F6FA", ink: "#1D6E82", strong: "#C0ECF2", share: "#B7E6EC", shareInk: "#114F5E" },
  { name: "Food", label: { en: "Food", cs: "Jídlo a pití" }, emoji: "🍜", bg: "#FCEAEA", ink: "#9C3B3B", strong: "#F6CACA", share: "#ECBEBE", shareInk: "#752A2A" },
  { name: "Creative", label: { en: "Creative", cs: "Kreativa" }, emoji: "✏️", bg: "#FBF3D8", ink: "#8A6B14", strong: "#F3E2A0", share: "#E9D691", shareInk: "#644D0A" },
  { name: "Tech", label: { en: "Tech", cs: "Tech" }, emoji: "💻", bg: "#EAEDF3", ink: "#3F4E63", strong: "#D3D9E4", share: "#C6CDDA", shareInk: "#2C3748" },
  { name: "Study", label: { en: "Study", cs: "Studium" }, emoji: "📚", bg: "#FFFAE0", ink: "#7A5A10", strong: "#FFF0B8", share: "#FFF2C2", shareInk: "#5E4408" },
  { name: "Wellness", label: { en: "Wellness", cs: "Wellness" }, emoji: "🧘", bg: "#EDF5EE", ink: "#3E6B52", strong: "#D2E8D8", share: "#C5DCCB", shareInk: "#2A503A" },
  { name: "Nightlife", label: { en: "Nightlife", cs: "Party" }, emoji: "🌙", bg: "#E7E9F5", ink: "#33407A", strong: "#C7CDEB", share: "#BAC1E0", shareInk: "#222C58" },
  { name: "Other", label: { en: "Other", cs: "Ostatní" }, emoji: "✨", bg: "#F1EEE8", ink: "#6B655F", strong: "#E3DED5", share: "#D6D0C5", shareInk: "#48423A" },
];

export const getCategoryStyle = (name) => {
  return CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
};

export const getCategoryLabel = (name, lang = "en") => {
  const cat = CATEGORIES.find(c => c.name === name);
  if (!cat) return name;
  return cat.label?.[lang] || name;
};
