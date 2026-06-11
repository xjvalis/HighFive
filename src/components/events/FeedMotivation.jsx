import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

const STYLES = [
  { bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-600", emoji: "🙂" },
  { bg: "bg-sky-50", border: "border-sky-100", text: "text-sky-600", emoji: "👋" },
  { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600", emoji: "🌱" },
  { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600", emoji: "☀️" },
  { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-600", emoji: "🤝" },
  { bg: "bg-teal-50", border: "border-teal-100", text: "text-teal-600", emoji: "💬" },
];

export default function FeedMotivation({ events, index }) {
  const tr = useT();
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    if (!events?.length) return;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayEvents = events.filter(e => {
      const d = new Date(e.date);
      return d >= todayStart && d < todayEnd;
    });

    const totalParticipants = events.reduce((sum, e) => sum + (e.participants?.length || 0), 0);
    const activePeople = Math.max(5, Math.round(totalParticipants * 0.15));
    const newToday = Math.max(3, Math.round(events.length * 0.08));
    const firstTimers = Math.max(2, Math.round(activePeople * 0.35));

    const messages = tr.motivationMessages(todayEvents.length, activePeople, newToday, firstTimers);
    const idx = (index || 0) % messages.length;
    const styleIdx = (index || 0) % STYLES.length;

    setEntry({ msg: messages[idx], style: STYLES[styleIdx] });
  }, [events, index, tr]);

  if (!entry) return null;
  const { msg, style } = entry;

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg px-4 py-2.5 my-3 flex items-center gap-2.5`}>
      <span className="text-base flex-shrink-0">{style.emoji}</span>
      <p className={`text-xs ${style.text} leading-relaxed`}>{msg}</p>
    </div>
  );
}