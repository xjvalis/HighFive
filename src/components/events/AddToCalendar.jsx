import { useState, useRef, useEffect } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n";

function padDate(d) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function getGoogleUrl(event) {
  const start = padDate(new Date(event.date));
  const end = padDate(new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || "",
    location: event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function generateICS(event) {
  const start = padDate(new Date(event.date));
  const end = padDate(new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000));
  const desc = (event.description || "").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HighFive//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@highfive`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${event.location || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export default function AddToCalendar({ event }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleICS = () => {
    const icsContent = generateICS(event);
    if (isSafari()) {
      // Safari: open as data URL
      const dataUrl = "data:text/calendar;charset=utf8," + encodeURIComponent(icsContent);
      window.open(dataUrl);
    } else {
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.title.replace(/\s+/g, "_")}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary active:bg-secondary/80 transition-colors min-h-[44px]"
      >
        <CalendarPlus className="w-4 h-4" />
        {tr.addToCalendar || "Add to calendar"}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 min-w-[200px]">
          <a
            href={getGoogleUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-secondary transition-colors min-h-[44px]"
          >
            <span className="text-base">📅</span> Google Calendar
          </a>
          <button
            onClick={handleICS}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-sm hover:bg-secondary transition-colors text-left min-h-[44px]"
          >
            <span className="text-base">🍎</span> Apple / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  );
}
