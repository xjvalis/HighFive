export const CATEGORIES = [
  { name: "Hangout", label: { en: "Hangout", cs: "Hangout" }, emoji: "☕", color: "bg-peach text-orange-700" },
  { name: "One-on-One", label: { en: "One-on-One", cs: "One-on-One" }, emoji: "🤝", color: "bg-sky text-blue-700" },
  { name: "Sport", label: { en: "Sport", cs: "Sport" }, emoji: "⚽", color: "bg-mint text-emerald-700" },
  { name: "Board Games", label: { en: "Board Games", cs: "Deskové hry" }, emoji: "🎲", color: "bg-lavender text-violet-700" },
  { name: "Outdoors", label: { en: "Outdoors", cs: "Příroda" }, emoji: "🌿", color: "bg-mint text-emerald-700" },
  { name: "Culture", label: { en: "Culture", cs: "Kultura" }, emoji: "🎨", color: "bg-blush text-rose-700" },
  { name: "Movies", label: { en: "Movies", cs: "Film" }, emoji: "🎬", color: "bg-sky text-blue-700" },
  { name: "Music", label: { en: "Music", cs: "Hudba" }, emoji: "🎵", color: "bg-lemon text-yellow-700" },
  { name: "Gaming", label: { en: "Gaming", cs: "Gaming" }, emoji: "🎮", color: "bg-lavender text-violet-700" },
  { name: "Food", label: { en: "Food", cs: "Jídlo a pití" }, emoji: "🍜", color: "bg-peach text-orange-700" },
  { name: "Creative", label: { en: "Creative", cs: "Kreativa" }, emoji: "✏️", color: "bg-blush text-rose-700" },
  { name: "Tech", label: { en: "Tech", cs: "Tech" }, emoji: "💻", color: "bg-sky text-blue-700" },
  { name: "Study", label: { en: "Study", cs: "Studium" }, emoji: "📚", color: "bg-lemon text-yellow-700" },
  { name: "Wellness", label: { en: "Wellness", cs: "Wellness" }, emoji: "🧘", color: "bg-mint text-emerald-700" },
  { name: "Nightlife", label: { en: "Nightlife", cs: "Party" }, emoji: "🌙", color: "bg-lavender text-violet-700" },
  { name: "Other", label: { en: "Other", cs: "Ostatní" }, emoji: "✨", color: "bg-secondary text-secondary-foreground" },
];

export const getCategoryStyle = (name) => {
  return CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
};

export const getCategoryLabel = (name, lang = "en") => {
  const cat = CATEGORIES.find(c => c.name === name);
  if (!cat) return name;
  return cat.label?.[lang] || name;
};