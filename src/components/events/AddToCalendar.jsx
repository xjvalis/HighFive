import { useState, useRef, useEffect } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { format } from "date-fns";

function padDate(d) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateICS(event) {
  const start = padDate(new Date(event.date));
  const end = padDate(new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000));
  const desc = (event.description || "").replace(/\n/g, "\\n");
  const ics = [
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
  return ics;
}

function getGoogleUrl(event) {
  const start = new Date(event.date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || "",
    location: event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default function AddToCalendar({ event }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const downloadICS = () => {
    const blob = new Blob([generateICS(event)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
      >
        <CalendarPlus className="w-4 h-4" />
        Add to calendar
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 min-w-[180px]">
          <a
            href={getGoogleUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
          >
            <span className="text-base">📅</span> Google Calendar
          </a>
          <button
            onClick={downloadICS}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left"
          >
            <span className="text-base">🍎</span> iCal / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  );
}